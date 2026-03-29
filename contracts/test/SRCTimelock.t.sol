// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {SRCTimelock} from "../src/SRCTimelock.sol";

contract SRCTimelockTest is Test {
    SRCTimelock public timelock;

    address public admin = address(0x1);
    address public governor = address(0x10);
    address public executor = address(0); // Anyone

    function setUp() public {
        address[] memory proposers = new address[](1);
        proposers[0] = governor;

        address[] memory executors = new address[](1);
        executors[0] = address(0); // Open execution

        timelock = new SRCTimelock(proposers, executors, admin);
    }

    /* ============================================================ */
    /*                    CONFIG TESTS                              */
    /* ============================================================ */

    function test_DefaultMinDelay() public view {
        assertEq(timelock.getMinDelay(), 1 days); // 24 hours
    }

    function test_DefaultMinDelayConstant() public view {
        assertEq(timelock.DEFAULT_MIN_DELAY(), 1 days);
    }

    function test_GovernorIsProposer() public view {
        assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), governor));
    }

    function test_AnyoneCanExecute() public view {
        // address(0) means open role — anyone can execute
        assertTrue(timelock.hasRole(timelock.EXECUTOR_ROLE(), address(0)));
    }

    function test_AdminHasRole() public view {
        assertTrue(timelock.hasRole(timelock.DEFAULT_ADMIN_ROLE(), admin));
    }

    /* ============================================================ */
    /*                    SCHEDULING TESTS                          */
    /* ============================================================ */

    function test_ScheduleOperation() public {
        bytes32 id = timelock.hashOperation(
            address(0xDEAD), 0, "", bytes32(0), bytes32(0)
        );

        vm.prank(governor);
        timelock.schedule(
            address(0xDEAD), 0, "", bytes32(0), bytes32(0), 1 days
        );

        assertTrue(timelock.isOperationPending(id));
    }

    function test_NonProposerCannotSchedule() public {
        vm.prank(address(0x99));
        vm.expectRevert();
        timelock.schedule(
            address(0xDEAD), 0, "", bytes32(0), bytes32(0), 1 days
        );
    }

    function test_ExecuteAfterDelay() public {
        vm.prank(governor);
        timelock.schedule(
            address(0xDEAD), 0, "", bytes32(0), bytes32(0), 1 days
        );

        // Cannot execute before delay
        bytes32 id = timelock.hashOperation(
            address(0xDEAD), 0, "", bytes32(0), bytes32(0)
        );
        assertFalse(timelock.isOperationReady(id));

        // Advance past delay
        vm.warp(block.timestamp + 1 days + 1);
        assertTrue(timelock.isOperationReady(id));
    }

    function test_CannotExecuteBeforeDelay() public {
        vm.prank(governor);
        timelock.schedule(
            address(0xDEAD), 0, "", bytes32(0), bytes32(0), 1 days
        );

        vm.expectRevert();
        timelock.execute(address(0xDEAD), 0, "", bytes32(0), bytes32(0));
    }
}
