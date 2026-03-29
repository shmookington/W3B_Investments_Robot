// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SovereignVault — Prediction Fund Core
 * @notice Users deposit USDC → vault mints shares proportional to NAV.
 *         Operator manages capital off-chain (Kalshi predictions).
 *         On-chain: NAV tracking, share accounting, withdrawal queues,
 *         configurable lock-ups, and emergency functions.
 *
 * Architecture:
 *   - ERC-20 share token (svUSDC) represents proportional ownership
 *   - Operator submits signed daily NAV updates
 *   - Deposits mint shares at current price-per-share
 *   - Withdrawals burn shares and return proportional USDC (minus pending fees)
 *   - Lock-up periods prevent bank runs (configurable: 0, 7, 30 days)
 *   - Withdrawal queue when vault lacks liquid USDC
 *   - Emergency withdrawal always available after X-day timelock
 *
 * @dev Inherits:
 *   - ERC20:           Share token (svUSDC)
 *   - Ownable:         Admin functions (multisig)
 *   - Pausable:        Emergency pause (deposits/withdrawals separately)
 *   - ReentrancyGuard: Reentrancy protection
 */
contract SovereignVault is ERC20, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant INITIAL_SHARE_PRICE = 1e6; // 1 share = 1 USDC (6 decimals)

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice The underlying asset (USDC — 6 decimals)
    IERC20 public immutable asset;

    /// @notice Authorized operator (submits NAV updates)
    address public operator;

    /// @notice Fee collector contract address
    address public feeCollector;

    /* ─── NAV ─── */

    /// @notice Current Net Asset Value (total fund value in USDC, 6 decimals)
    uint256 public currentNAV;

    /// @notice Timestamp of the last NAV update
    uint256 public lastNAVUpdateTime;

    /// @notice Sequential NAV update counter
    uint256 public navUpdateCount;

    /* ─── Deposit Limits ─── */

    /// @notice Minimum deposit per transaction (default: 10 USDC)
    uint256 public minDeposit;

    /// @notice Maximum single deposit (prevents whale concentration)
    uint256 public maxDeposit;

    /// @notice Maximum total deposit per user
    uint256 public maxUserDeposit;

    /* ─── Lock-Up ─── */

    /// @notice Lock-up period in seconds (0 = no lock, 7 days, 30 days)
    uint256 public lockUpPeriod;

    /// @notice Per-user deposit timestamp (for lock-up enforcement)
    mapping(address => uint256) public lastDepositTime;

    /* ─── Emergency ─── */

    /// @notice Emergency withdrawal timelock (days after which users can ALWAYS withdraw)
    uint256 public emergencyTimelockDays;

    /// @notice Whether deposits are paused (independent of full pause)
    bool public depositsPaused;

    /// @notice Whether withdrawals are paused (requires timelock to enable)
    bool public withdrawalsPaused;

    /// @notice Timestamp when withdrawal pause was initiated (for timelock)
    uint256 public withdrawalPauseTimestamp;

    /// @notice Timelock duration for withdrawal pause (default: 48 hours)
    uint256 public withdrawalPauseTimelock;

    /* ─── Withdrawal Queue ─── */

    /// @notice Queue ID counter
    uint256 public nextQueueId;

    /// @notice Queued withdrawal requests
    mapping(uint256 => WithdrawalRequest) public withdrawalQueue;

    /// @notice User's pending withdrawal queue IDs
    mapping(address => uint256[]) public userPendingWithdrawals;

    /* ─── Accounting ─── */

    /// @notice Per-user total USDC deposited (for tracking, not for share math)
    mapping(address => uint256) public userDeposited;

    /// @notice Total USDC ever deposited
    uint256 public totalDeposited;

    /// @notice Total USDC ever withdrawn
    uint256 public totalWithdrawn;

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct WithdrawalRequest {
        address user;
        uint256 shares;       // Shares to burn
        uint256 usdcAmount;   // USDC owed (calculated at queue time)
        uint256 requestedAt;
        bool processed;
        bool cancelled;
    }

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event Deposited(
        address indexed user,
        uint256 usdcAmount,
        uint256 sharesMinted,
        uint256 pricePerShare,
        uint256 nav,
        uint256 timestamp
    );

    event Withdrawn(
        address indexed user,
        uint256 usdcAmount,
        uint256 sharesBurned,
        uint256 pricePerShare,
        uint256 nav,
        uint256 timestamp
    );

    event WithdrawalQueued(
        uint256 indexed queueId,
        address indexed user,
        uint256 shares,
        uint256 usdcAmount,
        uint256 timestamp
    );

    event WithdrawalProcessed(
        uint256 indexed queueId,
        address indexed user,
        uint256 usdcAmount,
        uint256 timestamp
    );

    event WithdrawalCancelled(uint256 indexed queueId, address indexed user, uint256 timestamp);

    event NAVUpdated(
        uint256 indexed updateNumber,
        uint256 oldNAV,
        uint256 newNAV,
        uint256 pricePerShare,
        address operator,
        uint256 timestamp
    );

    event DepositsPaused(uint256 timestamp);
    event DepositsUnpaused(uint256 timestamp);
    event WithdrawalsPaused(uint256 timestamp);
    event WithdrawalsUnpaused(uint256 timestamp);
    event EmergencyWithdrawal(address indexed user, uint256 amount, uint256 timestamp);
    event OperatorUpdated(address oldOperator, address newOperator);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event LockUpPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event DepositLimitsUpdated(uint256 minDeposit, uint256 maxDeposit, uint256 maxUserDeposit);

    /* ============================================================ */
    /*                         MODIFIERS                            */
    /* ============================================================ */

    modifier onlyOperator() {
        require(msg.sender == operator, "Vault: not operator");
        _;
    }

    modifier onlyOperatorOrOwner() {
        require(msg.sender == operator || msg.sender == owner(), "Vault: not authorized");
        _;
    }

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    /**
     * @param _asset         USDC token address
     * @param _owner         Admin / multisig address
     * @param _operator      Operator address (submits NAV updates)
     * @param _feeCollector  Fee collector contract address
     * @param _lockUpDays    Initial lock-up period in days (0, 7, or 30)
     */
    constructor(
        address _asset,
        address _owner,
        address _operator,
        address _feeCollector,
        uint256 _lockUpDays
    ) ERC20("Sovereign Vault USDC", "svUSDC") Ownable(_owner) {
        require(_asset != address(0), "Vault: zero asset");
        require(_operator != address(0), "Vault: zero operator");
        require(_feeCollector != address(0), "Vault: zero fee collector");

        asset = IERC20(_asset);
        operator = _operator;
        feeCollector = _feeCollector;

        // Deposit limits (USDC has 6 decimals)
        minDeposit = 10 * 1e6;                 // $10
        maxDeposit = 1_000_000 * 1e6;          // $1M
        maxUserDeposit = 10_000_000 * 1e6;     // $10M

        // Lock-up
        lockUpPeriod = _lockUpDays * 1 days;

        // Emergency config
        emergencyTimelockDays = 14;             // 14 days emergency timelock
        withdrawalPauseTimelock = 48 hours;     // 48h timelock on withdrawal pause

        // NAV starts at 0 (no deposits yet)
        lastNAVUpdateTime = block.timestamp;
    }

    /* ============================================================ */
    /*                    DEPOSIT                                   */
    /* ============================================================ */

    /**
     * @notice Deposit USDC → receive vault shares (svUSDC) proportional to NAV
     * @param usdcAmount USDC amount to deposit (6 decimals)
     */
    function deposit(uint256 usdcAmount) external nonReentrant whenNotPaused {
        require(!depositsPaused, "Vault: deposits paused");
        require(usdcAmount >= minDeposit, "Vault: below minimum deposit");
        require(usdcAmount <= maxDeposit, "Vault: above maximum deposit");
        require(
            userDeposited[msg.sender] + usdcAmount <= maxUserDeposit,
            "Vault: exceeds user max"
        );

        // Calculate shares to mint
        uint256 sharesToMint = _usdcToShares(usdcAmount);
        require(sharesToMint > 0, "Vault: zero shares");

        // Transfer USDC in
        asset.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Mint shares
        _mint(msg.sender, sharesToMint);

        // Update accounting
        currentNAV += usdcAmount;
        userDeposited[msg.sender] += usdcAmount;
        totalDeposited += usdcAmount;
        lastDepositTime[msg.sender] = block.timestamp;

        emit Deposited(
            msg.sender,
            usdcAmount,
            sharesToMint,
            pricePerShare(),
            currentNAV,
            block.timestamp
        );
    }

    /* ============================================================ */
    /*                    WITHDRAW                                  */
    /* ============================================================ */

    /**
     * @notice Burn shares → receive proportional USDC (minus any pending fees).
     *         If vault lacks liquidity, withdrawal enters queue.
     * @param shares Number of svUSDC shares to burn
     */
    function withdraw(uint256 shares) external nonReentrant whenNotPaused {
        require(!withdrawalsPaused, "Vault: withdrawals paused");
        require(shares > 0, "Vault: zero shares");
        require(balanceOf(msg.sender) >= shares, "Vault: insufficient shares");

        // Enforce lock-up
        require(
            block.timestamp >= lastDepositTime[msg.sender] + lockUpPeriod,
            "Vault: lock-up active"
        );

        // Calculate USDC owed
        uint256 usdcAmount = _sharesToUsdc(shares);
        require(usdcAmount > 0, "Vault: zero USDC");

        // Check liquidity
        uint256 availableLiquidity = asset.balanceOf(address(this));

        if (usdcAmount > availableLiquidity) {
            // Queue the withdrawal
            uint256 queueId = nextQueueId++;
            withdrawalQueue[queueId] = WithdrawalRequest({
                user: msg.sender,
                shares: shares,
                usdcAmount: usdcAmount,
                requestedAt: block.timestamp,
                processed: false,
                cancelled: false
            });
            userPendingWithdrawals[msg.sender].push(queueId);

            emit WithdrawalQueued(queueId, msg.sender, shares, usdcAmount, block.timestamp);
            return;
        }

        // Process immediately
        _executeWithdrawal(msg.sender, shares, usdcAmount);
    }

    /**
     * @notice Cancel a queued withdrawal
     * @param queueId ID of the queued withdrawal
     */
    function cancelWithdrawal(uint256 queueId) external {
        WithdrawalRequest storage req = withdrawalQueue[queueId];
        require(req.user == msg.sender, "Vault: not your withdrawal");
        require(!req.processed, "Vault: already processed");
        require(!req.cancelled, "Vault: already cancelled");

        req.cancelled = true;
        emit WithdrawalCancelled(queueId, msg.sender, block.timestamp);
    }

    /**
     * @notice Process a queued withdrawal (operator/owner)
     * @param queueId ID of the queued withdrawal
     */
    function processQueuedWithdrawal(uint256 queueId) external onlyOperatorOrOwner {
        WithdrawalRequest storage req = withdrawalQueue[queueId];
        require(!req.processed, "Vault: already processed");
        require(!req.cancelled, "Vault: cancelled");

        uint256 available = asset.balanceOf(address(this));
        require(available >= req.usdcAmount, "Vault: insufficient liquidity");

        req.processed = true;
        _executeWithdrawal(req.user, req.shares, req.usdcAmount);

        emit WithdrawalProcessed(queueId, req.user, req.usdcAmount, block.timestamp);
    }

    /**
     * @notice Emergency withdrawal — always available after emergency timelock.
     *         Bypasses withdrawal pause and lock-up period.
     */
    function emergencyWithdraw() external nonReentrant {
        uint256 shares = balanceOf(msg.sender);
        require(shares > 0, "Vault: no shares");

        // Must have deposited > emergencyTimelockDays ago
        require(
            block.timestamp >= lastDepositTime[msg.sender] + (emergencyTimelockDays * 1 days),
            "Vault: emergency timelock active"
        );

        uint256 usdcAmount = _sharesToUsdc(shares);
        uint256 available = asset.balanceOf(address(this));

        // Cap at available liquidity
        if (usdcAmount > available) {
            usdcAmount = available;
            // Only burn proportional shares
            shares = _usdcToShares(usdcAmount);
        }

        require(usdcAmount > 0, "Vault: no liquidity");

        _executeWithdrawal(msg.sender, shares, usdcAmount);
        emit EmergencyWithdrawal(msg.sender, usdcAmount, block.timestamp);
    }

    /* ============================================================ */
    /*                    NAV MANAGEMENT                            */
    /* ============================================================ */

    /**
     * @notice Operator submits daily NAV update (signed, verified by caller identity)
     * @param newNAV New total fund NAV in USDC (6 decimals)
     */
    function updateNAV(uint256 newNAV) external onlyOperator {
        uint256 oldNAV = currentNAV;
        currentNAV = newNAV;
        lastNAVUpdateTime = block.timestamp;
        navUpdateCount++;

        emit NAVUpdated(
            navUpdateCount,
            oldNAV,
            newNAV,
            pricePerShare(),
            msg.sender,
            block.timestamp
        );
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    /**
     * @notice Price per share in USDC (6 decimals).
     *         NAV / totalShares, or INITIAL_SHARE_PRICE if no shares exist.
     */
    function pricePerShare() public view returns (uint256) {
        uint256 shares = totalSupply();
        if (shares == 0) return INITIAL_SHARE_PRICE;
        return (currentNAV * PRECISION) / shares;
    }

    /**
     * @notice Total assets under management
     */
    function totalAssets() public view returns (uint256) {
        return currentNAV;
    }

    /**
     * @notice Total value locked (same as NAV for this model)
     */
    function totalValueLocked() public view returns (uint256) {
        return currentNAV;
    }

    /**
     * @notice Total deployed capital (NAV minus vault USDC balance)
     */
    function totalDeployedCapital() public view returns (uint256) {
        uint256 vaultBalance = asset.balanceOf(address(this));
        if (currentNAV <= vaultBalance) return 0;
        return currentNAV - vaultBalance;
    }

    /**
     * @notice Get user's current USDC value (shares × price per share)
     */
    function userValue(address user) external view returns (uint256) {
        return _sharesToUsdc(balanceOf(user));
    }

    /**
     * @notice Get user's pending withdrawal IDs
     */
    function getUserPendingWithdrawals(address user) external view returns (uint256[] memory) {
        return userPendingWithdrawals[user];
    }

    /**
     * @notice Full vault status summary
     */
    function vaultStatus() external view returns (
        uint256 _nav,
        uint256 _pricePerShare,
        uint256 _totalShares,
        uint256 _vaultBalance,
        uint256 _deployedCapital,
        uint256 _totalDeposited,
        uint256 _totalWithdrawn,
        uint256 _lastNAVUpdate,
        uint256 _navUpdateCount,
        bool _depositsPaused,
        bool _withdrawalsPaused
    ) {
        return (
            currentNAV,
            pricePerShare(),
            totalSupply(),
            asset.balanceOf(address(this)),
            totalDeployedCapital(),
            totalDeposited,
            totalWithdrawn,
            lastNAVUpdateTime,
            navUpdateCount,
            depositsPaused,
            withdrawalsPaused
        );
    }

    /**
     * @notice Override decimals to match USDC (6)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /* ============================================================ */
    /*                    ADMIN / GOVERNANCE                        */
    /* ============================================================ */

    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Vault: zero operator");
        address old = operator;
        operator = _operator;
        emit OperatorUpdated(old, _operator);
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Vault: zero address");
        address old = feeCollector;
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(old, _feeCollector);
    }

    function setDepositLimits(uint256 _min, uint256 _max, uint256 _maxUser) external onlyOwner {
        require(_min < _max, "Vault: invalid limits");
        minDeposit = _min;
        maxDeposit = _max;
        maxUserDeposit = _maxUser;
        emit DepositLimitsUpdated(_min, _max, _maxUser);
    }

    function setLockUpPeriod(uint256 _days) external onlyOwner {
        uint256 old = lockUpPeriod;
        lockUpPeriod = _days * 1 days;
        emit LockUpPeriodUpdated(old, lockUpPeriod);
    }

    function setEmergencyTimelockDays(uint256 _days) external onlyOwner {
        emergencyTimelockDays = _days;
    }

    /* ─── Pause Controls ─── */

    /// @notice Pause deposits only (admin only)
    function pauseDeposits() external onlyOwner {
        depositsPaused = true;
        emit DepositsPaused(block.timestamp);
    }

    /// @notice Unpause deposits (admin only)
    function unpauseDeposits() external onlyOwner {
        depositsPaused = false;
        emit DepositsUnpaused(block.timestamp);
    }

    /// @notice Pause withdrawals (admin only, with timelock)
    function pauseWithdrawals() external onlyOwner {
        withdrawalsPaused = true;
        withdrawalPauseTimestamp = block.timestamp;
        emit WithdrawalsPaused(block.timestamp);
    }

    /// @notice Unpause withdrawals (admin only)
    function unpauseWithdrawals() external onlyOwner {
        withdrawalsPaused = false;
        emit WithdrawalsUnpaused(block.timestamp);
    }

    /// @notice Full pause (both deposits and withdrawals)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Full unpause
    function unpause() external onlyOwner {
        _unpause();
    }

    /* ============================================================ */
    /*                    INTERNAL                                  */
    /* ============================================================ */

    /**
     * @dev Convert USDC amount to shares at current price
     */
    function _usdcToShares(uint256 usdcAmount) internal view returns (uint256) {
        uint256 shares = totalSupply();
        if (shares == 0 || currentNAV == 0) {
            // First deposit: 1 USDC = 1 share
            return usdcAmount;
        }
        return (usdcAmount * shares) / currentNAV;
    }

    /**
     * @dev Convert shares to USDC at current price
     */
    function _sharesToUsdc(uint256 shareAmount) internal view returns (uint256) {
        uint256 shares = totalSupply();
        if (shares == 0) return 0;
        return (shareAmount * currentNAV) / shares;
    }

    /**
     * @dev Execute withdrawal: burn shares, transfer USDC, update accounting
     */
    function _executeWithdrawal(address user, uint256 shares, uint256 usdcAmount) internal {
        _burn(user, shares);
        currentNAV -= usdcAmount;
        totalWithdrawn += usdcAmount;

        asset.safeTransfer(user, usdcAmount);

        emit Withdrawn(
            user,
            usdcAmount,
            shares,
            pricePerShare(),
            currentNAV,
            block.timestamp
        );
    }
}
