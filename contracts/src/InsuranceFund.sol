// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InsuranceFund — Prediction Fund Safety Net
 * @notice Buffer to cover unexpected losses beyond normal drawdowns.
 *
 * Configuration:
 *   - Target: 5-10% of AUM (configurable)
 *   - Funded from: Portion of performance fees + initial seed capital
 *   - Trigger: Fund NAV drops >15% from peak → insurance supplements
 *   - Refill: When fund recovers, insurance refills BEFORE profit distribution
 *   - On-chain balance visible to all depositors (trust signal)
 *
 * Payout Types:
 *   - Drawdown coverage: Automatic when NAV drops > threshold
 *   - Emergency: Governance-approved extraordinary payouts
 *
 * @dev All balances and claims are publicly queryable for full transparency.
 */
contract InsuranceFund is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant BPS = 10_000;

    /* ============================================================ */
    /*                          ENUMS                               */
    /* ============================================================ */

    enum ClaimType {
        DRAWDOWN_COVERAGE,
        EMERGENCY
    }

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct Claim {
        ClaimType claimType;
        uint256 amount;
        string reason;
        uint256 navAtClaim;
        uint256 peakNAV;
        uint256 drawdownBps;
        uint256 timestamp;
    }

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice Fund asset (USDC)
    IERC20 public immutable fundAsset;

    /* ─── Target & Thresholds ─── */

    /// @notice Target insurance fund size as BPS of AUM (default: 500 = 5%)
    uint256 public targetSizeBps;

    /// @notice Drawdown trigger threshold in BPS (default: 1500 = 15%)
    ///         If NAV drops more than this from peak, insurance supplements
    uint256 public drawdownTriggerBps;

    /// @notice Peak NAV (the highest NAV ever recorded, for drawdown calc)
    uint256 public peakNAV;

    /* ─── Refill Logic ─── */

    /// @notice Whether the insurance fund needs refilling
    bool public needsRefill;

    /// @notice Amount that needs to be refilled before profit distribution
    uint256 public refillDeficit;

    /* ─── Authorized ─── */

    /// @notice Authorized callers (vault, profit splitter, operator)
    mapping(address => bool) public authorizedCallers;

    /* ─── Stats ─── */

    Claim[] public claims;
    uint256 public totalDeposited;
    uint256 public totalPaidOut;
    uint256 public totalDrawdownClaims;
    uint256 public totalEmergencyClaims;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event FundDeposited(address indexed from, uint256 amount, uint256 newBalance, uint256 timestamp);
    event DrawdownTriggered(
        uint256 navCurrent,
        uint256 navPeak,
        uint256 drawdownBps,
        uint256 payoutAmount,
        uint256 timestamp
    );
    event EmergencyPayout(address indexed to, uint256 amount, string reason, uint256 timestamp);
    event PeakNAVUpdated(uint256 oldPeak, uint256 newPeak, uint256 timestamp);
    event RefillRequired(uint256 deficit, uint256 timestamp);
    event RefillCompleted(uint256 amount, uint256 timestamp);
    event TargetSizeUpdated(uint256 oldBps, uint256 newBps);
    event DrawdownTriggerUpdated(uint256 oldBps, uint256 newBps);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    /**
     * @param _fundAsset         USDC address
     * @param _targetSizeBps     Target fund size as BPS of AUM (e.g., 500 = 5%)
     * @param _drawdownTriggerBps Drawdown trigger in BPS (e.g., 1500 = 15%)
     * @param _initialPeakNAV    Initial peak NAV (seed capital)
     * @param _owner             Admin / multisig
     */
    constructor(
        address _fundAsset,
        uint256 _targetSizeBps,
        uint256 _drawdownTriggerBps,
        uint256 _initialPeakNAV,
        address _owner
    ) Ownable(_owner) {
        require(_fundAsset != address(0), "IF: zero asset");
        require(_targetSizeBps > 0 && _targetSizeBps <= 2000, "IF: invalid target"); // Max 20%
        require(_drawdownTriggerBps > 0 && _drawdownTriggerBps <= 5000, "IF: invalid trigger"); // Max 50%

        fundAsset = IERC20(_fundAsset);
        targetSizeBps = _targetSizeBps;
        drawdownTriggerBps = _drawdownTriggerBps;
        peakNAV = _initialPeakNAV;
    }

    /* ============================================================ */
    /*                    DEPOSITS                                  */
    /* ============================================================ */

    /**
     * @notice Deposit funds into insurance (from FeeCollector, seed capital, anyone)
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "IF: zero amount");
        fundAsset.safeTransferFrom(msg.sender, address(this), amount);
        totalDeposited += amount;

        // Check if refill deficit is being covered
        if (needsRefill && refillDeficit > 0) {
            if (amount >= refillDeficit) {
                refillDeficit = 0;
                needsRefill = false;
                emit RefillCompleted(amount, block.timestamp);
            } else {
                refillDeficit -= amount;
            }
        }

        emit FundDeposited(msg.sender, amount, fundAsset.balanceOf(address(this)), block.timestamp);
    }

    /* ============================================================ */
    /*                    DRAWDOWN COVERAGE                         */
    /* ============================================================ */

    /**
     * @notice Check if drawdown trigger is hit and payout to vault if needed.
     * @param currentNAV Current fund NAV
     * @param vaultAddress Address to send insurance payout to
     * @return payoutAmount Amount paid out (0 if no trigger)
     */
    function checkAndCoverDrawdown(
        uint256 currentNAV,
        address vaultAddress
    ) external nonReentrant returns (uint256 payoutAmount) {
        require(
            authorizedCallers[msg.sender] || msg.sender == owner(),
            "IF: unauthorized"
        );
        require(vaultAddress != address(0), "IF: zero vault");

        // Update peak NAV if new high
        if (currentNAV > peakNAV) {
            uint256 oldPeak = peakNAV;
            peakNAV = currentNAV;
            emit PeakNAVUpdated(oldPeak, currentNAV, block.timestamp);
            return 0; // No drawdown at new peak
        }

        // Calculate drawdown
        if (peakNAV == 0) return 0;
        uint256 drawdownBps = ((peakNAV - currentNAV) * BPS) / peakNAV;

        // Check if trigger is hit
        if (drawdownBps < drawdownTriggerBps) return 0;

        // Calculate payout: fill the gap between current and (peak - trigger threshold)
        uint256 triggerLevel = (peakNAV * (BPS - drawdownTriggerBps)) / BPS;
        if (currentNAV >= triggerLevel) return 0;

        payoutAmount = triggerLevel - currentNAV;

        // Cap at available balance
        uint256 available = fundAsset.balanceOf(address(this));
        if (payoutAmount > available) {
            payoutAmount = available;
        }

        if (payoutAmount == 0) return 0;

        // Execute payout
        fundAsset.safeTransfer(vaultAddress, payoutAmount);
        totalPaidOut += payoutAmount;
        totalDrawdownClaims++;

        // Mark for refill
        needsRefill = true;
        refillDeficit += payoutAmount;

        // Record claim
        claims.push(Claim({
            claimType: ClaimType.DRAWDOWN_COVERAGE,
            amount: payoutAmount,
            reason: "Automatic drawdown coverage",
            navAtClaim: currentNAV,
            peakNAV: peakNAV,
            drawdownBps: drawdownBps,
            timestamp: block.timestamp
        }));

        emit DrawdownTriggered(currentNAV, peakNAV, drawdownBps, payoutAmount, block.timestamp);
        emit RefillRequired(refillDeficit, block.timestamp);
    }

    /* ============================================================ */
    /*                    EMERGENCY                                 */
    /* ============================================================ */

    /**
     * @notice Emergency payout (governance-only)
     */
    function emergencyPayout(
        uint256 amount,
        address to,
        string calldata reason
    ) external onlyOwner nonReentrant {
        require(to != address(0), "IF: zero destination");
        require(fundAsset.balanceOf(address(this)) >= amount, "IF: insufficient funds");

        fundAsset.safeTransfer(to, amount);
        totalPaidOut += amount;
        totalEmergencyClaims++;

        // Mark for refill
        needsRefill = true;
        refillDeficit += amount;

        claims.push(Claim({
            claimType: ClaimType.EMERGENCY,
            amount: amount,
            reason: reason,
            navAtClaim: 0,
            peakNAV: peakNAV,
            drawdownBps: 0,
            timestamp: block.timestamp
        }));

        emit EmergencyPayout(to, amount, reason, block.timestamp);
        emit RefillRequired(refillDeficit, block.timestamp);
    }

    /* ============================================================ */
    /*                    REFILL CHECK                              */
    /* ============================================================ */

    /**
     * @notice Check if insurance fund needs refill before profit distribution.
     *         ProfitSplitter should call this before distributing profits.
     * @return _needsRefill Whether refill is required
     * @return _deficit Amount needed to refill
     */
    function checkRefillNeeded() external view returns (bool _needsRefill, uint256 _deficit) {
        return (needsRefill, refillDeficit);
    }

    /**
     * @notice Calculate target fund size based on current AUM
     * @param currentAUM Current assets under management
     * @return targetSize Target insurance fund size in USDC
     * @return currentSize Current insurance fund balance
     * @return funded Whether the fund meets its target
     */
    function fundingStatus(uint256 currentAUM) external view returns (
        uint256 targetSize,
        uint256 currentSize,
        bool funded
    ) {
        targetSize = (currentAUM * targetSizeBps) / BPS;
        currentSize = fundAsset.balanceOf(address(this));
        funded = currentSize >= targetSize;
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    /// @notice Current fund balance (publicly visible — trust signal)
    function fundBalance() external view returns (uint256) {
        return fundAsset.balanceOf(address(this));
    }

    /// @notice Full fund summary
    function fundSummary() external view returns (
        uint256 _balance,
        uint256 _totalDeposited,
        uint256 _totalPaidOut,
        uint256 _totalDrawdownClaims,
        uint256 _totalEmergencyClaims,
        uint256 _peakNAV,
        uint256 _targetSizeBps,
        uint256 _drawdownTriggerBps,
        bool _needsRefill,
        uint256 _refillDeficit
    ) {
        return (
            fundAsset.balanceOf(address(this)),
            totalDeposited,
            totalPaidOut,
            totalDrawdownClaims,
            totalEmergencyClaims,
            peakNAV,
            targetSizeBps,
            drawdownTriggerBps,
            needsRefill,
            refillDeficit
        );
    }

    function claimCount() external view returns (uint256) {
        return claims.length;
    }

    function getClaim(uint256 index) external view returns (Claim memory) {
        require(index < claims.length, "IF: invalid index");
        return claims[index];
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function setTargetSize(uint256 _bps) external onlyOwner {
        require(_bps > 0 && _bps <= 2000, "IF: invalid"); // Max 20%
        uint256 old = targetSizeBps;
        targetSizeBps = _bps;
        emit TargetSizeUpdated(old, _bps);
    }

    function setDrawdownTrigger(uint256 _bps) external onlyOwner {
        require(_bps > 0 && _bps <= 5000, "IF: invalid"); // Max 50%
        uint256 old = drawdownTriggerBps;
        drawdownTriggerBps = _bps;
        emit DrawdownTriggerUpdated(old, _bps);
    }

    function setPeakNAV(uint256 _peak) external onlyOwner {
        uint256 old = peakNAV;
        peakNAV = _peak;
        emit PeakNAVUpdated(old, _peak, block.timestamp);
    }

    function authorizeCaller(address caller, bool authorized) external onlyOwner {
        require(caller != address(0), "IF: zero caller");
        authorizedCallers[caller] = authorized;
    }
}
