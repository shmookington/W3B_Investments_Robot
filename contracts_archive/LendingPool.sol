// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LendingPool — Core Lending Protocol
 * @notice Implements supply/borrow/repay/withdraw with a dual-slope ("kink")
 *         interest rate model. Lenders earn interest from borrower payments.
 *
 * Interest Rate Model (per-second, annualized):
 *   - Base rate:   2% APR
 *   - Slope 1:     4% APR (utilization 0-80%)
 *   - Slope 2:     75% APR (utilization 80-100% — "kink" penalty)
 *   - At 80% util: 2% + 4% = 6% APR
 *   - At 100% util: 2% + 4% + 75%*(100-80)/20 = 6% + 75% = 81% APR
 *
 * Reserve Factor: 10% of interest accrued → protocol treasury
 *
 * @dev Per-asset pool — this instance handles a single asset (USDC).
 *      Positions tracked via index-based accounting (similar to Aave).
 */
contract LendingPool is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant PRECISION = 1e27;      // Ray precision
    uint256 public constant BPS = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /* ============================================================ */
    /*                    INTEREST RATE MODEL                       */
    /* ============================================================ */

    /// @notice Base borrow rate: 2% APR (in ray)
    uint256 public baseRatePerSecond;

    /// @notice Slope 1: 4% APR below kink (in ray)
    uint256 public slope1PerSecond;

    /// @notice Slope 2: 75% APR above kink (in ray)
    uint256 public slope2PerSecond;

    /// @notice Optimal utilization (kink point): 80%
    uint256 public optimalUtilization;

    /// @notice Reserve factor: 10% of interest → treasury (BPS)
    uint256 public reserveFactorBps;

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice The lending asset (USDC)
    IERC20 public immutable asset;

    /// @notice Protocol treasury for reserve fees
    address public treasury;

    /// @notice Total supplied (principal)
    uint256 public totalSupplied;

    /// @notice Total borrowed (principal)
    uint256 public totalBorrowed;

    /// @notice Total reserves accrued to protocol
    uint256 public totalReserves;

    /// @notice Cumulative borrow index (tracks compounding interest)
    uint256 public borrowIndex;

    /// @notice Cumulative supply index (tracks lender yield)
    uint256 public supplyIndex;

    /// @notice Last timestamp interest was accrued
    uint256 public lastAccrualTime;

    /// @notice Per-user supply balance (principal)
    mapping(address => uint256) public userSupplyPrincipal;

    /// @notice Per-user supply index at deposit time
    mapping(address => uint256) public userSupplyIndex;

    /// @notice Per-user borrow balance (principal)
    mapping(address => uint256) public userBorrowPrincipal;

    /// @notice Per-user borrow index at borrow time
    mapping(address => uint256) public userBorrowIndex;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event Supplied(address indexed user, uint256 amount, uint256 newBalance, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance, uint256 timestamp);
    event Borrowed(address indexed user, uint256 amount, uint256 newBorrow, uint256 timestamp);
    event Repaid(address indexed user, uint256 amount, uint256 remainingBorrow, uint256 timestamp);
    event InterestAccrued(uint256 borrowRate, uint256 supplyRate, uint256 utilization, uint256 timestamp);
    event ReservesCollected(uint256 amount, address treasury, uint256 timestamp);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    /**
     * @param _asset    Lending asset (USDC)
     * @param _treasury Protocol treasury address
     * @param _owner    Admin/multisig
     */
    constructor(
        address _asset,
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        require(_asset != address(0), "Pool: zero asset");
        require(_treasury != address(0), "Pool: zero treasury");

        asset = IERC20(_asset);
        treasury = _treasury;

        // Interest rate model params (per-second rates, stored as ray)
        // 2% APR → per second
        baseRatePerSecond = (2e25) / SECONDS_PER_YEAR;   // 0.02 * 1e27 / seconds
        // 4% APR slope below kink
        slope1PerSecond = (4e25) / SECONDS_PER_YEAR;
        // 75% APR slope above kink
        slope2PerSecond = (75e25) / SECONDS_PER_YEAR;

        optimalUtilization = 8000; // 80% in BPS
        reserveFactorBps = 1000;   // 10%

        borrowIndex = PRECISION;
        supplyIndex = PRECISION;
        lastAccrualTime = block.timestamp;
    }

    /* ============================================================ */
    /*                    CORE FUNCTIONS                            */
    /* ============================================================ */

    /**
     * @notice Supply (lend) assets to the pool. Earn interest.
     * @param amount Amount to supply
     */
    function supply(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Pool: zero amount");

        _accrueInterest();

        // Settle any existing balance at current index
        if (userSupplyPrincipal[msg.sender] > 0) {
            userSupplyPrincipal[msg.sender] = currentSupplyBalance(msg.sender);
        }

        asset.safeTransferFrom(msg.sender, address(this), amount);

        userSupplyPrincipal[msg.sender] += amount;
        userSupplyIndex[msg.sender] = supplyIndex;
        totalSupplied += amount;

        emit Supplied(msg.sender, amount, userSupplyPrincipal[msg.sender], block.timestamp);
    }

    /**
     * @notice Withdraw supplied assets + earned interest.
     * @param amount Amount to withdraw (use type(uint256).max for full balance)
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        _accrueInterest();

        uint256 balance = currentSupplyBalance(msg.sender);
        if (amount == type(uint256).max) {
            amount = balance;
        }
        require(amount > 0, "Pool: zero amount");
        require(amount <= balance, "Pool: insufficient balance");

        // Check pool liquidity
        uint256 available = asset.balanceOf(address(this));
        require(amount <= available, "Pool: insufficient liquidity");

        userSupplyPrincipal[msg.sender] = balance - amount;
        userSupplyIndex[msg.sender] = supplyIndex;
        totalSupplied = totalSupplied > amount ? totalSupplied - amount : 0;

        asset.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, userSupplyPrincipal[msg.sender], block.timestamp);
    }

    /**
     * @notice Borrow assets from the pool.
     * @param amount Amount to borrow
     * @dev In production, CollateralManager checks health factor before allowing borrow.
     *      This function expects external authorization.
     */
    function borrow(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Pool: zero amount");

        _accrueInterest();

        // Check available liquidity
        uint256 available = asset.balanceOf(address(this));
        require(amount <= available, "Pool: insufficient liquidity");

        // Settle existing borrow
        if (userBorrowPrincipal[msg.sender] > 0) {
            userBorrowPrincipal[msg.sender] = currentBorrowBalance(msg.sender);
        }

        userBorrowPrincipal[msg.sender] += amount;
        userBorrowIndex[msg.sender] = borrowIndex;
        totalBorrowed += amount;

        asset.safeTransfer(msg.sender, amount);

        emit Borrowed(msg.sender, amount, userBorrowPrincipal[msg.sender], block.timestamp);
    }

    /**
     * @notice Repay borrowed assets + interest.
     * @param amount Amount to repay (use type(uint256).max for full repayment)
     */
    function repay(uint256 amount) external nonReentrant whenNotPaused {
        _accrueInterest();

        uint256 owed = currentBorrowBalance(msg.sender);
        require(owed > 0, "Pool: no borrow");

        if (amount == type(uint256).max) {
            amount = owed;
        }
        if (amount > owed) {
            amount = owed;
        }

        asset.safeTransferFrom(msg.sender, address(this), amount);

        userBorrowPrincipal[msg.sender] = owed - amount;
        userBorrowIndex[msg.sender] = borrowIndex;
        totalBorrowed = totalBorrowed > amount ? totalBorrowed - amount : 0;

        emit Repaid(msg.sender, amount, userBorrowPrincipal[msg.sender], block.timestamp);
    }

    /* ============================================================ */
    /*                    INTEREST RATE MODEL                       */
    /* ============================================================ */

    /**
     * @notice Current utilization rate (BPS)
     */
    function utilizationRate() public view returns (uint256) {
        if (totalSupplied == 0) return 0;
        return (totalBorrowed * BPS) / totalSupplied;
    }

    /**
     * @notice Current borrow rate per second (ray)
     */
    function borrowRatePerSecond() public view returns (uint256) {
        uint256 util = utilizationRate();

        if (util <= optimalUtilization) {
            // Below kink: base + slope1 * (util / optimal)
            return baseRatePerSecond + (slope1PerSecond * util) / optimalUtilization;
        } else {
            // Above kink: base + slope1 + slope2 * (util - optimal) / (1 - optimal)
            uint256 normalRate = baseRatePerSecond + slope1PerSecond;
            uint256 excessUtil = util - optimalUtilization;
            uint256 excessMax = BPS - optimalUtilization;
            return normalRate + (slope2PerSecond * excessUtil) / excessMax;
        }
    }

    /**
     * @notice Current borrow APR (in BPS for readability)
     */
    function borrowAPR() external view returns (uint256) {
        return (borrowRatePerSecond() * SECONDS_PER_YEAR * BPS) / PRECISION;
    }

    /**
     * @notice Current supply APR (in BPS)
     */
    function supplyAPR() external view returns (uint256) {
        uint256 bRate = borrowRatePerSecond();
        uint256 util = utilizationRate();
        uint256 reserveCut = reserveFactorBps;
        // Supply rate = borrow rate * utilization * (1 - reserve factor)
        uint256 sRate = (bRate * util * (BPS - reserveCut)) / (BPS * BPS);
        return (sRate * SECONDS_PER_YEAR * BPS) / PRECISION;
    }

    /* ============================================================ */
    /*                    BALANCE VIEWS                             */
    /* ============================================================ */

    /**
     * @notice Current supply balance including accrued interest
     */
    function currentSupplyBalance(address user) public view returns (uint256) {
        if (userSupplyPrincipal[user] == 0) return 0;
        return (userSupplyPrincipal[user] * supplyIndex) / userSupplyIndex[user];
    }

    /**
     * @notice Current borrow balance including accrued interest
     */
    function currentBorrowBalance(address user) public view returns (uint256) {
        if (userBorrowPrincipal[user] == 0) return 0;
        return (userBorrowPrincipal[user] * borrowIndex) / userBorrowIndex[user];
    }

    /**
     * @notice Get user's full position
     */
    function userPosition(address user) external view returns (
        uint256 supplied,
        uint256 borrowed,
        uint256 supplyInterest,
        uint256 borrowInterest
    ) {
        supplied = currentSupplyBalance(user);
        borrowed = currentBorrowBalance(user);
        supplyInterest = supplied > userSupplyPrincipal[user]
            ? supplied - userSupplyPrincipal[user] : 0;
        borrowInterest = borrowed > userBorrowPrincipal[user]
            ? borrowed - userBorrowPrincipal[user] : 0;
    }

    /* ============================================================ */
    /*                    RESERVE MANAGEMENT                        */
    /* ============================================================ */

    /**
     * @notice Collect accrued reserves to protocol treasury
     */
    function collectReserves() external {
        require(totalReserves > 0, "Pool: no reserves");

        uint256 available = asset.balanceOf(address(this));
        uint256 toCollect = totalReserves > available ? available : totalReserves;

        totalReserves -= toCollect;
        asset.safeTransfer(treasury, toCollect);

        emit ReservesCollected(toCollect, treasury, block.timestamp);
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Pool: zero treasury");
        treasury = _treasury;
    }

    function setReserveFactor(uint256 _newFactorBps) external onlyOwner {
        require(_newFactorBps <= 5000, "Pool: max 50%");
        reserveFactorBps = _newFactorBps;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /* ============================================================ */
    /*                    INTERNAL                                  */
    /* ============================================================ */

    /**
     * @dev Accrue interest to borrow and supply indices.
     *      Called before any state-changing operation.
     */
    function _accrueInterest() internal {
        uint256 elapsed = block.timestamp - lastAccrualTime;
        if (elapsed == 0) return;

        lastAccrualTime = block.timestamp;

        if (totalBorrowed == 0) return;

        uint256 borrowRate = borrowRatePerSecond();
        uint256 interestFactor = borrowRate * elapsed;

        // Interest accrued on borrows
        uint256 interestAccrued = (totalBorrowed * interestFactor) / PRECISION;

        // Reserve cut
        uint256 reserveAmount = (interestAccrued * reserveFactorBps) / BPS;
        uint256 supplierInterest = interestAccrued - reserveAmount;

        // Update indices
        if (totalBorrowed > 0) {
            borrowIndex += (borrowIndex * interestFactor) / PRECISION;
        }
        if (totalSupplied > 0) {
            supplyIndex += (supplyIndex * supplierInterest) / (totalSupplied);
        }

        totalBorrowed += interestAccrued;
        totalReserves += reserveAmount;

        uint256 util = utilizationRate();
        emit InterestAccrued(borrowRate, 0, util, block.timestamp);
    }
}
