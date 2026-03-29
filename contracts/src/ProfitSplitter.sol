// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProfitSplitter — Prediction Fund Fee Distribution
 * @notice Splits fund profits into three buckets using a high-water mark
 *         to ensure only REALIZED profits above previous peaks are split.
 *
 * Split Configuration (default 50/30/20):
 *   - 50% → Operations (Kalshi capital replenishment, model development)
 *   - 30% → Sovereign Reserve (savings buffer — USDC or T-Bills via Ondo)
 *   - 20% → Team (founder/operator compensation)
 *
 * Rules:
 *   - Only splits realized profits (settled positions, not unrealized)
 *   - Profit = current NAV - high-water mark
 *   - High-water mark updates on-chain when a new peak is reached
 *   - Distribution frequency is configurable (weekly/monthly)
 *   - On-chain history for full transparency
 */
contract ProfitSplitter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant BPS = 10_000;

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct SplitConfig {
        uint256 operationsBps;       // % to operations (Kalshi capital)
        uint256 sovereignBps;        // % to Sovereign Reserve
        uint256 teamBps;             // % to team compensation
    }

    struct SplitRecord {
        uint256 totalProfit;
        uint256 toOperations;
        uint256 toSovereign;
        uint256 toTeam;
        uint256 oldHWM;
        uint256 newHWM;
        address token;
        uint256 timestamp;
    }

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice Split configuration
    SplitConfig public splitConfig;

    /// @notice Destination addresses
    address public operationsWallet;
    address public sovereignReserve;
    address public teamWallet;

    /// @notice The profit asset (USDC)
    IERC20 public immutable profitAsset;

    /* ─── High-Water Mark ─── */

    /// @notice On-chain high-water mark (in USDC, 6 decimals)
    ///         Profit = currentNAV - highWaterMark
    uint256 public highWaterMark;

    /* ─── Distribution Frequency ─── */

    /// @notice Minimum interval between distributions (default: 7 days)
    uint256 public distributionInterval;

    /// @notice Timestamp of last distribution
    uint256 public lastDistributionTime;

    /* ─── Authorized ─── */

    /// @notice Authorized callers (vault, operator, keeper)
    mapping(address => bool) public authorizedCallers;

    /* ─── Split History ─── */

    SplitRecord[] public splitHistory;
    uint256 public totalProfitsSplit;
    uint256 public totalToOperations;
    uint256 public totalToSovereign;
    uint256 public totalToTeam;
    uint256 public totalSplits;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event ProfitSplit(
        uint256 totalProfit,
        uint256 toOperations,
        uint256 toSovereign,
        uint256 toTeam,
        uint256 oldHWM,
        uint256 newHWM,
        uint256 timestamp
    );

    event HighWaterMarkUpdated(uint256 oldHWM, uint256 newHWM, uint256 timestamp);
    event SplitConfigUpdated(uint256 operationsBps, uint256 sovereignBps, uint256 teamBps);
    event DestinationsUpdated(address operations, address sovereign, address team);
    event DistributionIntervalUpdated(uint256 oldInterval, uint256 newInterval);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    /**
     * @param _profitAsset       USDC address
     * @param _operationsWallet  Operations / Kalshi capital address
     * @param _sovereignReserve  Sovereign reserve address
     * @param _teamWallet        Team compensation address
     * @param _initialHWM        Initial high-water mark (e.g., seed capital NAV)
     * @param _owner             Admin / multisig
     */
    constructor(
        address _profitAsset,
        address _operationsWallet,
        address _sovereignReserve,
        address _teamWallet,
        uint256 _initialHWM,
        address _owner
    ) Ownable(_owner) {
        require(_profitAsset != address(0), "PS: zero asset");
        require(_operationsWallet != address(0), "PS: zero operations");
        require(_sovereignReserve != address(0), "PS: zero sovereign");
        require(_teamWallet != address(0), "PS: zero team");

        profitAsset = IERC20(_profitAsset);
        operationsWallet = _operationsWallet;
        sovereignReserve = _sovereignReserve;
        teamWallet = _teamWallet;
        highWaterMark = _initialHWM;

        // Default split: 50/30/20
        splitConfig = SplitConfig({
            operationsBps: 5000,
            sovereignBps: 3000,
            teamBps: 2000
        });

        // Default: weekly distributions
        distributionInterval = 7 days;
        lastDistributionTime = block.timestamp;
    }

    /* ============================================================ */
    /*                    PROFIT DISTRIBUTION                       */
    /* ============================================================ */

    /**
     * @notice Distribute realized profits above the high-water mark.
     *         Profits must be transferred here first (pull from vault).
     * @param currentNAV The current fund NAV (for HWM comparison)
     * @param profitAmount The realized profit amount in USDC being distributed
     */
    function distributeProfit(uint256 currentNAV, uint256 profitAmount) external nonReentrant {
        require(
            authorizedCallers[msg.sender] || msg.sender == owner(),
            "PS: unauthorized"
        );
        require(profitAmount > 0, "PS: zero profit");

        // Enforce distribution frequency
        require(
            block.timestamp >= lastDistributionTime + distributionInterval,
            "PS: too early"
        );

        // Only split if NAV is above high-water mark
        require(currentNAV > highWaterMark, "PS: NAV below HWM");

        // Verify profit amount doesn't exceed the actual excess
        uint256 excessAboveHWM = currentNAV - highWaterMark;
        require(profitAmount <= excessAboveHWM, "PS: profit exceeds HWM excess");

        // Transfer profit in
        profitAsset.safeTransferFrom(msg.sender, address(this), profitAmount);

        // Execute split
        uint256 oldHWM = highWaterMark;
        _executeSplit(profitAmount, oldHWM);

        // Update high-water mark
        highWaterMark = currentNAV;
        lastDistributionTime = block.timestamp;

        emit HighWaterMarkUpdated(oldHWM, currentNAV, block.timestamp);
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    function splitCount() external view returns (uint256) {
        return splitHistory.length;
    }

    function getSplit(uint256 index) external view returns (SplitRecord memory) {
        require(index < splitHistory.length, "PS: invalid index");
        return splitHistory[index];
    }

    /**
     * @notice Calculate how much profit is distributable given a current NAV
     */
    function distributableProfit(uint256 currentNAV) external view returns (uint256) {
        if (currentNAV <= highWaterMark) return 0;
        return currentNAV - highWaterMark;
    }

    /**
     * @notice Get comprehensive split summary
     */
    function splitSummary() external view returns (
        uint256 _totalProfits,
        uint256 _totalOperations,
        uint256 _totalSovereign,
        uint256 _totalTeam,
        uint256 _totalSplits,
        uint256 _highWaterMark,
        uint256 _operationsBps,
        uint256 _sovereignBps,
        uint256 _teamBps,
        uint256 _lastDistribution,
        uint256 _nextDistribution
    ) {
        return (
            totalProfitsSplit,
            totalToOperations,
            totalToSovereign,
            totalToTeam,
            totalSplits,
            highWaterMark,
            splitConfig.operationsBps,
            splitConfig.sovereignBps,
            splitConfig.teamBps,
            lastDistributionTime,
            lastDistributionTime + distributionInterval
        );
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function setSplitConfig(
        uint256 _operationsBps,
        uint256 _sovereignBps,
        uint256 _teamBps
    ) external onlyOwner {
        require(
            _operationsBps + _sovereignBps + _teamBps == BPS,
            "PS: must sum to 100%"
        );
        splitConfig = SplitConfig({
            operationsBps: _operationsBps,
            sovereignBps: _sovereignBps,
            teamBps: _teamBps
        });
        emit SplitConfigUpdated(_operationsBps, _sovereignBps, _teamBps);
    }

    function setDestinations(
        address _operations,
        address _sovereign,
        address _team
    ) external onlyOwner {
        require(_operations != address(0), "PS: zero operations");
        require(_sovereign != address(0), "PS: zero sovereign");
        require(_team != address(0), "PS: zero team");
        operationsWallet = _operations;
        sovereignReserve = _sovereign;
        teamWallet = _team;
        emit DestinationsUpdated(_operations, _sovereign, _team);
    }

    function setDistributionInterval(uint256 _interval) external onlyOwner {
        uint256 old = distributionInterval;
        distributionInterval = _interval;
        emit DistributionIntervalUpdated(old, _interval);
    }

    function authorizeCaller(address caller, bool authorized) external onlyOwner {
        require(caller != address(0), "PS: zero caller");
        authorizedCallers[caller] = authorized;
    }

    /// @notice Manually set HWM (governance-only, for initial setup or corrections)
    function setHighWaterMark(uint256 _hwm) external onlyOwner {
        uint256 old = highWaterMark;
        highWaterMark = _hwm;
        emit HighWaterMarkUpdated(old, _hwm, block.timestamp);
    }

    /* ============================================================ */
    /*                    INTERNAL                                  */
    /* ============================================================ */

    function _executeSplit(uint256 amount, uint256 oldHWM) internal {
        uint256 toOperations = (amount * splitConfig.operationsBps) / BPS;
        uint256 toSovereign = (amount * splitConfig.sovereignBps) / BPS;
        uint256 toTeam = amount - toOperations - toSovereign; // Remainder to avoid rounding loss

        // Transfer to destinations
        if (toOperations > 0) {
            profitAsset.safeTransfer(operationsWallet, toOperations);
        }
        if (toSovereign > 0) {
            profitAsset.safeTransfer(sovereignReserve, toSovereign);
        }
        if (toTeam > 0) {
            profitAsset.safeTransfer(teamWallet, toTeam);
        }

        // Update stats
        totalProfitsSplit += amount;
        totalToOperations += toOperations;
        totalToSovereign += toSovereign;
        totalToTeam += toTeam;
        totalSplits++;

        // Record history
        splitHistory.push(SplitRecord({
            totalProfit: amount,
            toOperations: toOperations,
            toSovereign: toSovereign,
            toTeam: toTeam,
            oldHWM: oldHWM,
            newHWM: highWaterMark,
            token: address(profitAsset),
            timestamp: block.timestamp
        }));

        emit ProfitSplit(
            amount,
            toOperations,
            toSovereign,
            toTeam,
            oldHWM,
            highWaterMark,
            block.timestamp
        );
    }
}
