// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {SRCGovernor} from "../src/SRCGovernor.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @dev Mock SRC token with ERC20Votes
contract MockSRCVotes is ERC20, ERC20Permit, ERC20Votes {
    constructor() ERC20("Sovereign Reserve Coin", "SRC") ERC20Permit("Sovereign Reserve Coin") {}

    function mint(address to, uint256 amount) external { _mint(to, amount); }

    // Required overrides
    function _update(address from, address to, uint256 value)
        internal override(ERC20, ERC20Votes)
    { super._update(from, to, value); }

    function nonces(address owner)
        public view override(ERC20Permit, Nonces)
        returns (uint256)
    { return super.nonces(owner); }
}

contract SRCGovernorTest is Test {
    SRCGovernor public governor;
    TimelockController public timelock;
    MockSRCVotes public srcToken;

    address public owner = address(0x1);
    address public alice = address(0x10);
    address public bob = address(0x11);

    // Proposal args
    address[] targets;
    uint256[] values;
    bytes[] calldatas;

    function setUp() public {
        srcToken = new MockSRCVotes();

        // Setup timelock: 24-hour delay
        address[] memory proposers = new address[](1);
        address[] memory executors = new address[](1);
        proposers[0] = address(0); // Will set governor later
        executors[0] = address(0); // Anyone can execute after timelock

        timelock = new TimelockController(
            1 days,     // 24-hour minimum delay
            proposers,
            executors,
            owner
        );

        governor = new SRCGovernor(srcToken, timelock);

        // Grant governor the proposer role on timelock
        vm.startPrank(owner);
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
        vm.stopPrank();

        // Mint SRC tokens: Alice = 200K, Bob = 100K
        srcToken.mint(alice, 200_000e18);
        srcToken.mint(bob, 100_000e18);

        // Delegate voting power to self
        vm.prank(alice);
        srcToken.delegate(alice);
        vm.prank(bob);
        srcToken.delegate(bob);

        // Advance 1 block so delegation is active
        vm.roll(block.number + 1);
    }

    /* ============================================================ */
    /*                    CONFIG TESTS                              */
    /* ============================================================ */

    function test_GovernorName() public view {
        assertEq(governor.name(), "SRC Governor");
    }

    function test_VotingDelay() public view {
        assertEq(governor.votingDelay(), 7200); // ~1 day
    }

    function test_VotingPeriod() public view {
        assertEq(governor.votingPeriod(), 21600); // ~3 days
    }

    function test_ProposalThreshold() public view {
        assertEq(governor.proposalThreshold(), 100_000e18);
    }

    function test_Quorum() public view {
        // 4% of 300K total supply = 12K
        uint256 q = governor.quorum(block.number - 1);
        assertEq(q, 12_000e18);
    }

    /* ============================================================ */
    /*                    PROPOSAL TESTS                            */
    /* ============================================================ */

    function test_CreateProposal() public {
        targets.push(address(0xDEAD));
        values.push(0);
        calldatas.push("");

        vm.prank(alice); // 200K > 100K threshold
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test Proposal");
        assertGt(proposalId, 0);
    }

    function test_InsufficientThresholdReverts() public {
        address smallHolder = address(0x99);
        srcToken.mint(smallHolder, 50_000e18); // Below 100K threshold
        vm.prank(smallHolder);
        srcToken.delegate(smallHolder);
        vm.roll(block.number + 1);

        targets.push(address(0xDEAD));
        values.push(0);
        calldatas.push("");

        vm.prank(smallHolder);
        vm.expectRevert();
        governor.propose(targets, values, calldatas, "Should Fail");
    }

    /* ============================================================ */
    /*                    VOTING TESTS                              */
    /* ============================================================ */

    function test_VoteForAgainstAbstain() public {
        targets.push(address(0xDEAD));
        values.push(0);
        calldatas.push("");

        vm.prank(alice);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Vote Test");

        // Advance past voting delay
        vm.roll(block.number + 7201);

        // Alice votes FOR (0=against, 1=for, 2=abstain)
        vm.prank(alice);
        governor.castVote(proposalId, 1);

        // Bob votes AGAINST
        vm.prank(bob);
        governor.castVote(proposalId, 0);

        // Check votes recorded
        assertTrue(governor.hasVoted(proposalId, alice));
        assertTrue(governor.hasVoted(proposalId, bob));
    }

    function test_VoteBeforeVotingPeriodReverts() public {
        targets.push(address(0xDEAD));
        values.push(0);
        calldatas.push("");

        vm.prank(alice);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Early Vote");

        // Don't advance past voting delay
        vm.prank(alice);
        vm.expectRevert();
        governor.castVote(proposalId, 1);
    }

    /* ============================================================ */
    /*                    PROPOSAL STATES TEST                      */
    /* ============================================================ */

    function test_ProposalLifecycle() public {
        targets.push(address(0xDEAD));
        values.push(0);
        calldatas.push("");

        vm.prank(alice);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Lifecycle Test");

        // State: Pending
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Pending));

        // Advance to voting
        vm.roll(block.number + 7201);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Active));

        // Alice votes FOR (enough for quorum: 200K > 12K)
        vm.prank(alice);
        governor.castVote(proposalId, 1);

        // Advance past voting period
        vm.roll(block.number + 21601);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Succeeded));
    }

    function test_ProposalDefeated() public {
        targets.push(address(0xDEAD));
        values.push(0);
        calldatas.push("");

        vm.prank(alice);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Defeat Test");

        // Advance to voting
        vm.roll(block.number + 7201);

        // No one votes → defeated
        vm.roll(block.number + 21601);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Defeated));
    }
}
