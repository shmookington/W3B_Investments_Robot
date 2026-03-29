// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IChainlinkPriceFeed
 */
interface IChainlinkPriceFeed {
    function latestRoundData() external view returns (
        uint80, int256, uint256, uint256, uint80
    );
    function decimals() external view returns (uint8);
}

/**
 * @title SyntheticToken — ERC-20 tracking a real-world asset
 * @notice Minted by SyntheticFactory when users lock collateral.
 */
contract SyntheticToken is ERC20, Ownable {
    address public oracle;
    string public underlyingAsset;

    constructor(
        string memory _name,
        string memory _symbol,
        address _oracle,
        address _factory
    ) ERC20(_name, _symbol) Ownable(_factory) {
        oracle = _oracle;
        underlyingAsset = _symbol;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

/**
 * @title SyntheticFactory — Creates & Manages Synthetic Asset Tokens
 * @notice Factory for deploying synthetic ERC-20 tokens that track real-world
 *         assets (stocks, commodities, indices). Users lock USDC collateral
 *         to mint synthetics, and burn synthetics to unlock collateral.
 *
 * Collateralization:
 *   - Minimum 200% collateral ratio
 *   - If asset price rises, user needs more collateral
 *   - If asset price falls, user has excess collateral
 *
 * Example:
 *   - AAPL at $200, user wants 10 sAAPL
 *   - Required collateral: 10 × $200 × 200% = $4,000 USDC
 *   - User locks $4,000 USDC → mints 10 sAAPL
 *   - Later: burns 10 sAAPL → unlocks $4,000 USDC
 */
contract SyntheticFactory is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant PRECISION = 1e18;
    uint256 public constant BPS = 10_000;

    /// @notice Minimum collateralization ratio: 200%
    uint256 public constant MIN_COLLATERAL_RATIO = 20_000; // 200% in BPS

    /// @notice Maximum staleness for oracle prices (5 minutes)
    uint256 public constant MAX_STALENESS = 5 minutes;

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct SyntheticInfo {
        SyntheticToken token;
        IChainlinkPriceFeed oracle;
        bool active;
        uint256 totalMinted;
        uint256 totalCollateralLocked;
    }

    struct UserPosition {
        uint256 synthMinted;       // Amount of synthetic minted
        uint256 collateralLocked;  // USDC collateral locked
    }

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice Collateral asset (USDC)
    IERC20 public immutable collateral;

    /// @notice Collateral decimals
    uint8 public immutable collateralDecimals;

    /// @notice All deployed synthetic tokens
    mapping(address => SyntheticInfo) public synthetics;

    /// @notice Synthetic token address by symbol
    mapping(string => address) public syntheticBySymbol;

    /// @notice User positions: synth address => user => position
    mapping(address => mapping(address => UserPosition)) public userPositions;

    /// @notice List of all synthetic token addresses
    address[] public allSynthetics;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event SyntheticCreated(address indexed token, string name, string symbol, address oracle);
    event SyntheticMinted(address indexed synth, address indexed user, uint256 amount, uint256 collateralLocked);
    event SyntheticBurned(address indexed synth, address indexed user, uint256 amount, uint256 collateralReturned);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    constructor(address _collateral, uint8 _collateralDecimals, address _owner) Ownable(_owner) {
        require(_collateral != address(0), "Factory: zero collateral");
        collateral = IERC20(_collateral);
        collateralDecimals = _collateralDecimals;
    }

    /* ============================================================ */
    /*                    FACTORY FUNCTIONS                         */
    /* ============================================================ */

    /**
     * @notice Create a new synthetic asset token
     * @param name    Token name (e.g., "Synthetic Apple")
     * @param symbol  Token symbol (e.g., "sAAPL")
     * @param oracle  Chainlink oracle address for the underlying asset
     * @return tokenAddress Address of the new synthetic token
     */
    function createSynthetic(
        string calldata name,
        string calldata symbol,
        address oracle
    ) external onlyOwner returns (address tokenAddress) {
        require(oracle != address(0), "Factory: zero oracle");
        require(syntheticBySymbol[symbol] == address(0), "Factory: symbol exists");

        // Deploy new token
        SyntheticToken token = new SyntheticToken(name, symbol, oracle, address(this));
        tokenAddress = address(token);

        synthetics[tokenAddress] = SyntheticInfo({
            token: token,
            oracle: IChainlinkPriceFeed(oracle),
            active: true,
            totalMinted: 0,
            totalCollateralLocked: 0
        });

        syntheticBySymbol[symbol] = tokenAddress;
        allSynthetics.push(tokenAddress);

        emit SyntheticCreated(tokenAddress, name, symbol, oracle);
    }

    /* ============================================================ */
    /*                    MINT / BURN                               */
    /* ============================================================ */

    /**
     * @notice Mint synthetic tokens by locking collateral
     *         Requires 200% collateralization
     * @param synth  Synthetic token address
     * @param amount Amount of synthetic to mint (18 decimals)
     */
    function mint(address synth, uint256 amount) external nonReentrant {
        require(amount > 0, "Factory: zero amount");
        SyntheticInfo storage info = synthetics[synth];
        require(info.active, "Factory: inactive synth");

        // Get asset price
        uint256 assetPrice = _getPrice(info.oracle);

        // Calculate required collateral (200% of notional value)
        // Notional = amount * price / PRECISION
        // Required = notional * 200% = notional * MIN_COLLATERAL_RATIO / BPS
        uint256 notionalValue = (amount * assetPrice) / PRECISION;
        uint256 reqCollateral = (notionalValue * MIN_COLLATERAL_RATIO) / BPS;

        // Adjust for collateral decimals
        uint256 collateralAmount = reqCollateral / (10 ** (18 - collateralDecimals));
        if (collateralDecimals == 18) {
            collateralAmount = reqCollateral;
        }

        // Lock collateral
        collateral.safeTransferFrom(msg.sender, address(this), collateralAmount);

        // Mint synthetic
        info.token.mint(msg.sender, amount);
        info.totalMinted += amount;
        info.totalCollateralLocked += collateralAmount;

        userPositions[synth][msg.sender].synthMinted += amount;
        userPositions[synth][msg.sender].collateralLocked += collateralAmount;

        emit SyntheticMinted(synth, msg.sender, amount, collateralAmount);
    }

    /**
     * @notice Burn synthetic tokens and unlock collateral
     * @param synth  Synthetic token address
     * @param amount Amount of synthetic to burn
     */
    function burn(address synth, uint256 amount) external nonReentrant {
        require(amount > 0, "Factory: zero amount");
        SyntheticInfo storage info = synthetics[synth];
        require(address(info.token) != address(0), "Factory: unknown synth");

        UserPosition storage pos = userPositions[synth][msg.sender];
        require(pos.synthMinted >= amount, "Factory: insufficient minted");

        // Calculate proportional collateral to return
        uint256 collateralToReturn = (pos.collateralLocked * amount) / pos.synthMinted;

        // Burn synthetic
        info.token.burn(msg.sender, amount);
        info.totalMinted -= amount;
        info.totalCollateralLocked -= collateralToReturn;

        pos.synthMinted -= amount;
        pos.collateralLocked -= collateralToReturn;

        // Return collateral
        collateral.safeTransfer(msg.sender, collateralToReturn);

        emit SyntheticBurned(synth, msg.sender, amount, collateralToReturn);
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    /**
     * @notice Get the current price of a synthetic's underlying asset
     * @return price in 18 decimals
     */
    function getAssetPrice(address synth) external view returns (uint256) {
        return _getPrice(synthetics[synth].oracle);
    }

    /**
     * @notice Required collateral for minting a given amount
     */
    function requiredCollateral(address synth, uint256 amount) external view returns (uint256) {
        uint256 assetPrice = _getPrice(synthetics[synth].oracle);
        uint256 notionalValue = (amount * assetPrice) / PRECISION;
        uint256 required = (notionalValue * MIN_COLLATERAL_RATIO) / BPS;
        if (collateralDecimals < 18) {
            required = required / (10 ** (18 - collateralDecimals));
        }
        return required;
    }

    /**
     * @notice Current collateralization ratio for a user's position (BPS)
     */
    function collateralizationRatio(address synth, address user) external view returns (uint256) {
        UserPosition storage pos = userPositions[synth][user];
        if (pos.synthMinted == 0) return type(uint256).max;

        uint256 assetPrice = _getPrice(synthetics[synth].oracle);
        uint256 notionalValue = (pos.synthMinted * assetPrice) / PRECISION;

        // Adjust collateral to 18 decimals for comparison
        uint256 collateralValue;
        if (collateralDecimals < 18) {
            collateralValue = pos.collateralLocked * (10 ** (18 - collateralDecimals));
        } else {
            collateralValue = pos.collateralLocked;
        }

        return (collateralValue * BPS) / notionalValue;
    }

    /**
     * @notice Total number of synthetics created
     */
    function totalSynthetics() external view returns (uint256) {
        return allSynthetics.length;
    }

    /**
     * @notice Get all synthetic addresses
     */
    function getAllSynthetics() external view returns (address[] memory) {
        return allSynthetics;
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function deactivateSynthetic(address synth) external onlyOwner {
        synthetics[synth].active = false;
    }

    function activateSynthetic(address synth) external onlyOwner {
        synthetics[synth].active = true;
    }

    /* ============================================================ */
    /*                    INTERNAL                                  */
    /* ============================================================ */

    function _getPrice(IChainlinkPriceFeed feed) internal view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = feed.latestRoundData();
        require(answer > 0, "Factory: invalid price");
        require(block.timestamp - updatedAt <= MAX_STALENESS, "Factory: stale price");

        uint8 feedDecimals = feed.decimals();
        return (uint256(answer) * PRECISION) / (10 ** feedDecimals);
    }
}
