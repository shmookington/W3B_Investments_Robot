// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {FeeCollector} from "../src/FeeCollector.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC (6 decimals)
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract FeeCollectorTest is Test {
    FeeCollector public fc;
    MockUSDC public usdc;

    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public reporter = address(0x10);
    address public reporter2 = address(0x11);

    uint256 constant INITIAL_HWM = 1_000_000 * 1e6; // $1M initial NAV

    function setUp() public {
        usdc = new MockUSDC();

        vm.prank(owner);
        fc = new FeeCollector(
            address(usdc),
            treasury,
            2000,          // 20% performance fee
            100,           // 1% management fee
            INITIAL_HWM,
            owner
        );

        // Authorize reporter
        vm.prank(owner);
        fc.authorizeReporter(reporter, true);

        // Fund reporter with USDC
        usdc.mint(reporter, 100_000_000 * 1e6); // $100M
        vm.prank(reporter);
        usdc.approve(address(fc), type(uint256).max);
    }

    /* ============================================================ */
    /*                    PERFORMANCE FEE TESTS                     */
    /* ============================================================ */

    function test_CollectPerformanceFee() public {
        // NAV grew from $1M to $1.1M → $100K profit → 20% = $20K fee
        uint256 newNAV = 1_100_000 * 1e6;
        uint256 profit = 100_000 * 1e6;

        vm.prank(reporter);
        fc.collectPerformanceFee(newNAV, profit);

        uint256 expectedFee = (profit * 2000) / 10_000; // 20% of $100K = $20K
        assertEq(fc.totalPerformanceFees(), expectedFee);
        assertEq(fc.totalCollected(), expectedFee);
        assertEq(fc.pendingFees(), expectedFee);
        assertEq(fc.highWaterMark(), newNAV);
    }

    function test_PerformanceFeeOnlyOnNewProfits() public {
        // NAV below HWM should revert
        uint256 belowHWM = 900_000 * 1e6;
        vm.prank(reporter);
        vm.expectRevert("FC: NAV below HWM");
        fc.collectPerformanceFee(belowHWM, 50_000 * 1e6);
    }

    function test_PerformanceFeeExceedsExcessReverts() public {
        // NAV = $1.05M, excess = $50K, but trying to claim $100K profit
        uint256 newNAV = 1_050_000 * 1e6;
        vm.prank(reporter);
        vm.expectRevert("FC: profit exceeds HWM excess");
        fc.collectPerformanceFee(newNAV, 100_000 * 1e6);
    }

    /* ============================================================ */
    /*                    MANAGEMENT FEE TESTS                      */
    /* ============================================================ */

    function test_CollectManagementFee() public {
        // Warp 30 days
        vm.warp(block.timestamp + 30 days);

        uint256 aum = 1_000_000 * 1e6; // $1M AUM
        vm.prank(reporter);
        fc.collectManagementFee(aum);

        // 1% annual on $1M for 30 days ≈ $821.91
        assertGt(fc.totalManagementFees(), 0);
        assertGt(fc.totalCollected(), 0);
    }

    function test_ManagementFeeTooEarlyReverts() public {
        uint256 aum = 1_000_000 * 1e6;
        vm.prank(reporter);
        vm.expectRevert("FC: too early");
        fc.collectManagementFee(aum);
    }

    /* ============================================================ */
    /*                    DISTRIBUTION TESTS                        */
    /* ============================================================ */

    function test_DistributeFees() public {
        // Collect performance fee
        uint256 newNAV = 1_100_000 * 1e6;
        uint256 profit = 100_000 * 1e6;

        vm.prank(reporter);
        fc.collectPerformanceFee(newNAV, profit);

        uint256 pending = fc.pendingFees();
        assertGt(pending, 0);

        // Distribute
        fc.distributeFees();

        assertEq(usdc.balanceOf(treasury), pending);
        assertEq(fc.pendingFees(), 0);
        assertEq(fc.totalDistributed(), pending);
    }

    function test_DistributeNothingReverts() public {
        vm.expectRevert("FC: nothing to distribute");
        fc.distributeFees();
    }

    /* ============================================================ */
    /*                    VIEW FUNCTION TESTS                       */
    /* ============================================================ */

    function test_PendingPerformanceFee() public view {
        // NAV at $1.2M with HWM at $1M → $200K profit → 20% = $40K
        uint256 pending = fc.pendingPerformanceFee(1_200_000 * 1e6);
        assertEq(pending, 40_000 * 1e6);
    }

    function test_PendingPerformanceFeeZeroBelowHWM() public view {
        uint256 pending = fc.pendingPerformanceFee(900_000 * 1e6);
        assertEq(pending, 0);
    }

    function test_FeeSummary() public {
        // Collect a performance fee
        uint256 newNAV = 1_100_000 * 1e6;
        uint256 profit = 100_000 * 1e6;

        vm.prank(reporter);
        fc.collectPerformanceFee(newNAV, profit);

        (
            uint256 totalCollected,
            ,
            uint256 pendingFees,
            uint256 performanceFees,
            ,
            uint256 perfBps,
            ,
            uint256 hwm,
            bool mgmtActive
        ) = fc.feeSummary();

        assertEq(totalCollected, 20_000 * 1e6);
        assertEq(pendingFees, 20_000 * 1e6);
        assertEq(performanceFees, 20_000 * 1e6);
        assertEq(perfBps, 2000);
        assertEq(hwm, newNAV);
        assertTrue(mgmtActive);
    }

    /* ============================================================ */
    /*                    UNAUTHORIZED TESTS                        */
    /* ============================================================ */

    function test_UnauthorizedPerformanceFeeReverts() public {
        usdc.mint(reporter2, 1_000_000 * 1e6);
        vm.prank(reporter2);
        usdc.approve(address(fc), type(uint256).max);

        vm.prank(reporter2);
        vm.expectRevert("FC: unauthorized");
        fc.collectPerformanceFee(1_100_000 * 1e6, 100_000 * 1e6);
    }

    /* ============================================================ */
    /*                    ADMIN TESTS                               */
    /* ============================================================ */

    function test_SetPerformanceFee() public {
        vm.prank(owner);
        fc.setPerformanceFee(1500); // 15%

        assertEq(fc.performanceFeeBps(), 1500);
    }

    function test_SetPerformanceFeeTooHighReverts() public {
        vm.prank(owner);
        vm.expectRevert("FC: too high");
        fc.setPerformanceFee(6000); // 60% > max 50%
    }

    function test_SetManagementFee() public {
        vm.prank(owner);
        fc.setManagementFee(200); // 2%

        assertEq(fc.managementFeeBps(), 200);
    }

    function test_DisableManagementFee() public {
        vm.prank(owner);
        fc.setManagementFee(0);

        assertFalse(fc.managementFeeActive());
    }

    /* ============================================================ */
    /*                    ADMIN TESTS (expanded)                    */
    /* ============================================================ */

    function test_SetTreasury() public {
        address newTreasury = address(0x77);
        vm.prank(owner);
        fc.setTreasury(newTreasury);

        assertEq(fc.treasury(), newTreasury);
    }

    function test_SetTreasuryZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert("FC: zero");
        fc.setTreasury(address(0));
    }

    function test_SetHighWaterMark() public {
        vm.prank(owner);
        fc.setHighWaterMark(2_000_000 * 1e6);

        assertEq(fc.highWaterMark(), 2_000_000 * 1e6);
    }

    function test_PendingManagementFee() public {
        vm.warp(block.timestamp + 30 days);

        uint256 pending = fc.pendingManagementFee(1_000_000 * 1e6);
        assertGt(pending, 0);
    }

    function test_PendingManagementFeeDisabled() public {
        vm.prank(owner);
        fc.setManagementFee(0);

        vm.warp(block.timestamp + 30 days);

        uint256 pending = fc.pendingManagementFee(1_000_000 * 1e6);
        assertEq(pending, 0);
    }

    function test_ManagementFeeTooHighReverts() public {
        vm.prank(owner);
        vm.expectRevert("FC: too high");
        fc.setManagementFee(500); // 5% > max 2%
    }

    function test_NonOwnerAdminReverts() public {
        vm.prank(address(0x99));
        vm.expectRevert();
        fc.setPerformanceFee(1500);

        vm.prank(address(0x99));
        vm.expectRevert();
        fc.setTreasury(address(0x77));
    }

    function test_AuthorizeReporter() public {
        address newReporter = address(0xCC);
        vm.prank(owner);
        fc.authorizeReporter(newReporter, true);

        assertTrue(fc.authorizedReporters(newReporter));

        vm.prank(owner);
        fc.authorizeReporter(newReporter, false);

        assertFalse(fc.authorizedReporters(newReporter));
    }
}

