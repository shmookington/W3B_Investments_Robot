// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {SelfRepayingVault} from "../src/SelfRepayingVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

/// @dev Mock yield-bearing token (stETH-like)
contract MockStETH is ERC20 {
    uint256 public exchangeRate = 1e18; // 1:1 initially

    constructor() ERC20("Staked Ether", "stETH") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }

    function getShareValue(uint256 shares) external view returns (uint256) {
        return (shares * exchangeRate) / 1e18;
    }

    function simulateYield(uint256 bps) external {
        exchangeRate = exchangeRate * (10_000 + bps) / 10_000;
    }
}

contract SelfRepayingVaultTest is Test {
    SelfRepayingVault public vault;
    MockUSDC public usdc;
    MockStETH public steth;

    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public alice = address(0x10);
    address public keeper = address(0x20);

    uint256 constant STETH_PRICE = 3000 * 1e18; // $3,000
    uint256 constant USDC_PRICE = 1e18;          // $1

    function setUp() public {
        usdc = new MockUSDC();
        steth = new MockStETH();

        vm.prank(owner);
        vault = new SelfRepayingVault(
            address(steth), address(usdc), treasury,
            STETH_PRICE, USDC_PRICE, owner
        );

        // Fund Alice with stETH
        steth.mint(alice, 100 ether);
        vm.prank(alice);
        steth.approve(address(vault), type(uint256).max);

        // Fund vault with USDC for lending (18-decimal scale to match borrow values)
        usdc.mint(address(vault), 10_000_000 * 1e18);

        // Fund Alice with USDC for manual repay
        usdc.mint(alice, 1_000_000 * 1e18);
        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
    }

    /* ============================================================ */
    /*                    DEPOSIT TESTS                             */
    /* ============================================================ */

    function test_Deposit() public {
        vm.prank(alice);
        vault.deposit(10 ether); // 10 stETH = $30,000

        (uint256 depositAmt, uint256 depositVal, , , , , , bool active) = vault.getPosition(alice);
        assertEq(depositAmt, 10 ether);
        assertEq(depositVal, 30_000 * 1e18);
        assertTrue(active);
    }

    function test_DepositZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert("SRV: zero amount");
        vault.deposit(0);
    }

    /* ============================================================ */
    /*                    BORROW TESTS                              */
    /* ============================================================ */

    function test_Borrow() public {
        vm.prank(alice);
        vault.deposit(10 ether); // $30K deposit

        vm.prank(alice);
        vault.borrow(10_000 * 1e18); // Borrow $10K (< $15K max)

        (, , uint256 borrowAmt, , , , , ) = vault.getPosition(alice);
        assertEq(borrowAmt, 10_000 * 1e18);
    }

    function test_MaxBorrow50Percent() public {
        vm.prank(alice);
        vault.deposit(10 ether); // $30K → max borrow $15K

        uint256 maxBorr = vault.maxBorrow(alice);
        assertEq(maxBorr, 15_000 * 1e18);
    }

    function test_BorrowExceedsMaxReverts() public {
        vm.prank(alice);
        vault.deposit(10 ether); // $30K → max $15K

        vm.prank(alice);
        vm.expectRevert("SRV: exceeds max borrow");
        vault.borrow(16_000 * 1e18);
    }

    function test_BorrowNoPositionReverts() public {
        vm.prank(alice);
        vm.expectRevert("SRV: no position");
        vault.borrow(1000 * 1e18);
    }

    /* ============================================================ */
    /*                    AUTO-REPAY TESTS                          */
    /* ============================================================ */

    function test_YieldAutoRepay() public {
        vm.prank(alice);
        vault.deposit(10 ether);
        vm.prank(alice);
        vault.borrow(10_000 * 1e18);

        // Fast forward 6 months
        vm.warp(block.timestamp + 180 days);

        (, , uint256 borrowBefore, , , , , ) = vault.getPosition(alice);

        vault.harvestAndRepay(alice);

        (, , uint256 borrowAfter, , , , , ) = vault.getPosition(alice);
        assertLt(borrowAfter, borrowBefore);
    }

    function test_YieldAutoRepayReducesLoan() public {
        vm.prank(alice);
        vault.deposit(10 ether);
        vm.prank(alice);
        vault.borrow(1_000 * 1e18); // Small loan

        // Fast forward 1 year — should generate enough yield to repay
        vm.warp(block.timestamp + 365 days);

        vault.harvestAndRepay(alice);

        (, , uint256 remaining, uint256 totalRepaid, , , , ) = vault.getPosition(alice);
        assertGt(totalRepaid, 0);
    }

    function test_AnyoneCanHarvest() public {
        vm.prank(alice);
        vault.deposit(10 ether);
        vm.prank(alice);
        vault.borrow(1_000 * 1e18);

        vm.warp(block.timestamp + 30 days);

        // Keeper (anyone) can trigger harvest
        vm.prank(keeper);
        vault.harvestAndRepay(alice);

        assertGt(vault.totalYieldRepaid(), 0);
    }

    /* ============================================================ */
    /*                    PROTOCOL FEE TESTS                        */
    /* ============================================================ */

    function test_ProtocolFeeCollected() public {
        vm.prank(alice);
        vault.deposit(10 ether);
        vm.prank(alice);
        vault.borrow(5_000 * 1e18);

        vm.warp(block.timestamp + 180 days);

        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vault.harvestAndRepay(alice);

        assertGt(usdc.balanceOf(treasury), treasuryBefore);
        assertGt(vault.totalFeesCollected(), 0);
    }

    /* ============================================================ */
    /*                    MANUAL REPAY TESTS                        */
    /* ============================================================ */

    function test_ManualRepay() public {
        vm.prank(alice);
        vault.deposit(10 ether);
        vm.prank(alice);
        vault.borrow(5_000 * 1e18);

        // Manual repay half — need USDC at 18 decimal scale
        usdc.mint(alice, 5_000 * 1e18);
        vm.prank(alice);
        vault.manualRepay(2_500 * 1e18);

        (, , uint256 remaining, , , , , ) = vault.getPosition(alice);
        assertEq(remaining, 2_500 * 1e18);
    }

    function test_ManualRepayFull() public {
        vm.prank(alice);
        vault.deposit(10 ether);
        vm.prank(alice);
        vault.borrow(5_000 * 1e18);

        usdc.mint(alice, 5_000 * 1e18);
        vm.prank(alice);
        vault.manualRepay(type(uint256).max);

        (, , uint256 remaining, , , , , ) = vault.getPosition(alice);
        assertEq(remaining, 0);
    }

    /* ============================================================ */
    /*                    WITHDRAWAL TESTS                          */
    /* ============================================================ */

    function test_WithdrawNoLoan() public {
        vm.prank(alice);
        vault.deposit(10 ether);

        vm.prank(alice);
        vault.withdrawCollateral(5 ether);

        (uint256 depositAmt, , , , , , , ) = vault.getPosition(alice);
        assertEq(depositAmt, 5 ether);
    }

    function test_WithdrawWouldUndercollateralizeReverts() public {
        vm.prank(alice);
        vault.deposit(10 ether); // $30K
        vm.prank(alice);
        vault.borrow(14_000 * 1e18); // $14K loan

        // Withdrawing 5 ETH → $15K remaining, max borrow = $7.5K < $14K
        vm.prank(alice);
        vm.expectRevert("SRV: would undercollateralize");
        vault.withdrawCollateral(5 ether);
    }

    function test_WithdrawAfterFullRepay() public {
        vm.prank(alice);
        vault.deposit(10 ether);
        vm.prank(alice);
        vault.borrow(5_000 * 1e18);

        // Manually repay full loan
        usdc.mint(alice, 5_000 * 1e18);
        vm.prank(alice);
        vault.manualRepay(type(uint256).max);

        // Now can withdraw all
        vm.prank(alice);
        vault.withdrawCollateral(10 ether);

        (, , , , , , , bool active) = vault.getPosition(alice);
        assertFalse(active);
    }

    /* ============================================================ */
    /*                    REPAYMENT TIME TESTS                      */
    /* ============================================================ */

    function test_EstimatedRepaymentTime() public {
        vm.prank(alice);
        vault.deposit(10 ether); // $30K
        vm.prank(alice);
        vault.borrow(5_000 * 1e18); // $5K loan

        uint256 est = vault.estimatedRepaymentTime(alice);
        assertGt(est, 0);
        // ~4.6 years at 3.6% net yield on $30K deposit to repay $5K
        // 30K * 3.6% = $1,080/year → 5K / 1080 ≈ 4.6 years ≈ 146M seconds
        assertLt(est, 200 * 365 days); // Sanity: less than 200 years
    }

    /* ============================================================ */
    /*                    REMAINING CAPACITY TESTS                  */
    /* ============================================================ */

    function test_RemainingBorrowCapacity() public {
        vm.prank(alice);
        vault.deposit(10 ether); // Max $15K

        vm.prank(alice);
        vault.borrow(5_000 * 1e18);

        uint256 maxBorrowAmt = vault.maxBorrow(alice);
        (, , uint256 borrowAmount, , , , , ) = vault.getPosition(alice);
        uint256 remaining = maxBorrowAmt - borrowAmount;
        assertEq(remaining, 10_000 * 1e18);
    }
}
