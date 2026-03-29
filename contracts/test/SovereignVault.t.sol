// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {SovereignVault} from "../src/SovereignVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC (6 decimals)
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract SovereignVaultTest is Test {
    SovereignVault public vault;
    MockUSDC public usdc;

    address public owner = address(0x1);
    address public operatorAddr = address(0x2);
    address public feeCollector = address(0x3);
    address public alice = address(0x10);
    address public bob = address(0x11);

    uint256 constant USDC = 1e6;

    function setUp() public {
        usdc = new MockUSDC();

        vm.prank(owner);
        vault = new SovereignVault(
            address(usdc),
            owner,
            operatorAddr,
            feeCollector,
            7 // 7-day lock-up
        );

        // Fund users
        usdc.mint(alice, 10_000_000 * USDC);
        usdc.mint(bob, 10_000_000 * USDC);

        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    /* ============================================================ */
    /*                    DEPOSIT TESTS                             */
    /* ============================================================ */

    function test_Deposit() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        assertEq(vault.balanceOf(alice), 1000 * USDC);
        assertEq(vault.currentNAV(), 1000 * USDC);
        assertEq(usdc.balanceOf(address(vault)), 1000 * USDC);
    }

    function test_DepositBelowMinimum() public {
        vm.prank(alice);
        vm.expectRevert("Vault: below minimum deposit");
        vault.deposit(5 * USDC);
    }

    function test_DepositAboveMaximum() public {
        vm.prank(alice);
        vm.expectRevert("Vault: above maximum deposit");
        vault.deposit(2_000_000 * USDC);
    }

    function test_MultipleDepositsTrackNAV() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);
        vm.prank(bob);
        vault.deposit(2000 * USDC);

        assertEq(vault.currentNAV(), 3000 * USDC);
        assertEq(vault.balanceOf(alice), 1000 * USDC);
        assertEq(vault.balanceOf(bob), 2000 * USDC);
    }

    function test_DepositExceedsUserMax() public {
        // maxUserDeposit is 10M, deposit 9M first then try 2M more
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC); // 1M

        // Deposit again to get close
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC); // 2M total

        // Try exceeding (give alice more USDC)
        usdc.mint(alice, 100_000_000 * USDC);
        // Deposit multiple times to approach limit
        for (uint i = 0; i < 8; i++) {
            vm.prank(alice);
            vault.deposit(1_000_000 * USDC);
        }
        // Now at 10M, next deposit should fail
        vm.prank(alice);
        vm.expectRevert("Vault: exceeds user max");
        vault.deposit(100 * USDC);
    }

    /* ============================================================ */
    /*                    SHARE PRICE TESTS                         */
    /* ============================================================ */

    function test_InitialPricePerShare() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        // pricePerShare uses PRECISION (1e18): 1 share = 1 USDC = 1e18
        assertEq(vault.pricePerShare(), 1e18);
    }

    function test_PricePerShareAfterNAVUpdate() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        vm.prank(operatorAddr);
        vault.updateNAV(1_100_000 * USDC);

        // Price per share = 1.1e18 (10% NAV increase)
        assertEq(vault.pricePerShare(), 1.1e18);
    }

    function test_DepositAfterNAVIncrease() public {
        vm.prank(alice);
        vault.deposit(500_000 * USDC);

        vm.prank(operatorAddr);
        vault.updateNAV(550_000 * USDC);

        vm.prank(bob);
        vault.deposit(550_000 * USDC);

        // Bob should have 500K shares
        assertEq(vault.balanceOf(bob), 500_000 * USDC);
    }

    function test_PricePerShareZeroSupply() public view {
        // Before any deposits, returns INITIAL_SHARE_PRICE (1e6)
        assertEq(vault.pricePerShare(), 1e6);
    }

    /* ============================================================ */
    /*                    WITHDRAW TESTS                            */
    /* ============================================================ */

    function test_Withdraw() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        vm.warp(block.timestamp + 8 days);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.withdraw(500 * USDC);

        assertEq(vault.balanceOf(alice), 500 * USDC);
        assertEq(usdc.balanceOf(alice) - balBefore, 500 * USDC);
    }

    function test_WithdrawLockUpActive() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        vm.prank(alice);
        vm.expectRevert("Vault: lock-up active");
        vault.withdraw(500 * USDC);
    }

    function test_WithdrawInsufficientShares() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        vm.warp(block.timestamp + 8 days);

        vm.prank(alice);
        vm.expectRevert("Vault: insufficient shares");
        vault.withdraw(2000 * USDC);
    }

    function test_WithdrawZero() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        vm.warp(block.timestamp + 8 days);

        vm.prank(alice);
        vm.expectRevert("Vault: zero shares");
        vault.withdraw(0);
    }

    function test_WithdrawFullAmount() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        vm.warp(block.timestamp + 8 days);

        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        vault.withdraw(shares);

        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.currentNAV(), 0);
    }

    /* ============================================================ */
    /*                    NAV UPDATE TESTS                          */
    /* ============================================================ */

    function test_UpdateNAV() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        vm.prank(operatorAddr);
        vault.updateNAV(1_050_000 * USDC);

        assertEq(vault.currentNAV(), 1_050_000 * USDC);
        assertEq(vault.navUpdateCount(), 1);
    }

    function test_UpdateNAVNonOperatorReverts() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        vm.prank(alice);
        vm.expectRevert("Vault: not operator");
        vault.updateNAV(1_050_000 * USDC);
    }

    function test_MultipleNAVUpdates() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        vm.prank(operatorAddr);
        vault.updateNAV(1_050_000 * USDC);

        vm.prank(operatorAddr);
        vault.updateNAV(1_100_000 * USDC);

        assertEq(vault.navUpdateCount(), 2);
        assertEq(vault.currentNAV(), 1_100_000 * USDC);
    }

    /* ============================================================ */
    /*                    EMERGENCY WITHDRAW TESTS                  */
    /* ============================================================ */

    function test_EmergencyWithdrawAfterTimelock() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        vm.warp(block.timestamp + 15 days);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.emergencyWithdraw();

        assertEq(vault.balanceOf(alice), 0);
        assertGt(usdc.balanceOf(alice), balBefore);
    }

    function test_EmergencyWithdrawTimelockActive() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        vm.warp(block.timestamp + 7 days);

        vm.prank(alice);
        vm.expectRevert("Vault: emergency timelock active");
        vault.emergencyWithdraw();
    }

    function test_EmergencyWithdrawNoShares() public {
        vm.warp(block.timestamp + 15 days);

        vm.prank(alice);
        vm.expectRevert("Vault: no shares");
        vault.emergencyWithdraw();
    }

    /* ============================================================ */
    /*                    PAUSE TESTS                               */
    /* ============================================================ */

    function test_PauseDeposits() public {
        vm.prank(owner);
        vault.pauseDeposits();

        vm.prank(alice);
        vm.expectRevert("Vault: deposits paused");
        vault.deposit(1000 * USDC);
    }

    function test_UnpauseDeposits() public {
        vm.prank(owner);
        vault.pauseDeposits();

        vm.prank(owner);
        vault.unpauseDeposits();

        vm.prank(alice);
        vault.deposit(1000 * USDC);
        assertGt(vault.balanceOf(alice), 0);
    }

    function test_PauseWithdrawals() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        vm.warp(block.timestamp + 8 days);

        vm.prank(owner);
        vault.pauseWithdrawals();

        vm.prank(alice);
        vm.expectRevert("Vault: withdrawals paused");
        vault.withdraw(500 * USDC);
    }

    function test_UnpauseWithdrawals() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC);

        vm.warp(block.timestamp + 8 days);

        vm.prank(owner);
        vault.pauseWithdrawals();

        vm.prank(owner);
        vault.unpauseWithdrawals();

        vm.prank(alice);
        vault.withdraw(500 * USDC);
        assertEq(vault.balanceOf(alice), 500 * USDC);
    }

    function test_PauseFullState() public {
        vm.prank(owner);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert();
        vault.deposit(1000 * USDC);
    }

    function test_UnpauseFullState() public {
        vm.prank(owner);
        vault.pause();

        vm.prank(owner);
        vault.unpause();

        vm.prank(alice);
        vault.deposit(1000 * USDC);
        assertGt(vault.balanceOf(alice), 0);
    }

    /* ============================================================ */
    /*                    VIEW FUNCTION TESTS                       */
    /* ============================================================ */

    function test_TotalValueLocked() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        assertEq(vault.totalValueLocked(), 1_000_000 * USDC);
    }

    function test_TotalAssets() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        assertEq(vault.totalAssets(), 1_000_000 * USDC);
    }

    function test_TotalDeployedCapital() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        assertEq(vault.totalDeployedCapital(), 0);

        // NAV > vault balance = capital deployed off-chain
        vm.prank(operatorAddr);
        vault.updateNAV(1_500_000 * USDC);

        assertEq(vault.totalDeployedCapital(), 500_000 * USDC);
    }

    function test_TotalDeployedCapitalNAVBelowBalance() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        // NAV drops below vault balance
        vm.prank(operatorAddr);
        vault.updateNAV(500_000 * USDC);

        assertEq(vault.totalDeployedCapital(), 0);
    }

    function test_UserValue() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        assertEq(vault.userValue(alice), 1_000_000 * USDC);

        vm.prank(operatorAddr);
        vault.updateNAV(1_100_000 * USDC);

        assertEq(vault.userValue(alice), 1_100_000 * USDC);
    }

    function test_Decimals() public view {
        assertEq(vault.decimals(), 6);
    }

    function test_VaultStatus() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        (
            uint256 nav, uint256 pps, uint256 totalShares,
            uint256 vaultBal, uint256 deployed,
            uint256 deposited, uint256 withdrawn,
            uint256 lastUpdate, uint256 updateCount,
            bool depPaused, bool withPaused
        ) = vault.vaultStatus();

        assertEq(nav, 1_000_000 * USDC);
        assertGt(pps, 0);
        assertGt(totalShares, 0);
        assertEq(vaultBal, 1_000_000 * USDC);
        assertEq(deployed, 0);
        assertEq(deposited, 1_000_000 * USDC);
        assertEq(withdrawn, 0);
        assertGt(lastUpdate, 0);
        assertEq(updateCount, 0);
        assertFalse(depPaused);
        assertFalse(withPaused);
    }

    function test_GetUserPendingWithdrawals() public {
        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        uint256[] memory pending = vault.getUserPendingWithdrawals(alice);
        assertEq(pending.length, 0);
    }

    /* ============================================================ */
    /*                    ADMIN TESTS                               */
    /* ============================================================ */

    function test_SetOperator() public {
        address newOp = address(0x99);
        vm.prank(owner);
        vault.setOperator(newOp);

        assertEq(vault.operator(), newOp);
    }

    function test_SetOperatorZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert("Vault: zero operator");
        vault.setOperator(address(0));
    }

    function test_SetFeeCollector() public {
        address newFc = address(0x88);
        vm.prank(owner);
        vault.setFeeCollector(newFc);

        assertEq(vault.feeCollector(), newFc);
    }

    function test_SetFeeCollectorZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert("Vault: zero address");
        vault.setFeeCollector(address(0));
    }

    function test_SetLockUpPeriod() public {
        vm.prank(owner);
        vault.setLockUpPeriod(30);

        assertEq(vault.lockUpPeriod(), 30 days);
    }

    function test_SetDepositLimits() public {
        vm.prank(owner);
        vault.setDepositLimits(100 * USDC, 500_000 * USDC, 5_000_000 * USDC);

        assertEq(vault.minDeposit(), 100 * USDC);
        assertEq(vault.maxDeposit(), 500_000 * USDC);
        assertEq(vault.maxUserDeposit(), 5_000_000 * USDC);
    }

    function test_SetDepositLimitsInvalidReverts() public {
        vm.prank(owner);
        vm.expectRevert("Vault: invalid limits");
        vault.setDepositLimits(500 * USDC, 100 * USDC, 5_000_000 * USDC);
    }

    function test_SetEmergencyTimelockDays() public {
        vm.prank(owner);
        vault.setEmergencyTimelockDays(7);

        assertEq(vault.emergencyTimelockDays(), 7);
    }

    function test_NonOwnerAdminReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setOperator(address(0x99));

        vm.prank(alice);
        vm.expectRevert();
        vault.pauseDeposits();

        vm.prank(alice);
        vm.expectRevert();
        vault.pause();
    }

    /* ============================================================ */
    /*                    FUZZ TESTS                                */
    /* ============================================================ */

    function testFuzz_DepositWithdraw(uint256 depositAmt) public {
        depositAmt = bound(depositAmt, vault.minDeposit(), vault.maxDeposit());

        usdc.mint(alice, depositAmt);
        vm.prank(alice);
        vault.deposit(depositAmt);

        uint256 shares = vault.balanceOf(alice);
        assertGt(shares, 0);

        vm.warp(block.timestamp + 8 days);

        vm.prank(alice);
        vault.withdraw(shares);

        assertEq(vault.balanceOf(alice), 0);
    }

    function testFuzz_NAVUpdate(uint256 nav) public {
        nav = bound(nav, 1e6, 100_000_000 * USDC);

        vm.prank(alice);
        vault.deposit(1_000_000 * USDC);

        vm.prank(operatorAddr);
        vault.updateNAV(nav);

        assertEq(vault.currentNAV(), nav);
        assertGt(vault.pricePerShare(), 0);
    }
}
