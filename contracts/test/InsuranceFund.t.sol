// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {InsuranceFund} from "../src/InsuranceFund.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC (6 decimals)
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract InsuranceFundTest is Test {
    InsuranceFund public fund;
    MockUSDC public usdc;

    address public owner = address(0x1);
    address public vaultAddr = address(0x10);
    address public callerAddr = address(0x20);
    address public depositor = address(0x30);

    uint256 constant PEAK_NAV = 1_000_000 * 1e6; // $1M

    function setUp() public {
        usdc = new MockUSDC();

        vm.prank(owner);
        fund = new InsuranceFund(
            address(usdc),
            500,        // 5% target size
            1500,       // 15% drawdown trigger
            PEAK_NAV,   // $1M initial peak NAV
            owner
        );

        // Authorize caller
        vm.prank(owner);
        fund.authorizeCaller(callerAddr, true);

        // Fund depositor
        usdc.mint(depositor, 10_000_000 * 1e6);
        vm.prank(depositor);
        usdc.approve(address(fund), type(uint256).max);

        // Deposit $50K into insurance fund (5% of $1M)
        vm.prank(depositor);
        fund.deposit(50_000 * 1e6);
    }

    /* ============================================================ */
    /*                    DEPOSIT TESTS                             */
    /* ============================================================ */

    function test_Deposit() public view {
        assertEq(fund.fundBalance(), 50_000 * 1e6);
        assertEq(fund.totalDeposited(), 50_000 * 1e6);
    }

    function test_DepositZeroReverts() public {
        vm.prank(depositor);
        vm.expectRevert("IF: zero amount");
        fund.deposit(0);
    }

    /* ============================================================ */
    /*                    DRAWDOWN COVERAGE TESTS                   */
    /* ============================================================ */

    function test_DrawdownTriggered() public {
        // NAV drops from $1M to $800K (20% drawdown > 15% trigger)
        uint256 currentNAV = 800_000 * 1e6;

        vm.prank(callerAddr);
        uint256 payout = fund.checkAndCoverDrawdown(currentNAV, vaultAddr);

        // Trigger level = $1M * (10000 - 1500) / 10000 = $850K
        // Payout = $850K - $800K = $50K
        assertEq(payout, 50_000 * 1e6);
        assertEq(usdc.balanceOf(vaultAddr), 50_000 * 1e6);
        assertTrue(fund.needsRefill());
        assertEq(fund.refillDeficit(), 50_000 * 1e6);
    }

    function test_NoDrawdownAtNewPeak() public {
        // NAV goes up to $1.1M — no drawdown
        uint256 currentNAV = 1_100_000 * 1e6;

        vm.prank(callerAddr);
        uint256 payout = fund.checkAndCoverDrawdown(currentNAV, vaultAddr);

        assertEq(payout, 0);
        assertEq(fund.peakNAV(), currentNAV); // Peak updated
    }

    function test_NoDrawdownBelowTrigger() public {
        // NAV drops only 10% ($900K) — below 15% trigger
        uint256 currentNAV = 900_000 * 1e6;

        vm.prank(callerAddr);
        uint256 payout = fund.checkAndCoverDrawdown(currentNAV, vaultAddr);

        assertEq(payout, 0);
    }

    /* ============================================================ */
    /*                    REFILL LOGIC TESTS                        */
    /* ============================================================ */

    function test_RefillOnDeposit() public {
        // Trigger a drawdown first
        uint256 currentNAV = 800_000 * 1e6;
        vm.prank(callerAddr);
        fund.checkAndCoverDrawdown(currentNAV, vaultAddr);

        assertTrue(fund.needsRefill());
        uint256 deficit = fund.refillDeficit();

        // Refill the deficit
        vm.prank(depositor);
        fund.deposit(deficit);

        assertFalse(fund.needsRefill());
        assertEq(fund.refillDeficit(), 0);
    }

    /* ============================================================ */
    /*                    FUNDING STATUS TESTS                      */
    /* ============================================================ */

    function test_FundingStatus() public view {
        // 5% of $1M AUM = $50K target
        (uint256 target, uint256 current, bool funded) = fund.fundingStatus(1_000_000 * 1e6);

        assertEq(target, 50_000 * 1e6);
        assertEq(current, 50_000 * 1e6);
        assertTrue(funded);
    }

    function test_FundingStatusUnderfunded() public view {
        // 5% of $2M AUM = $100K target, but only $50K in fund
        (uint256 target, uint256 current, bool funded) = fund.fundingStatus(2_000_000 * 1e6);

        assertEq(target, 100_000 * 1e6);
        assertEq(current, 50_000 * 1e6);
        assertFalse(funded);
    }

    /* ============================================================ */
    /*                    EMERGENCY TESTS                           */
    /* ============================================================ */

    function test_EmergencyPayout() public {
        address dest = address(0x60);
        vm.prank(owner);
        fund.emergencyPayout(10_000 * 1e6, dest, "Critical issue");

        assertEq(usdc.balanceOf(dest), 10_000 * 1e6);
        assertTrue(fund.needsRefill());
    }

    function test_EmergencyOnlyOwner() public {
        vm.prank(address(0x99));
        vm.expectRevert();
        fund.emergencyPayout(1_000 * 1e6, address(0x60), "Not owner");
    }

    /* ============================================================ */
    /*                    VIEW TESTS                                */
    /* ============================================================ */

    function test_FundSummary() public view {
        (
            uint256 balance, uint256 deposited, uint256 paidOut,
            uint256 drawdowns, uint256 emergencies,
            uint256 peak, uint256 targetBps, uint256 triggerBps,
            bool needsRefillVal, uint256 deficit
        ) = fund.fundSummary();

        assertEq(balance, 50_000 * 1e6);
        assertEq(deposited, 50_000 * 1e6);
        assertEq(paidOut, 0);
        assertEq(drawdowns, 0);
        assertEq(emergencies, 0);
        assertEq(peak, PEAK_NAV);
        assertEq(targetBps, 500);
        assertEq(triggerBps, 1500);
        assertFalse(needsRefillVal);
        assertEq(deficit, 0);
    }

    /* ============================================================ */
    /*                    ADMIN TESTS                               */
    /* ============================================================ */

    function test_SetTargetSize() public {
        vm.prank(owner);
        fund.setTargetSize(1000); // 10%

        assertEq(fund.targetSizeBps(), 1000);
    }

    function test_SetDrawdownTrigger() public {
        vm.prank(owner);
        fund.setDrawdownTrigger(2000); // 20%

        assertEq(fund.drawdownTriggerBps(), 2000);
    }

    function test_SetPeakNAV() public {
        vm.prank(owner);
        fund.setPeakNAV(2_000_000 * 1e6);

        assertEq(fund.peakNAV(), 2_000_000 * 1e6);
    }

    function test_RevokeAuthorizedCaller() public {
        vm.prank(owner);
        fund.authorizeCaller(callerAddr, false);

        vm.prank(callerAddr);
        vm.expectRevert("IF: unauthorized");
        fund.checkAndCoverDrawdown(800_000 * 1e6, vaultAddr);
    }

    function test_NonOwnerAdminReverts() public {
        vm.prank(address(0x99));
        vm.expectRevert();
        fund.setTargetSize(1000);

        vm.prank(address(0x99));
        vm.expectRevert();
        fund.setDrawdownTrigger(2000);

        vm.prank(address(0x99));
        vm.expectRevert();
        fund.setPeakNAV(2_000_000 * 1e6);
    }

    /* ============================================================ */
    /*                    CLAIM TRACKING TESTS                      */
    /* ============================================================ */

    function test_ClaimCount() public {
        // Trigger a drawdown claim
        vm.prank(callerAddr);
        fund.checkAndCoverDrawdown(800_000 * 1e6, vaultAddr);

        assertEq(fund.claimCount(), 1);
    }

    function test_GetClaim() public {
        vm.prank(callerAddr);
        fund.checkAndCoverDrawdown(800_000 * 1e6, vaultAddr);

        InsuranceFund.Claim memory c = fund.getClaim(0);
        assertEq(c.amount, 50_000 * 1e6);
        assertEq(c.navAtClaim, 800_000 * 1e6);
    }

    function test_GetClaimOutOfBounds() public {
        vm.expectRevert("IF: invalid index");
        fund.getClaim(99);
    }

    /* ============================================================ */
    /*                    REFILL STATUS VIEW                        */
    /* ============================================================ */

    function test_CheckRefillNeeded() public {
        (bool needed, uint256 deficit) = fund.checkRefillNeeded();
        assertFalse(needed);
        assertEq(deficit, 0);

        // Trigger drawdown
        vm.prank(callerAddr);
        fund.checkAndCoverDrawdown(800_000 * 1e6, vaultAddr);

        (needed, deficit) = fund.checkRefillNeeded();
        assertTrue(needed);
        assertGt(deficit, 0);
    }

    /* ============================================================ */
    /*                    EDGE CASES                                */
    /* ============================================================ */

    function test_EmergencyPayoutExceedsBalance() public {
        vm.prank(owner);
        vm.expectRevert("IF: insufficient funds");
        fund.emergencyPayout(999_000_000 * 1e6, address(0x60), "Too much");
    }
}

