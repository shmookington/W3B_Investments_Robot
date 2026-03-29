// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IUSDYToken — Interface for Ondo USDY (tokenized T-Bills)
 */
interface IUSDYToken is IERC20 {
    function mint(address to, uint256 amount) external;
}

/**
 * @title PatriotYield — Protocol Tax → Tokenized US Treasury Bills
 * @notice Collects 0.1% of all protocol interest (the "Protocol Tax"),
 *         auto-purchases tokenized US Treasury Bills (Ondo USDY), and
 *         maintains a publicly queryable "Patriot Tracker" for the dashboard.
 *
 * Flow:
 *   1. FeeCollector sends 0.1% of fees here
 *   2. PatriotYield accumulates USDC
 *   3. When threshold is met, auto-purchases USDY
 *   4. Tracker records total T-Bills purchased
 *   5. Dashboard queries tracker for display
 *
 * 🇺🇸 "Every trade strengthens America"
 */
contract PatriotYield is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant PRECISION = 1e18;
    uint256 public constant BPS = 10_000;

    /// @notice Protocol tax rate: 0.1% (10 BPS)
    uint256 public constant PROTOCOL_TAX_BPS = 10;

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct PurchaseRecord {
        uint256 usdcSpent;
        uint256 usdyReceived;
        uint256 timestamp;
        uint256 cumulativeTotal;
    }

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice USDC (payment token)
    IERC20 public immutable usdc;

    /// @notice USDY (Ondo tokenized T-Bills)
    IERC20 public immutable usdy;

    /// @notice USDY purchase contract / DEX router
    address public purchaseTarget;

    /// @notice Minimum USDC balance to trigger auto-purchase
    uint256 public purchaseThreshold;

    /// ──── Patriot Tracker ────

    /// @notice Total USDC spent on T-Bills
    uint256 public totalUsdcInvested;

    /// @notice Total USDY tokens held
    uint256 public totalUsdyPurchased;

    /// @notice Number of purchase transactions
    uint256 public totalPurchases;

    /// @notice Total fees received from protocol
    uint256 public totalFeesReceived;

    /// @notice Purchase history
    PurchaseRecord[] public purchaseHistory;

    /// @notice Last purchase timestamp
    uint256 public lastPurchaseTime;

    /// @notice Authorized depositors (FeeCollector, etc.)
    mapping(address => bool) public authorizedDepositors;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event TaxReceived(address indexed from, uint256 amount, uint256 timestamp);
    event TBillPurchased(uint256 usdcSpent, uint256 usdyReceived, uint256 totalInvested, uint256 timestamp);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    constructor(
        address _usdc,
        address _usdy,
        address _purchaseTarget,
        uint256 _purchaseThreshold,
        address _owner
    ) Ownable(_owner) {
        require(_usdc != address(0), "PY: zero usdc");
        require(_usdy != address(0), "PY: zero usdy");

        usdc = IERC20(_usdc);
        usdy = IERC20(_usdy);
        purchaseTarget = _purchaseTarget;
        purchaseThreshold = _purchaseThreshold;
    }

    /* ============================================================ */
    /*                    DEPOSIT (TAX COLLECTION)                  */
    /* ============================================================ */

    /**
     * @notice Receive protocol tax (called by FeeCollector)
     * @param amount USDC amount being deposited as protocol tax
     */
    function receiveTax(uint256 amount) external nonReentrant {
        require(
            authorizedDepositors[msg.sender] || msg.sender == owner(),
            "PY: unauthorized"
        );
        require(amount > 0, "PY: zero amount");

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalFeesReceived += amount;

        emit TaxReceived(msg.sender, amount, block.timestamp);

        // Auto-purchase if threshold met
        uint256 balance = usdc.balanceOf(address(this));
        if (balance >= purchaseThreshold && purchaseTarget != address(0)) {
            _purchaseTBills(balance);
        }
    }

    /**
     * @notice Manually trigger T-Bill purchase
     */
    function purchaseTBills() external nonReentrant {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "PY: no balance");
        _purchaseTBills(balance);
    }

    /* ============================================================ */
    /*                    PATRIOT TRACKER (PUBLIC)                  */
    /* ============================================================ */

    /**
     * @notice Get full Patriot Tracker stats (for dashboard)
     */
    function patriotTracker() external view returns (
        uint256 _totalFeesReceived,
        uint256 _totalUsdcInvested,
        uint256 _totalUsdyPurchased,
        uint256 _totalPurchases,
        uint256 _currentUsdyBalance,
        uint256 _pendingUsdc,
        uint256 _lastPurchaseTime
    ) {
        _totalFeesReceived = totalFeesReceived;
        _totalUsdcInvested = totalUsdcInvested;
        _totalUsdyPurchased = totalUsdyPurchased;
        _totalPurchases = totalPurchases;
        _currentUsdyBalance = usdy.balanceOf(address(this));
        _pendingUsdc = usdc.balanceOf(address(this));
        _lastPurchaseTime = lastPurchaseTime;
    }

    /**
     * @notice Get purchase history count
     */
    function purchaseCount() external view returns (uint256) {
        return purchaseHistory.length;
    }

    /**
     * @notice Get a specific purchase record
     */
    function getPurchase(uint256 index) external view returns (PurchaseRecord memory) {
        require(index < purchaseHistory.length, "PY: invalid index");
        return purchaseHistory[index];
    }

    /**
     * @notice Current pending USDC awaiting purchase
     */
    function pendingUsdc() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice Current USDY balance (T-Bills held)
     */
    function usdyBalance() external view returns (uint256) {
        return usdy.balanceOf(address(this));
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function authorizeDepositor(address depositor, bool authorized) external onlyOwner {
        require(depositor != address(0), "PY: zero depositor");
        authorizedDepositors[depositor] = authorized;
    }

    function setPurchaseThreshold(uint256 _threshold) external onlyOwner {
        emit ThresholdUpdated(purchaseThreshold, _threshold);
        purchaseThreshold = _threshold;
    }

    function setPurchaseTarget(address _target) external onlyOwner {
        purchaseTarget = _target;
    }

    /* ============================================================ */
    /*                    INTERNAL                                  */
    /* ============================================================ */

    function _purchaseTBills(uint256 usdcAmount) internal {
        // Approve purchase target
        usdc.safeIncreaseAllowance(purchaseTarget, usdcAmount);

        // In production: call Ondo USDY minting or DEX swap
        // For now: direct transfer to purchase target simulates the purchase
        usdc.safeTransfer(purchaseTarget, usdcAmount);

        // Track the USDY we receive (in production, check balance diff)
        // 1:1 rate for USDY (stable)
        uint256 usdyAmount = usdcAmount;

        totalUsdcInvested += usdcAmount;
        totalUsdyPurchased += usdyAmount;
        totalPurchases++;
        lastPurchaseTime = block.timestamp;

        purchaseHistory.push(PurchaseRecord({
            usdcSpent: usdcAmount,
            usdyReceived: usdyAmount,
            timestamp: block.timestamp,
            cumulativeTotal: totalUsdcInvested
        }));

        emit TBillPurchased(usdcAmount, usdyAmount, totalUsdcInvested, block.timestamp);
    }
}
