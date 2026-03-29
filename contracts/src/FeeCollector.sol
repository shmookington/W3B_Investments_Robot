// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FeeCollector — Prediction Fund Performance & Management Fees
 * @notice Collects two fee types for the prediction fund:
 *
 *   1. Performance Fee: 20% of profits above the high-water mark
 *   2. Management Fee: 0-2% annual on AUM (charged monthly, optional)
 *
 * Key Features:
 *   - High-water mark stored on-chain, updates only on new peaks
 *   - Fees only charge on NEW profits (not recovered losses)
 *   - Daily accrual, monthly/quarterly collection
 *   - Full fee transparency: anyone can read current fee accrual on-chain
 *   - Collected fees route to treasury
 */
contract FeeCollector is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant BPS = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /* ============================================================ */
    /*                          ENUMS                               */
    /* ============================================================ */

    enum FeeType {
        PERFORMANCE,   // 20% of profits above HWM
        MANAGEMENT     // 0-2% annual on AUM
    }

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice Fee asset (USDC)
    IERC20 public immutable feeAsset;

    /// @notice Treasury destination (where collected fees go)
    address public treasury;

    /* ─── Performance Fee ─── */

    /// @notice Performance fee rate in BPS (default: 2000 = 20%)
    uint256 public performanceFeeBps;

    /// @notice High-water mark for performance fee (USDC, 6 decimals)
    uint256 public highWaterMark;

    /// @notice Total performance fees collected
    uint256 public totalPerformanceFees;

    /* ─── Management Fee ─── */

    /// @notice Annual management fee in BPS (default: 0, max: 200 = 2%)
    uint256 public managementFeeBps;

    /// @notice Last time management fee was accrued
    uint256 public lastManagementFeeTime;

    /// @notice Total management fees collected
    uint256 public totalManagementFees;

    /// @notice Whether management fee is active
    bool public managementFeeActive;

    /* ─── Totals ─── */

    /// @notice Total fees collected (performance + management)
    uint256 public totalCollected;

    /// @notice Total fees distributed to treasury
    uint256 public totalDistributed;

    /// @notice Pending fees (collected but not yet sent to treasury)
    uint256 public pendingFees;

    /* ─── Authorized ─── */

    /// @notice Authorized reporters (vault contract, operator)
    mapping(address => bool) public authorizedReporters;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event PerformanceFeeCollected(
        uint256 profit,
        uint256 feeAmount,
        uint256 oldHWM,
        uint256 newHWM,
        uint256 timestamp
    );

    event ManagementFeeCollected(
        uint256 aum,
        uint256 feeAmount,
        uint256 elapsed,
        uint256 timestamp
    );

    event FeesDistributed(uint256 amount, address treasury, uint256 timestamp);
    event HighWaterMarkUpdated(uint256 oldHWM, uint256 newHWM, uint256 timestamp);
    event PerformanceFeeRateUpdated(uint256 oldRate, uint256 newRate);
    event ManagementFeeRateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    /**
     * @param _feeAsset         USDC address
     * @param _treasury         Treasury / destination wallet
     * @param _performanceBps   Performance fee in BPS (e.g., 2000 = 20%)
     * @param _managementBps    Management fee in BPS (e.g., 100 = 1%, 0 = disabled)
     * @param _initialHWM       Initial high-water mark
     * @param _owner            Admin / multisig
     */
    constructor(
        address _feeAsset,
        address _treasury,
        uint256 _performanceBps,
        uint256 _managementBps,
        uint256 _initialHWM,
        address _owner
    ) Ownable(_owner) {
        require(_feeAsset != address(0), "FC: zero asset");
        require(_treasury != address(0), "FC: zero treasury");
        require(_performanceBps <= 5000, "FC: performance fee too high"); // Max 50%
        require(_managementBps <= 200, "FC: management fee too high");   // Max 2%

        feeAsset = IERC20(_feeAsset);
        treasury = _treasury;
        performanceFeeBps = _performanceBps;
        managementFeeBps = _managementBps;
        managementFeeActive = _managementBps > 0;
        highWaterMark = _initialHWM;
        lastManagementFeeTime = block.timestamp;
    }

    /* ============================================================ */
    /*                    PERFORMANCE FEE                           */
    /* ============================================================ */

    /**
     * @notice Collect performance fee on profits above high-water mark.
     *         Called by vault or operator when profits are realized.
     * @param currentNAV Current fund NAV
     * @param profitUsdc Realized profit amount in USDC
     */
    function collectPerformanceFee(uint256 currentNAV, uint256 profitUsdc) external nonReentrant {
        require(
            authorizedReporters[msg.sender] || msg.sender == owner(),
            "FC: unauthorized"
        );
        require(currentNAV > highWaterMark, "FC: NAV below HWM");
        require(profitUsdc > 0, "FC: zero profit");

        // Verify profit doesn't exceed HWM excess
        uint256 excess = currentNAV - highWaterMark;
        require(profitUsdc <= excess, "FC: profit exceeds HWM excess");

        // Calculate fee: 20% of profit
        uint256 feeAmount = (profitUsdc * performanceFeeBps) / BPS;

        if (feeAmount > 0) {
            // Pull fee from caller
            feeAsset.safeTransferFrom(msg.sender, address(this), feeAmount);

            totalPerformanceFees += feeAmount;
            totalCollected += feeAmount;
            pendingFees += feeAmount;
        }

        // Update HWM
        uint256 oldHWM = highWaterMark;
        highWaterMark = currentNAV;

        emit PerformanceFeeCollected(profitUsdc, feeAmount, oldHWM, currentNAV, block.timestamp);
        emit HighWaterMarkUpdated(oldHWM, currentNAV, block.timestamp);
    }

    /* ============================================================ */
    /*                    MANAGEMENT FEE                            */
    /* ============================================================ */

    /**
     * @notice Accrue and collect management fee based on AUM.
     *         Fee = (AUM × managementFeeBps × elapsed) / (BPS × SECONDS_PER_YEAR)
     * @param currentAUM Current assets under management (USDC)
     */
    function collectManagementFee(uint256 currentAUM) external nonReentrant {
        require(
            authorizedReporters[msg.sender] || msg.sender == owner(),
            "FC: unauthorized"
        );
        require(managementFeeActive, "FC: management fee disabled");

        uint256 elapsed = block.timestamp - lastManagementFeeTime;
        require(elapsed >= 1 days, "FC: too early");

        if (currentAUM == 0) {
            lastManagementFeeTime = block.timestamp;
            return;
        }

        uint256 feeAmount = (currentAUM * managementFeeBps * elapsed) / (BPS * SECONDS_PER_YEAR);

        if (feeAmount > 0) {
            feeAsset.safeTransferFrom(msg.sender, address(this), feeAmount);

            totalManagementFees += feeAmount;
            totalCollected += feeAmount;
            pendingFees += feeAmount;
        }

        lastManagementFeeTime = block.timestamp;

        emit ManagementFeeCollected(currentAUM, feeAmount, elapsed, block.timestamp);
    }

    /* ============================================================ */
    /*                    FEE DISTRIBUTION                          */
    /* ============================================================ */

    /**
     * @notice Send all pending fees to treasury
     */
    function distributeFees() external nonReentrant {
        require(pendingFees > 0, "FC: nothing to distribute");

        uint256 amount = pendingFees;
        pendingFees = 0;
        totalDistributed += amount;

        feeAsset.safeTransfer(treasury, amount);

        emit FeesDistributed(amount, treasury, block.timestamp);
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    /**
     * @notice Calculate pending performance fee for a given NAV
     */
    function pendingPerformanceFee(uint256 currentNAV) external view returns (uint256) {
        if (currentNAV <= highWaterMark) return 0;
        uint256 profit = currentNAV - highWaterMark;
        return (profit * performanceFeeBps) / BPS;
    }

    /**
     * @notice Calculate pending management fee based on current AUM
     */
    function pendingManagementFee(uint256 currentAUM) external view returns (uint256) {
        if (!managementFeeActive || currentAUM == 0) return 0;
        uint256 elapsed = block.timestamp - lastManagementFeeTime;
        if (elapsed < 1 days) return 0;
        return (currentAUM * managementFeeBps * elapsed) / (BPS * SECONDS_PER_YEAR);
    }

    /**
     * @notice Comprehensive fee summary (transparent, anyone can read)
     */
    function feeSummary() external view returns (
        uint256 _totalCollected,
        uint256 _totalDistributed,
        uint256 _pendingFees,
        uint256 _performanceFees,
        uint256 _managementFees,
        uint256 _performanceFeeBps,
        uint256 _managementFeeBps,
        uint256 _highWaterMark,
        bool _managementFeeActive
    ) {
        return (
            totalCollected,
            totalDistributed,
            pendingFees,
            totalPerformanceFees,
            totalManagementFees,
            performanceFeeBps,
            managementFeeBps,
            highWaterMark,
            managementFeeActive
        );
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function setPerformanceFee(uint256 _bps) external onlyOwner {
        require(_bps <= 5000, "FC: too high"); // Max 50%
        uint256 old = performanceFeeBps;
        performanceFeeBps = _bps;
        emit PerformanceFeeRateUpdated(old, _bps);
    }

    function setManagementFee(uint256 _bps) external onlyOwner {
        require(_bps <= 200, "FC: too high"); // Max 2%
        uint256 old = managementFeeBps;
        managementFeeBps = _bps;
        managementFeeActive = _bps > 0;
        emit ManagementFeeRateUpdated(old, _bps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "FC: zero");
        address old = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(old, _treasury);
    }

    function setHighWaterMark(uint256 _hwm) external onlyOwner {
        uint256 old = highWaterMark;
        highWaterMark = _hwm;
        emit HighWaterMarkUpdated(old, _hwm, block.timestamp);
    }

    function authorizeReporter(address reporter, bool authorized) external onlyOwner {
        require(reporter != address(0), "FC: zero reporter");
        authorizedReporters[reporter] = authorized;
    }
}
