// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ICollateralManagerLiq — Interface for CollateralManager operations
 */
interface ICollateralManagerLiq {
    function healthFactor(address user) external view returns (uint256);
    function userCollaterals(address user, address token) external view returns (uint256 amount);
    function userBorrowValue(address user) external view returns (uint256);
    function getPrice(address token) external view returns (uint256);
    function collateralConfigs(address token) external view returns (
        bool isActive, uint256 ltvBps, uint256 liquidationThresholdBps,
        uint256 liquidationBonusBps, address priceFeed, uint8 tokenDecimals
    );
    function getSupportedCollaterals() external view returns (address[] memory);
}

/**
 * @title IFlashLoanReceiver — Callback interface for flash loan liquidations
 */
interface IFlashLoanReceiver {
    function onFlashLoan(
        address initiator,
        address debtToken,
        uint256 debtAmount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

/**
 * @title LiquidationEngine — Undercollateralized Position Liquidator
 * @notice Enables liquidation of positions with health factor < 1.
 *
 * Liquidation Rules:
 *   - Trigger: Health Factor < 1.0
 *   - Max partial: 50% of user's debt per liquidation
 *   - Liquidator bonus: 5% of seized collateral
 *   - Protocol fee: 2.5% of seized collateral → treasury
 *   - Flash loan support: anyone can liquidate with 0 upfront capital
 *   - Bad debt: absorbed by insurance fund if collateral < debt
 *
 * @dev Works in tandem with CollateralManager for health factor checks
 *      and LendingPool for debt repayment.
 */
contract LiquidationEngine is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant PRECISION = 1e18;
    uint256 public constant BPS = 10_000;

    /// @notice Max percentage of debt that can be liquidated at once (50%)
    uint256 public constant MAX_LIQUIDATION_RATIO = 5000;

    /// @notice Liquidator bonus: 5%
    uint256 public constant LIQUIDATION_BONUS_BPS = 500;

    /// @notice Protocol fee: 2.5%
    uint256 public constant PROTOCOL_FEE_BPS = 250;

    /// @notice Flash loan callback success hash
    bytes32 public constant CALLBACK_SUCCESS = keccak256("IFlashLoanReceiver.onFlashLoan");

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice The debt asset (USDC)
    IERC20 public immutable debtAsset;

    /// @notice CollateralManager contract
    ICollateralManagerLiq public collateralManager;

    /// @notice Protocol treasury
    address public treasury;

    /// @notice Insurance fund for bad debt absorption
    address public insuranceFund;

    /// @notice Total liquidations processed
    uint256 public totalLiquidations;

    /// @notice Total debt liquidated (USDC, 18 decimals)
    uint256 public totalDebtLiquidated;

    /// @notice Total collateral seized (USD value, 18 decimals)
    uint256 public totalCollateralSeized;

    /// @notice Total protocol fees earned
    uint256 public totalProtocolFees;

    /// @notice Total bad debt absorbed
    uint256 public totalBadDebtAbsorbed;

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct LiquidationParams {
        address user;            // User being liquidated
        address collateralToken; // Collateral to seize
        uint256 debtToCover;     // Amount of debt to repay
    }

    struct LiquidationResult {
        uint256 debtCovered;
        uint256 collateralSeized;
        uint256 liquidatorBonus;
        uint256 protocolFee;
        bool badDebt;
    }

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event Liquidated(
        address indexed liquidator,
        address indexed user,
        address indexed collateralToken,
        uint256 debtCovered,
        uint256 collateralSeized,
        uint256 liquidatorBonus,
        uint256 protocolFee,
        uint256 timestamp
    );

    event BadDebtAbsorbed(
        address indexed user,
        uint256 badDebtAmount,
        uint256 timestamp
    );

    event FlashLiquidation(
        address indexed liquidator,
        address indexed user,
        uint256 debtAmount,
        uint256 timestamp
    );

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    constructor(
        address _debtAsset,
        address _collateralManager,
        address _treasury,
        address _insuranceFund,
        address _owner
    ) Ownable(_owner) {
        require(_debtAsset != address(0), "Liq: zero debt asset");
        require(_collateralManager != address(0), "Liq: zero CM");
        require(_treasury != address(0), "Liq: zero treasury");
        require(_insuranceFund != address(0), "Liq: zero insurance");

        debtAsset = IERC20(_debtAsset);
        collateralManager = ICollateralManagerLiq(_collateralManager);
        treasury = _treasury;
        insuranceFund = _insuranceFund;
    }

    /* ============================================================ */
    /*                    LIQUIDATION                               */
    /* ============================================================ */

    /**
     * @notice Liquidate an undercollateralized position
     * @param params Liquidation parameters (user, collateral, debt amount)
     * @return result Liquidation outcome details
     */
    function liquidate(LiquidationParams calldata params)
        external
        nonReentrant
        returns (LiquidationResult memory result)
    {
        result = _executeLiquidation(params, msg.sender);
    }

    /**
     * @notice Flash loan liquidation — liquidate with 0 upfront capital
     *         The engine transfers collateral to liquidator, who repays debt
     *         via the callback.
     * @param params Liquidation parameters
     * @param data   Extra data passed to callback
     */
    function flashLiquidate(LiquidationParams calldata params, bytes calldata data)
        external
        nonReentrant
        returns (LiquidationResult memory result)
    {
        // Verify liquidation is valid
        uint256 hf = collateralManager.healthFactor(params.user);
        require(hf < PRECISION, "Liq: not liquidatable");

        uint256 debtToCover = _capDebtAmount(params.user, params.debtToCover);

        // Calculate collateral to seize
        (uint256 collateralAmount, uint256 bonus, uint256 fee) =
            _calculateSeizure(params.collateralToken, debtToCover);

        // Transfer collateral to liquidator FIRST (flash loan style)
        // In production, this would pull from CollateralManager
        // For now, we handle the accounting and emit the event

        // Liquidator must repay debt via callback
        bytes32 callbackResult = IFlashLoanReceiver(msg.sender).onFlashLoan(
            msg.sender,
            address(debtAsset),
            debtToCover,
            0, // No extra fee for flash liquidation
            data
        );
        require(callbackResult == CALLBACK_SUCCESS, "Liq: callback failed");

        // Verify debt was repaid
        // In production, verify debtAsset balance increased

        result = LiquidationResult({
            debtCovered: debtToCover,
            collateralSeized: collateralAmount,
            liquidatorBonus: bonus,
            protocolFee: fee,
            badDebt: false
        });

        _updateStats(result);

        emit FlashLiquidation(msg.sender, params.user, debtToCover, block.timestamp);
        emit Liquidated(
            msg.sender, params.user, params.collateralToken,
            debtToCover, collateralAmount, bonus, fee, block.timestamp
        );
    }

    /* ============================================================ */
    /*                    BAD DEBT HANDLING                         */
    /* ============================================================ */

    /**
     * @notice Absorb bad debt when collateral < remaining debt
     * @param user The user with bad debt
     * @param badDebtAmount Amount not covered by collateral
     */
    function absorbBadDebt(address user, uint256 badDebtAmount) external onlyOwner {
        require(badDebtAmount > 0, "Liq: zero bad debt");

        // Pull from insurance fund
        debtAsset.safeTransferFrom(insuranceFund, address(this), badDebtAmount);
        totalBadDebtAbsorbed += badDebtAmount;

        emit BadDebtAbsorbed(user, badDebtAmount, block.timestamp);
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    /**
     * @notice Check if a position is liquidatable
     */
    function isLiquidatable(address user) external view returns (bool) {
        return collateralManager.healthFactor(user) < PRECISION;
    }

    /**
     * @notice Check if a position is near liquidation (HF < 1.05)
     */
    function isNearLiquidation(address user) external view returns (bool) {
        uint256 hf = collateralManager.healthFactor(user);
        return hf < (PRECISION * 105) / 100; // 1.05
    }

    /**
     * @notice Calculate maximum debt that can be liquidated for a user
     */
    function maxLiquidatableDebt(address user) external view returns (uint256) {
        uint256 borrowValue = collateralManager.userBorrowValue(user);
        return (borrowValue * MAX_LIQUIDATION_RATIO) / BPS;
    }

    /**
     * @notice Preview liquidation result without executing
     */
    function previewLiquidation(LiquidationParams calldata params)
        external
        view
        returns (LiquidationResult memory result)
    {
        uint256 hf = collateralManager.healthFactor(params.user);
        if (hf >= PRECISION) {
            return result; // Not liquidatable, all zeros
        }

        uint256 debtToCover = _capDebtAmount(params.user, params.debtToCover);
        (uint256 collateralAmount, uint256 bonus, uint256 fee) =
            _calculateSeizure(params.collateralToken, debtToCover);

        // Check for bad debt
        uint256 userCollateral = collateralManager.userCollaterals(params.user, params.collateralToken);
        bool isBadDebt = collateralAmount > userCollateral;

        result = LiquidationResult({
            debtCovered: debtToCover,
            collateralSeized: isBadDebt ? userCollateral : collateralAmount,
            liquidatorBonus: bonus,
            protocolFee: fee,
            badDebt: isBadDebt
        });
    }

    /**
     * @notice Engine stats
     */
    function engineStats() external view returns (
        uint256 _totalLiquidations,
        uint256 _totalDebtLiquidated,
        uint256 _totalCollateralSeized,
        uint256 _totalProtocolFees,
        uint256 _totalBadDebt
    ) {
        return (
            totalLiquidations,
            totalDebtLiquidated,
            totalCollateralSeized,
            totalProtocolFees,
            totalBadDebtAbsorbed
        );
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Liq: zero treasury");
        treasury = _treasury;
    }

    function setInsuranceFund(address _fund) external onlyOwner {
        require(_fund != address(0), "Liq: zero fund");
        insuranceFund = _fund;
    }

    /* ============================================================ */
    /*                    INTERNAL                                  */
    /* ============================================================ */

    function _executeLiquidation(LiquidationParams calldata params, address liquidator)
        internal
        returns (LiquidationResult memory result)
    {
        // Verify user is liquidatable
        uint256 hf = collateralManager.healthFactor(params.user);
        require(hf < PRECISION, "Liq: not liquidatable");

        // Cap debt amount to 50% of total
        uint256 debtToCover = _capDebtAmount(params.user, params.debtToCover);
        require(debtToCover > 0, "Liq: zero debt");

        // Calculate collateral to seize (including bonus)
        (uint256 collateralAmount, uint256 bonus, uint256 fee) =
            _calculateSeizure(params.collateralToken, debtToCover);

        // Check available collateral
        uint256 userCollateral = collateralManager.userCollaterals(params.user, params.collateralToken);
        bool isBadDebt = collateralAmount > userCollateral;

        if (isBadDebt) {
            collateralAmount = userCollateral;
        }

        // Liquidator pays the debt
        debtAsset.safeTransferFrom(liquidator, address(this), debtToCover);

        // Protocol fee to treasury
        uint256 feeInDebt = (debtToCover * PROTOCOL_FEE_BPS) / BPS;
        if (feeInDebt > 0) {
            debtAsset.safeTransfer(treasury, feeInDebt);
        }

        // The remaining debt goes to repay the user's loan
        // In production, this calls LendingPool.repayOnBehalf()

        result = LiquidationResult({
            debtCovered: debtToCover,
            collateralSeized: collateralAmount,
            liquidatorBonus: bonus,
            protocolFee: fee,
            badDebt: isBadDebt
        });

        _updateStats(result);

        emit Liquidated(
            liquidator, params.user, params.collateralToken,
            debtToCover, collateralAmount, bonus, fee, block.timestamp
        );
    }

    function _capDebtAmount(address user, uint256 requestedDebt) internal view returns (uint256) {
        uint256 totalBorrow = collateralManager.userBorrowValue(user);
        uint256 maxDebt = (totalBorrow * MAX_LIQUIDATION_RATIO) / BPS;
        return requestedDebt > maxDebt ? maxDebt : requestedDebt;
    }

    function _calculateSeizure(address collateralToken, uint256 debtToCover)
        internal
        view
        returns (uint256 collateralAmount, uint256 bonus, uint256 fee)
    {
        uint256 price = collateralManager.getPrice(collateralToken);
        (, , , , , uint8 tokenDecimals) = collateralManager.collateralConfigs(collateralToken);

        // Base collateral = debt / price (adjusted for decimals)
        uint256 baseCollateral = (debtToCover * (10 ** tokenDecimals)) / price;

        // Liquidator bonus (5% of base)
        bonus = (baseCollateral * LIQUIDATION_BONUS_BPS) / BPS;

        // Protocol fee (2.5% of base, in USD)
        fee = (debtToCover * PROTOCOL_FEE_BPS) / BPS;

        // Total collateral seized = base + bonus
        collateralAmount = baseCollateral + bonus;
    }

    function _updateStats(LiquidationResult memory result) internal {
        totalLiquidations++;
        totalDebtLiquidated += result.debtCovered;
        totalCollateralSeized += result.collateralSeized;
        totalProtocolFees += result.protocolFee;
    }
}
