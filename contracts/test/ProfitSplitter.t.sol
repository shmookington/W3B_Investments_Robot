// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {ProfitSplitter} from "../src/ProfitSplitter.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC (6 decimals)
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract ProfitSplitterTest is Test {
    ProfitSplitter public ps;
    MockUSDC public usdc;

    address public owner = address(0x1);
    address public operations = address(0x2);
    address public sovereign = address(0x3);
    address public team = address(0x4);
    address public caller = address(0x10);

    uint256 constant INITIAL_HWM = 1_000_000 * 1e6; // $1M

    function setUp() public {
        usdc = new MockUSDC();

        vm.prank(owner);
        ps = new ProfitSplitter(
            address(usdc),
            operations,
            sovereign,
            team,
            INITIAL_HWM,
            owner
        );

        // Authorize caller
        vm.prank(owner);
        ps.authorizeCaller(caller, true);

        // Fund caller
        usdc.mint(caller, 10_000_000 * 1e6);
        vm.prank(caller);
        usdc.approve(address(ps), type(uint256).max);
    }

    /* ============================================================ */
    /*                    PROFIT SPLIT TESTS                        */
    /* ============================================================ */

    function test_DistributeProfit() public {
        // NAV grew from $1M to $1.1M → $100K profit
        vm.warp(block.timestamp + 7 days); // Past distribution interval
        vm.prank(caller);
        ps.distributeProfit(1_100_000 * 1e6, 100_000 * 1e6);

        // 50% ops = $50K
        assertEq(usdc.balanceOf(operations), 50_000 * 1e6);
        // 30% sovereign = $30K
        assertEq(usdc.balanceOf(sovereign), 30_000 * 1e6);
        // 20% team = $20K
        assertEq(usdc.balanceOf(team), 20_000 * 1e6);
    }

    function test_HighWaterMarkUpdates() public {
        vm.warp(block.timestamp + 7 days);
        vm.prank(caller);
        ps.distributeProfit(1_100_000 * 1e6, 100_000 * 1e6);

        assertEq(ps.highWaterMark(), 1_100_000 * 1e6);
    }

    function test_OnlySplitsRealizedProfits() public {
        // NAV below HWM → should revert
        vm.warp(block.timestamp + 7 days);
        vm.prank(caller);
        vm.expectRevert("PS: NAV below HWM");
        ps.distributeProfit(900_000 * 1e6, 50_000 * 1e6);
    }

    function test_ProfitExceedsExcessReverts() public {
        // NAV = $1.05M, excess = $50K, trying to split $100K
        vm.warp(block.timestamp + 7 days);
        vm.prank(caller);
        vm.expectRevert("PS: profit exceeds HWM excess");
        ps.distributeProfit(1_050_000 * 1e6, 100_000 * 1e6);
    }

    function test_TooEarlyReverts() public {
        // No time warp — interval not met
        vm.prank(caller);
        vm.expectRevert("PS: too early");
        ps.distributeProfit(1_100_000 * 1e6, 100_000 * 1e6);
    }

    /* ============================================================ */
    /*                    SPLIT STATS TESTS                         */
    /* ============================================================ */

    function test_SplitStats() public {
        vm.warp(block.timestamp + 7 days);
        vm.prank(caller);
        ps.distributeProfit(1_100_000 * 1e6, 100_000 * 1e6);

        assertEq(ps.totalProfitsSplit(), 100_000 * 1e6);
        assertEq(ps.totalToOperations(), 50_000 * 1e6);
        assertEq(ps.totalToSovereign(), 30_000 * 1e6);
        assertEq(ps.totalToTeam(), 20_000 * 1e6);
        assertEq(ps.totalSplits(), 1);
    }

    /* ============================================================ */
    /*                    CONFIGURABLE SPLIT TESTS                  */
    /* ============================================================ */

    function test_CustomSplitConfig() public {
        // Change to 60/25/15
        vm.prank(owner);
        ps.setSplitConfig(6000, 2500, 1500);

        vm.warp(block.timestamp + 7 days);
        vm.prank(caller);
        ps.distributeProfit(1_100_000 * 1e6, 100_000 * 1e6);

        assertEq(usdc.balanceOf(operations), 60_000 * 1e6);
        assertEq(usdc.balanceOf(sovereign), 25_000 * 1e6);
        assertEq(usdc.balanceOf(team), 15_000 * 1e6);
    }

    function test_InvalidSplitSumReverts() public {
        vm.prank(owner);
        vm.expectRevert("PS: must sum to 100%");
        ps.setSplitConfig(5000, 3000, 1000); // Only 90%
    }

    /* ============================================================ */
    /*                    VIEW FUNCTION TESTS                       */
    /* ============================================================ */

    function test_DistributableProfit() public view {
        uint256 distributable = ps.distributableProfit(1_200_000 * 1e6);
        assertEq(distributable, 200_000 * 1e6);
    }

    function test_DistributableProfitBelowHWM() public view {
        uint256 distributable = ps.distributableProfit(900_000 * 1e6);
        assertEq(distributable, 0);
    }

    function test_SplitHistory() public {
        vm.warp(block.timestamp + 7 days);
        vm.prank(caller);
        ps.distributeProfit(1_100_000 * 1e6, 100_000 * 1e6);

        assertEq(ps.splitCount(), 1);

        ProfitSplitter.SplitRecord memory record = ps.getSplit(0);
        assertEq(record.totalProfit, 100_000 * 1e6);
        assertEq(record.toOperations, 50_000 * 1e6);
        assertEq(record.toSovereign, 30_000 * 1e6);
        assertEq(record.toTeam, 20_000 * 1e6);
    }

    function test_Unauthorized() public {
        address rando = address(0x99);
        usdc.mint(rando, 1_000_000 * 1e6);
        vm.prank(rando);
        usdc.approve(address(ps), type(uint256).max);

        vm.warp(block.timestamp + 7 days);
        vm.prank(rando);
        vm.expectRevert("PS: unauthorized");
        ps.distributeProfit(1_100_000 * 1e6, 100_000 * 1e6);
    }

    function test_DefaultSplitConfig() public view {
        (uint256 opsBps, uint256 sovBps, uint256 teamBps) = ps.splitConfig();
        assertEq(opsBps, 5000);
        assertEq(sovBps, 3000);
        assertEq(teamBps, 2000);
    }

    /* ============================================================ */
    /*                    ADMIN TESTS                               */
    /* ============================================================ */

    function test_SetSplitConfig() public {
        vm.prank(owner);
        ps.setSplitConfig(4000, 4000, 2000);

        (uint256 opsBps, uint256 sovBps, uint256 teamBps) = ps.splitConfig();
        assertEq(opsBps, 4000);
        assertEq(sovBps, 4000);
        assertEq(teamBps, 2000);
    }

    function test_SetSplitConfigInvalidReverts() public {
        vm.prank(owner);
        vm.expectRevert("PS: must sum to 100%");
        ps.setSplitConfig(4000, 4000, 3000); // 110%
    }

    function test_SetDestinations() public {
        address newOps = address(0xA0);
        address newSov = address(0xA1);
        address newTeam = address(0xA2);

        vm.prank(owner);
        ps.setDestinations(newOps, newSov, newTeam);

        assertEq(ps.operationsWallet(), newOps);
        assertEq(ps.sovereignReserve(), newSov);
        assertEq(ps.teamWallet(), newTeam);
    }

    function test_SetDistributionInterval() public {
        vm.prank(owner);
        ps.setDistributionInterval(30 days);

        assertEq(ps.distributionInterval(), 30 days);
    }

    function test_SetHighWaterMark() public {
        vm.prank(owner);
        ps.setHighWaterMark(2_000_000 * 1e6);

        assertEq(ps.highWaterMark(), 2_000_000 * 1e6);
    }

    function test_SplitSummary() public view {
        (
            uint256 totalProfit,
            uint256 totalOps,
            uint256 totalSov,
            uint256 totalTeam,
            uint256 splits,
            uint256 hwm,
            uint256 opsBps, uint256 sovBps, uint256 teamBps,
            uint256 lastDist, uint256 nextDist
        ) = ps.splitSummary();

        assertEq(totalProfit, 0);
        assertEq(totalOps, 0);
        assertEq(totalSov, 0);
        assertEq(totalTeam, 0);
        assertEq(splits, 0);
        assertEq(hwm, 1_000_000 * 1e6);
        assertEq(opsBps, 5000);
        assertEq(sovBps, 3000);
        assertEq(teamBps, 2000);
    }

    function test_NonOwnerAdminReverts() public {
        vm.prank(address(0x99));
        vm.expectRevert();
        ps.setSplitConfig(4000, 4000, 2000);

        vm.prank(address(0x99));
        vm.expectRevert();
        ps.setHighWaterMark(2_000_000 * 1e6);
    }

    function test_AuthorizeCaller() public {
        address newCaller = address(0xBB);
        vm.prank(owner);
        ps.authorizeCaller(newCaller, true);

        assertTrue(ps.authorizedCallers(newCaller));

        vm.prank(owner);
        ps.authorizeCaller(newCaller, false);

        assertFalse(ps.authorizedCallers(newCaller));
    }
}

