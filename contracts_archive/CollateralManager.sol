// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IChainlinkFeed — Chainlink price feed interface
 */
interface IChainlinkFeed {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

/**
 * @title CollateralManager — Multi-Asset Collateral System
 * @notice Manages collateral deposits and withdrawals, enforces LTV ratios,
 *         calculates health factors, and integrates Chainlink oracles for
 *         real-time collateral valuation.
 *
 * Supported Collateral:
 *   - ETH:   75% LTV, 80% liquidation threshold
 *   - WBTC:  70% LTV, 75% liquidation threshold
 *   - USDC:  85% LTV, 90% liquidation threshold
 *   - stETH: 70% LTV, 75% liquidation threshold
 *
 * Health Factor = (Collateral Value × Liquidation Threshold) / Total Borrows
 *   - HF >= 1: Safe
 *   - HF < 1:  Liquidation eligible
 *
 * @dev Uses Chainlink price feeds with staleness checks (max 1 hour).
 */
contract CollateralManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant BPS = 10_000;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_STALENESS = 1 hours;

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct CollateralConfig {
        bool isActive;
        uint256 ltvBps;                // Max loan-to-value in BPS (e.g., 7500 = 75%)
        uint256 liquidationThresholdBps; // Liquidation threshold in BPS (e.g., 8000 = 80%)
        uint256 liquidationBonusBps;    // Bonus for liquidators (e.g., 500 = 5%)
        IChainlinkFeed priceFeed;       // Chainlink oracle
        uint8 tokenDecimals;            // Token decimals (e.g., 18 for ETH, 8 for WBTC)
    }

    struct UserCollateral {
        uint256 amount;                 // Amount deposited
    }

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice Collateral configurations by token address
    mapping(address => CollateralConfig) public collateralConfigs;

    /// @notice List of supported collateral tokens
    address[] public supportedCollaterals;

    /// @notice User collateral: user => token => amount
    mapping(address => mapping(address => UserCollateral)) public userCollaterals;

    /// @notice User total borrow value in USD (18 decimals) — set by LendingPool
    mapping(address => uint256) public userBorrowValue;

    /// @notice Lending pool address (authorized to update borrow values)
    address public lendingPool;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event CollateralDeposited(address indexed user, address indexed token, uint256 amount, uint256 timestamp);
    event CollateralWithdrawn(address indexed user, address indexed token, uint256 amount, uint256 timestamp);
    event CollateralConfigured(address indexed token, uint256 ltvBps, uint256 liquidationThresholdBps);
    event BorrowValueUpdated(address indexed user, uint256 newBorrowValue);
    event PriceStale(address indexed token, uint256 lastUpdate, uint256 currentTime);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    constructor(address _owner) Ownable(_owner) {}

    /* ============================================================ */
    /*                    COLLATERAL CONFIG                         */
    /* ============================================================ */

    /**
     * @notice Configure a collateral asset
     * @param token           ERC20 token address
     * @param ltvBps          Max LTV in basis points
     * @param liquidationThresholdBps  Liquidation threshold in BPS
     * @param liquidationBonusBps      Liquidation bonus in BPS
     * @param priceFeed       Chainlink price feed address
     * @param tokenDecimals   Token decimals
     */
    function configureCollateral(
        address token,
        uint256 ltvBps,
        uint256 liquidationThresholdBps,
        uint256 liquidationBonusBps,
        address priceFeed,
        uint8 tokenDecimals
    ) external onlyOwner {
        require(token != address(0), "CM: zero token");
        require(ltvBps < liquidationThresholdBps, "CM: LTV >= liq threshold");
        require(liquidationThresholdBps <= BPS, "CM: threshold > 100%");
        require(priceFeed != address(0), "CM: zero price feed");

        bool isNew = !collateralConfigs[token].isActive;

        collateralConfigs[token] = CollateralConfig({
            isActive: true,
            ltvBps: ltvBps,
            liquidationThresholdBps: liquidationThresholdBps,
            liquidationBonusBps: liquidationBonusBps,
            priceFeed: IChainlinkFeed(priceFeed),
            tokenDecimals: tokenDecimals
        });

        if (isNew) {
            supportedCollaterals.push(token);
        }

        emit CollateralConfigured(token, ltvBps, liquidationThresholdBps);
    }

    /* ============================================================ */
    /*                    DEPOSIT / WITHDRAW                        */
    /* ============================================================ */

    /**
     * @notice Deposit collateral
     * @param token Collateral token address
     * @param amount Amount to deposit
     */
    function depositCollateral(address token, uint256 amount) external nonReentrant {
        require(collateralConfigs[token].isActive, "CM: unsupported collateral");
        require(amount > 0, "CM: zero amount");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        userCollaterals[msg.sender][token].amount += amount;

        emit CollateralDeposited(msg.sender, token, amount, block.timestamp);
    }

    /**
     * @notice Withdraw collateral (only if health factor remains > 1)
     * @param token Collateral token address
     * @param amount Amount to withdraw
     */
    function withdrawCollateral(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "CM: zero amount");
        UserCollateral storage col = userCollaterals[msg.sender][token];
        require(col.amount >= amount, "CM: insufficient collateral");

        // Simulate withdrawal, check health factor
        col.amount -= amount;
        uint256 hf = healthFactor(msg.sender);

        // If user has borrows, health factor must remain > 1
        if (userBorrowValue[msg.sender] > 0) {
            require(hf >= PRECISION, "CM: withdrawal would liquidate");
        }

        IERC20(token).safeTransfer(msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, token, amount, block.timestamp);
    }

    /* ============================================================ */
    /*                    HEALTH FACTOR                             */
    /* ============================================================ */

    /**
     * @notice Calculate health factor for a user
     *         HF = (Total Collateral Value × Weighted Liq Threshold) / Total Borrows
     * @param user Address to check
     * @return Health factor in 1e18 (1e18 = 1.0, < 1e18 = liquidation eligible)
     */
    function healthFactor(address user) public view returns (uint256) {
        uint256 borrowValue = userBorrowValue[user];
        if (borrowValue == 0) return type(uint256).max; // No borrows = infinite health

        uint256 liquidationCollateralValue = _totalLiquidationCollateralValue(user);
        return (liquidationCollateralValue * PRECISION) / borrowValue;
    }

    /**
     * @notice Check if user is liquidation eligible
     */
    function isLiquidatable(address user) external view returns (bool) {
        return healthFactor(user) < PRECISION;
    }

    /**
     * @notice Maximum additional borrow value (USD, 18 decimals) based on current collateral
     */
    function maxBorrowValue(address user) external view returns (uint256) {
        uint256 totalBorrowCapacity = _totalBorrowCapacity(user);
        uint256 currentBorrow = userBorrowValue[user];
        return totalBorrowCapacity > currentBorrow ? totalBorrowCapacity - currentBorrow : 0;
    }

    /* ============================================================ */
    /*                    PRICE FUNCTIONS                           */
    /* ============================================================ */

    /**
     * @notice Get the USD price of a collateral token (18 decimals)
     * @param token Collateral token address
     * @return price USD price in 1e18
     */
    function getPrice(address token) public view returns (uint256 price) {
        CollateralConfig storage config = collateralConfigs[token];
        require(config.isActive, "CM: unsupported token");

        (, int256 answer, , uint256 updatedAt, ) = config.priceFeed.latestRoundData();
        require(answer > 0, "CM: invalid price");
        require(block.timestamp - updatedAt <= MAX_STALENESS, "CM: stale price");

        uint8 feedDecimals = config.priceFeed.decimals();
        // Normalize to 18 decimals
        price = (uint256(answer) * 1e18) / (10 ** feedDecimals);
    }

    /**
     * @notice Get total collateral value for a user in USD (18 decimals)
     */
    function totalCollateralValue(address user) external view returns (uint256 total) {
        for (uint256 i = 0; i < supportedCollaterals.length; i++) {
            address token = supportedCollaterals[i];
            uint256 amount = userCollaterals[user][token].amount;
            if (amount > 0) {
                uint256 price = getPrice(token);
                uint8 tokenDec = collateralConfigs[token].tokenDecimals;
                total += (amount * price) / (10 ** tokenDec);
            }
        }
    }

    /* ============================================================ */
    /*                    LENDING POOL INTERFACE                    */
    /* ============================================================ */

    /**
     * @notice Update a user's borrow value (called by LendingPool)
     */
    function updateBorrowValue(address user, uint256 newValue) external {
        require(msg.sender == lendingPool, "CM: only lending pool");
        userBorrowValue[user] = newValue;
        emit BorrowValueUpdated(user, newValue);
    }

    /**
     * @notice Check if a user can borrow additional value
     */
    function canBorrow(address user, uint256 additionalBorrowValue) external view returns (bool) {
        uint256 capacity = _totalBorrowCapacity(user);
        return userBorrowValue[user] + additionalBorrowValue <= capacity;
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function setLendingPool(address _lendingPool) external onlyOwner {
        require(_lendingPool != address(0), "CM: zero pool");
        lendingPool = _lendingPool;
    }

    function getSupportedCollaterals() external view returns (address[] memory) {
        return supportedCollaterals;
    }

    /**
     * @notice Full user collateral breakdown
     */
    function getUserCollateralInfo(address user) external view returns (
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory values,
        uint256 totalValue,
        uint256 hf,
        bool liquidatable
    ) {
        uint256 len = supportedCollaterals.length;
        tokens = new address[](len);
        amounts = new uint256[](len);
        values = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            address token = supportedCollaterals[i];
            uint256 amount = userCollaterals[user][token].amount;
            tokens[i] = token;
            amounts[i] = amount;
            if (amount > 0) {
                uint256 price = getPrice(token);
                uint8 tokenDec = collateralConfigs[token].tokenDecimals;
                values[i] = (amount * price) / (10 ** tokenDec);
                totalValue += values[i];
            }
        }

        hf = healthFactor(user);
        liquidatable = hf < PRECISION;
    }

    /* ============================================================ */
    /*                    INTERNAL                                  */
    /* ============================================================ */

    /**
     * @dev Total collateral value weighted by liquidation thresholds (for health factor)
     */
    function _totalLiquidationCollateralValue(address user) internal view returns (uint256 total) {
        for (uint256 i = 0; i < supportedCollaterals.length; i++) {
            address token = supportedCollaterals[i];
            uint256 amount = userCollaterals[user][token].amount;
            if (amount > 0) {
                uint256 price = getPrice(token);
                uint8 tokenDec = collateralConfigs[token].tokenDecimals;
                uint256 value = (amount * price) / (10 ** tokenDec);
                uint256 liqThreshold = collateralConfigs[token].liquidationThresholdBps;
                total += (value * liqThreshold) / BPS;
            }
        }
    }

    /**
     * @dev Total borrow capacity based on LTV ratios
     */
    function _totalBorrowCapacity(address user) internal view returns (uint256 total) {
        for (uint256 i = 0; i < supportedCollaterals.length; i++) {
            address token = supportedCollaterals[i];
            uint256 amount = userCollaterals[user][token].amount;
            if (amount > 0) {
                uint256 price = getPrice(token);
                uint8 tokenDec = collateralConfigs[token].tokenDecimals;
                uint256 value = (amount * price) / (10 ** tokenDec);
                uint256 ltv = collateralConfigs[token].ltvBps;
                total += (value * ltv) / BPS;
            }
        }
    }
}
