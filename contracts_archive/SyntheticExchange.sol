// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IOracleAggregatorExchange
 */
interface IOracleAggregatorExchange {
    function getPrice(string calldata asset) external view returns (uint256);
}

/**
 * @title ISyntheticTokenExchange
 */
interface ISyntheticTokenExchange is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

/**
 * @title SyntheticExchange — On-Chain Synthetic Asset Trading
 * @notice Enables swapping between synthetic assets (sAAPL ↔ sTSLA etc.)
 *         using oracle prices. No AMM/liquidity pool required — the protocol
 *         acts as counterparty using oracle-determined prices.
 *
 * Fee Structure (0.3% per trade):
 *   - 70% → Liquidity Providers
 *   - 20% → Protocol Treasury
 *   - 10% → Patriot Yield
 *
 * Slippage Protection:
 *   - Users specify maximum acceptable slippage
 *   - Reverts if price impact exceeds user's tolerance
 */
contract SyntheticExchange is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant PRECISION = 1e18;
    uint256 public constant BPS = 10_000;

    /// @notice Swap fee: 0.3% (30 BPS)
    uint256 public constant SWAP_FEE_BPS = 30;

    /// @notice Fee distribution
    uint256 public constant LP_FEE_BPS = 7000;        // 70%
    uint256 public constant TREASURY_FEE_BPS = 2000;   // 20%
    uint256 public constant PATRIOT_FEE_BPS = 1000;    // 10%

    /// @notice Default max slippage: 1%
    uint256 public constant DEFAULT_MAX_SLIPPAGE_BPS = 100;

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct SynthAsset {
        ISyntheticTokenExchange token;
        string symbol;         // Oracle symbol (e.g., "AAPL")
        bool active;
        uint256 totalVolume;   // Total trade volume (USD, 18 dec)
    }

    struct SwapResult {
        uint256 amountIn;
        uint256 amountOut;
        uint256 feeTotal;
        uint256 feeLp;
        uint256 feeTreasury;
        uint256 feePatriot;
        uint256 priceIn;
        uint256 priceOut;
        uint256 effectiveRate;
    }

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice Oracle aggregator
    IOracleAggregatorExchange public oracle;

    /// @notice Protocol treasury
    address public treasury;

    /// @notice Patriot Yield address
    address public patriotYield;

    /// @notice LP fee pool address
    address public lpFeePool;

    /// @notice Registered synthetic assets: token address => config
    mapping(address => SynthAsset) public synthAssets;

    /// @notice All registered synth addresses
    address[] public registeredSynths;

    /// @notice Accumulated fees (in USDC value, 18 dec)
    uint256 public totalFeesCollected;
    uint256 public totalLpFees;
    uint256 public totalTreasuryFees;
    uint256 public totalPatriotFees;

    /// @notice Total number of swaps
    uint256 public totalSwaps;

    /// @notice Total volume (USD, 18 decimals)
    uint256 public totalVolume;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event Swapped(
        address indexed user,
        address indexed synthIn,
        address indexed synthOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        uint256 timestamp
    );

    event SynthRegistered(address indexed token, string symbol);
    event FeesDistributed(uint256 lpFee, uint256 treasuryFee, uint256 patriotFee);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    constructor(
        address _oracle,
        address _treasury,
        address _patriotYield,
        address _lpFeePool,
        address _owner
    ) Ownable(_owner) {
        require(_oracle != address(0), "Exchange: zero oracle");
        require(_treasury != address(0), "Exchange: zero treasury");
        require(_patriotYield != address(0), "Exchange: zero patriot");
        require(_lpFeePool != address(0), "Exchange: zero LP pool");

        oracle = IOracleAggregatorExchange(_oracle);
        treasury = _treasury;
        patriotYield = _patriotYield;
        lpFeePool = _lpFeePool;
    }

    /* ============================================================ */
    /*                    REGISTRATION                              */
    /* ============================================================ */

    /**
     * @notice Register a synthetic asset for trading
     */
    function registerSynth(address token, string calldata symbol) external onlyOwner {
        require(address(synthAssets[token].token) == address(0), "Exchange: already registered");

        synthAssets[token] = SynthAsset({
            token: ISyntheticTokenExchange(token),
            symbol: symbol,
            active: true,
            totalVolume: 0
        });

        registeredSynths.push(token);
        emit SynthRegistered(token, symbol);
    }

    /* ============================================================ */
    /*                    SWAP                                      */
    /* ============================================================ */

    /**
     * @notice Swap synthetic A for synthetic B
     * @param synthIn     Token to sell
     * @param synthOut    Token to buy
     * @param amountIn    Amount of synthIn to sell
     * @param maxSlippageBps Max acceptable slippage (BPS)
     * @return result     Swap details
     */
    function swap(
        address synthIn,
        address synthOut,
        uint256 amountIn,
        uint256 maxSlippageBps
    ) external nonReentrant whenNotPaused returns (SwapResult memory result) {
        require(amountIn > 0, "Exchange: zero amount");
        require(synthIn != synthOut, "Exchange: same token");

        SynthAsset storage assetIn = synthAssets[synthIn];
        SynthAsset storage assetOut = synthAssets[synthOut];
        require(assetIn.active, "Exchange: synthIn inactive");
        require(assetOut.active, "Exchange: synthOut inactive");

        result = _executeSwap(assetIn, assetOut, synthIn, synthOut, amountIn, maxSlippageBps);
    }

    function _executeSwap(
        SynthAsset storage assetIn,
        SynthAsset storage assetOut,
        address synthIn,
        address synthOut,
        uint256 amountIn,
        uint256 maxSlippageBps
    ) internal returns (SwapResult memory result) {
        // Get prices from oracle
        uint256 priceIn = oracle.getPrice(assetIn.symbol);
        uint256 priceOut = oracle.getPrice(assetOut.symbol);
        require(priceIn > 0 && priceOut > 0, "Exchange: invalid prices");

        // Calculate value and fee
        uint256 valueIn = (amountIn * priceIn) / PRECISION;
        uint256 feeValue = (valueIn * SWAP_FEE_BPS) / BPS;
        uint256 amountOut = ((valueIn - feeValue) * PRECISION) / priceOut;

        // Slippage protection
        {
            uint256 idealOut = (valueIn * PRECISION) / priceOut;
            uint256 slippage = maxSlippageBps == 0 ? DEFAULT_MAX_SLIPPAGE_BPS : maxSlippageBps;
            require(amountOut >= (idealOut * (BPS - slippage)) / BPS, "Exchange: slippage exceeded");
        }

        // Execute swap: burn input, mint output
        assetIn.token.burn(msg.sender, amountIn);
        assetOut.token.mint(msg.sender, amountOut);

        // Calculate fee split
        uint256 feeLp = (feeValue * LP_FEE_BPS) / BPS;
        uint256 feeTreasury = (feeValue * TREASURY_FEE_BPS) / BPS;
        uint256 feePatriot = feeValue - feeLp - feeTreasury;

        // Update stats
        totalFeesCollected += feeValue;
        totalLpFees += feeLp;
        totalTreasuryFees += feeTreasury;
        totalPatriotFees += feePatriot;
        totalSwaps++;
        totalVolume += valueIn;
        assetIn.totalVolume += valueIn;

        // Build result
        result.amountIn = amountIn;
        result.amountOut = amountOut;
        result.feeTotal = feeValue;
        result.feeLp = feeLp;
        result.feeTreasury = feeTreasury;
        result.feePatriot = feePatriot;
        result.priceIn = priceIn;
        result.priceOut = priceOut;
        result.effectiveRate = (amountOut * PRECISION) / amountIn;

        emit Swapped(msg.sender, synthIn, synthOut, amountIn, amountOut, feeValue, block.timestamp);
        emit FeesDistributed(feeLp, feeTreasury, feePatriot);
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    /**
     * @notice Preview swap output without executing
     */
    function previewSwap(
        address synthIn,
        address synthOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint256 fee) {
        SynthAsset storage assetIn = synthAssets[synthIn];
        SynthAsset storage assetOut = synthAssets[synthOut];

        uint256 priceIn = oracle.getPrice(assetIn.symbol);
        uint256 priceOut = oracle.getPrice(assetOut.symbol);

        uint256 valueIn = (amountIn * priceIn) / PRECISION;
        fee = (valueIn * SWAP_FEE_BPS) / BPS;
        uint256 valueAfterFee = valueIn - fee;
        amountOut = (valueAfterFee * PRECISION) / priceOut;
    }

    /**
     * @notice Get exchange rate between two synthetics
     */
    function getRate(address synthIn, address synthOut) external view returns (uint256 rate) {
        uint256 priceIn = oracle.getPrice(synthAssets[synthIn].symbol);
        uint256 priceOut = oracle.getPrice(synthAssets[synthOut].symbol);
        rate = (priceIn * PRECISION) / priceOut;
    }

    /**
     * @notice Total registered synthetics
     */
    function totalRegistered() external view returns (uint256) {
        return registeredSynths.length;
    }

    /**
     * @notice Exchange stats
     */
    function exchangeStats() external view returns (
        uint256 _totalSwaps,
        uint256 _totalVolume,
        uint256 _totalFees,
        uint256 _totalLpFees,
        uint256 _totalTreasuryFees,
        uint256 _totalPatriotFees
    ) {
        return (totalSwaps, totalVolume, totalFeesCollected,
                totalLpFees, totalTreasuryFees, totalPatriotFees);
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function deactivateSynth(address token) external onlyOwner {
        synthAssets[token].active = false;
    }

    function activateSynth(address token) external onlyOwner {
        synthAssets[token].active = true;
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Exchange: zero oracle");
        oracle = IOracleAggregatorExchange(_oracle);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
