// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract LendingPoolTest is Test {
    LendingPool public pool;
    MockUSDC public usdc;

    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public lender = address(0x10);
    address public borrower = address(0x11);
    address public lender2 = address(0x12);

    uint256 constant USDC_UNIT = 1e6;

    function setUp() public {
        usdc = new MockUSDC();

        vm.prank(owner);
        pool = new LendingPool(address(usdc), treasury, owner);

        // Fund users
        usdc.mint(lender, 10_000_000 * USDC_UNIT);
        usdc.mint(lender2, 10_000_000 * USDC_UNIT);
        usdc.mint(borrower, 10_000_000 * USDC_UNIT);

        vm.prank(lender);
        usdc.approve(address(pool), type(uint256).max);
        vm.prank(lender2);
        usdc.approve(address(pool), type(uint256).max);
        vm.prank(borrower);
        usdc.approve(address(pool), type(uint256).max);
    }

    /* ============================================================ */
    /*                    SUPPLY TESTS                              */
    /* ============================================================ */

    function test_Supply() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        assertEq(pool.totalSupplied(), 1_000_000 * USDC_UNIT);
        assertEq(pool.currentSupplyBalance(lender), 1_000_000 * USDC_UNIT);
    }

    function test_SupplyZeroReverts() public {
        vm.prank(lender);
        vm.expectRevert("Pool: zero amount");
        pool.supply(0);
    }

    function test_MultipleSuppliers() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);
        vm.prank(lender2);
        pool.supply(500_000 * USDC_UNIT);

        assertEq(pool.totalSupplied(), 1_500_000 * USDC_UNIT);
    }

    /* ============================================================ */
    /*                    BORROW TESTS                              */
    /* ============================================================ */

    function test_Borrow() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        vm.prank(borrower);
        pool.borrow(500_000 * USDC_UNIT);

        assertEq(pool.totalBorrowed(), 500_000 * USDC_UNIT);
        assertEq(pool.currentBorrowBalance(borrower), 500_000 * USDC_UNIT);
        assertEq(usdc.balanceOf(borrower), 10_000_000 * USDC_UNIT + 500_000 * USDC_UNIT);
    }

    function test_BorrowInsufficientLiquidity() public {
        vm.prank(lender);
        pool.supply(100_000 * USDC_UNIT);

        vm.prank(borrower);
        vm.expectRevert("Pool: insufficient liquidity");
        pool.borrow(200_000 * USDC_UNIT);
    }

    /* ============================================================ */
    /*                    REPAY TESTS                               */
    /* ============================================================ */

    function test_Repay() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        vm.prank(borrower);
        pool.borrow(500_000 * USDC_UNIT);

        // Wait for interest
        vm.warp(block.timestamp + 30 days);

        // Trigger accrual via tiny supply
        usdc.mint(lender, 1);
        vm.prank(lender);
        pool.supply(1);

        uint256 owed = pool.currentBorrowBalance(borrower);
        assertGt(owed, 500_000 * USDC_UNIT); // Should owe more due to interest

        vm.prank(borrower);
        pool.repay(type(uint256).max);

        assertEq(pool.currentBorrowBalance(borrower), 0);
    }

    function test_PartialRepay() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        vm.prank(borrower);
        pool.borrow(500_000 * USDC_UNIT);

        vm.prank(borrower);
        pool.repay(200_000 * USDC_UNIT);

        assertApproxEqAbs(pool.currentBorrowBalance(borrower), 300_000 * USDC_UNIT, 1);
    }

    function test_RepayNoDebt() public {
        vm.prank(lender);
        vm.expectRevert("Pool: no borrow");
        pool.repay(100 * USDC_UNIT);
    }

    /* ============================================================ */
    /*                    WITHDRAW TESTS                            */
    /* ============================================================ */

    function test_Withdraw() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        vm.prank(lender);
        pool.withdraw(500_000 * USDC_UNIT);

        assertEq(pool.currentSupplyBalance(lender), 500_000 * USDC_UNIT);
    }

    function test_WithdrawFull() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        vm.prank(lender);
        pool.withdraw(type(uint256).max);

        assertEq(pool.currentSupplyBalance(lender), 0);
    }

    function test_WithdrawInsufficientBalance() public {
        vm.prank(lender);
        pool.supply(100_000 * USDC_UNIT);

        vm.prank(lender);
        vm.expectRevert("Pool: insufficient balance");
        pool.withdraw(200_000 * USDC_UNIT);
    }

    /* ============================================================ */
    /*                    INTEREST RATE MODEL TESTS                 */
    /* ============================================================ */

    function test_UtilizationRate() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        assertEq(pool.utilizationRate(), 0);

        vm.prank(borrower);
        pool.borrow(500_000 * USDC_UNIT);

        assertEq(pool.utilizationRate(), 5000); // 50%
    }

    function test_BorrowRateBelowKink() public view {
        // At 0% utilization: base rate only = 2% APR = 200 BPS
        uint256 apr = pool.borrowAPR();
        assertApproxEqAbs(apr, 200, 1); // 2%, allow ±1 BPS rounding
    }

    function test_BorrowRateAtKink() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);
        vm.prank(borrower);
        pool.borrow(800_000 * USDC_UNIT); // 80% utilization

        uint256 apr = pool.borrowAPR();
        // At kink: 2% + 4% = 6% = 600 BPS
        assertApproxEqAbs(apr, 600, 1);
    }

    function test_BorrowRateAboveKink() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);
        vm.prank(borrower);
        pool.borrow(900_000 * USDC_UNIT); // 90% utilization

        uint256 apr = pool.borrowAPR();
        // Above kink: 2% + 4% + 75% * (90-80)/(100-80) = 6% + 37.5% = 43.5%
        assertApproxEqAbs(apr, 4350, 5);
    }

    /* ============================================================ */
    /*                    INTEREST ACCRUAL TESTS                    */
    /* ============================================================ */

    function test_InterestAccrues() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        vm.prank(borrower);
        pool.borrow(500_000 * USDC_UNIT);

        // Fast forward 1 year
        vm.warp(block.timestamp + 365 days);

        // Trigger accrual via tiny supply
        usdc.mint(lender, 1);
        vm.prank(lender);
        pool.supply(1);

        uint256 borrowBalance = pool.currentBorrowBalance(borrower);
        uint256 supplyBalance = pool.currentSupplyBalance(lender);

        // Borrower should owe more
        assertGt(borrowBalance, 500_000 * USDC_UNIT);

        // Lender should earn interest (less than borrower pays due to reserve factor)
        assertGt(supplyBalance, 1_000_000 * USDC_UNIT);
    }

    function test_ReserveAccumulation() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        vm.prank(borrower);
        pool.borrow(500_000 * USDC_UNIT);

        vm.warp(block.timestamp + 365 days);

        // Trigger accrual by doing a supply
        vm.prank(lender);
        pool.supply(1 * USDC_UNIT);

        assertGt(pool.totalReserves(), 0);
    }

    function test_CollectReserves() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        vm.prank(borrower);
        pool.borrow(500_000 * USDC_UNIT);

        vm.warp(block.timestamp + 365 days);

        // Trigger accrual
        vm.prank(lender);
        pool.supply(1 * USDC_UNIT);

        uint256 reserves = pool.totalReserves();
        assertGt(reserves, 0);

        pool.collectReserves();
        assertGt(usdc.balanceOf(treasury), 0);
    }

    /* ============================================================ */
    /*                    USER POSITION TESTS                       */
    /* ============================================================ */

    function test_UserPosition() public {
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        vm.prank(borrower);
        pool.borrow(500_000 * USDC_UNIT);

        vm.warp(block.timestamp + 365 days);

        // Force accrual using a DIFFERENT user so lender's principal isn't reset
        usdc.mint(lender2, 1);
        vm.prank(lender2);
        pool.supply(1);

        (uint256 supplied, , uint256 supplyInterest, ) = pool.userPosition(lender);
        assertGt(supplied, 1_000_000 * USDC_UNIT);
        assertGt(supplyInterest, 0);

        (, uint256 borrowed, , uint256 borrowInterest) = pool.userPosition(borrower);
        assertGt(borrowed, 500_000 * USDC_UNIT);
        assertGt(borrowInterest, 0);
    }

    /* ============================================================ */
    /*                    PAUSE TESTS                               */
    /* ============================================================ */

    function test_PauseSupply() public {
        vm.prank(owner);
        pool.pause();

        vm.prank(lender);
        vm.expectRevert();
        pool.supply(1000 * USDC_UNIT);
    }

    /* ============================================================ */
    /*                    FUZZ TESTS                                */
    /* ============================================================ */

    function testFuzz_SupplyWithdraw(uint256 supplyAmt) public {
        supplyAmt = bound(supplyAmt, 1 * USDC_UNIT, 1_000_000 * USDC_UNIT);

        usdc.mint(lender, supplyAmt);
        vm.prank(lender);
        pool.supply(supplyAmt);

        assertEq(pool.currentSupplyBalance(lender), supplyAmt);

        vm.prank(lender);
        pool.withdraw(type(uint256).max);

        assertEq(pool.currentSupplyBalance(lender), 0);
    }

    function testFuzz_BorrowRepay(uint256 borrowAmt) public {
        // Setup: lender supplies 1M
        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        borrowAmt = bound(borrowAmt, 1 * USDC_UNIT, 900_000 * USDC_UNIT);

        usdc.mint(borrower, borrowAmt); // Extra for interest

        vm.prank(borrower);
        pool.borrow(borrowAmt);

        assertEq(pool.currentBorrowBalance(borrower), borrowAmt);

        // Fast forward some time
        vm.warp(block.timestamp + 7 days);

        vm.prank(borrower);
        pool.repay(type(uint256).max);

        assertEq(pool.currentBorrowBalance(borrower), 0);
    }

    function testFuzz_UtilizationBelowKink(uint256 borrowPct) public {
        borrowPct = bound(borrowPct, 1, 80);

        vm.prank(lender);
        pool.supply(1_000_000 * USDC_UNIT);

        uint256 borrowAmt = (1_000_000 * USDC_UNIT * borrowPct) / 100;
        vm.prank(borrower);
        pool.borrow(borrowAmt);

        uint256 apr = pool.borrowAPR();
        // Below kink: max 6% = 600 BPS
        assertLe(apr, 601); // Allow 1 BPS rounding
        assertGe(apr, 200); // Min 2% base rate
    }
}
