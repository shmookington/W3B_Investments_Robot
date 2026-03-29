// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {SRCToken} from "../src/SRCToken.sol";
import {SRCVesting} from "../src/SRCVesting.sol";

contract SRCTokenTest is Test {
    SRCToken public token;
    address public owner = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);

    // Distribution addresses
    address public founderVesting = address(0x10);
    address public communityPool = address(0x11);
    address public treasury = address(0x12);
    address public liquidityPool = address(0x13);
    address public advisorVesting = address(0x14);
    address public securityFund = address(0x15);

    function setUp() public {
        vm.prank(owner);
        token = new SRCToken(owner);
    }

    /* ═══════════════════════════════════════════ */
    /*              DEPLOYMENT TESTS                */
    /* ═══════════════════════════════════════════ */

    function test_Name() public view {
        assertEq(token.name(), "Sovereign Reserve Currency");
    }

    function test_Symbol() public view {
        assertEq(token.symbol(), "SRC");
    }

    function test_Decimals() public view {
        assertEq(token.decimals(), 18);
    }

    function test_MaxSupply() public view {
        assertEq(token.MAX_SUPPLY(), 100_000_000 * 1e18);
    }

    function test_InitialSupplyIsZero() public view {
        assertEq(token.totalSupply(), 0);
    }

    function test_OwnerIsSet() public view {
        assertEq(token.owner(), owner);
    }

    /* ═══════════════════════════════════════════ */
    /*            DISTRIBUTION TESTS                */
    /* ═══════════════════════════════════════════ */

    function test_Distribute() public {
        vm.prank(owner);
        token.distribute(
            founderVesting, communityPool, treasury,
            liquidityPool, advisorVesting, securityFund
        );

        assertEq(token.totalSupply(), 100_000_000 * 1e18);
        assertEq(token.balanceOf(founderVesting), 20_000_000 * 1e18);
        assertEq(token.balanceOf(communityPool), 30_000_000 * 1e18);
        assertEq(token.balanceOf(treasury), 20_000_000 * 1e18);
        assertEq(token.balanceOf(liquidityPool), 15_000_000 * 1e18);
        assertEq(token.balanceOf(advisorVesting), 10_000_000 * 1e18);
        assertEq(token.balanceOf(securityFund), 5_000_000 * 1e18);
        assertTrue(token.distributed());
    }

    function test_DistributeOnlyOnce() public {
        vm.startPrank(owner);
        token.distribute(
            founderVesting, communityPool, treasury,
            liquidityPool, advisorVesting, securityFund
        );

        vm.expectRevert("SRC: already distributed");
        token.distribute(
            founderVesting, communityPool, treasury,
            liquidityPool, advisorVesting, securityFund
        );
        vm.stopPrank();
    }

    function test_DistributeOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        token.distribute(
            founderVesting, communityPool, treasury,
            liquidityPool, advisorVesting, securityFund
        );
    }

    function test_DistributeRejectsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("SRC: zero address");
        token.distribute(
            address(0), communityPool, treasury,
            liquidityPool, advisorVesting, securityFund
        );
    }

    /* ═══════════════════════════════════════════ */
    /*              MINTING TESTS                   */
    /* ═══════════════════════════════════════════ */

    function test_OwnerCanMint() public {
        vm.prank(owner);
        token.mint(alice, 1000 * 1e18);
        assertEq(token.balanceOf(alice), 1000 * 1e18);
    }

    function test_MintRespectsCapAfterDistribution() public {
        vm.startPrank(owner);
        token.distribute(
            founderVesting, communityPool, treasury,
            liquidityPool, advisorVesting, securityFund
        );

        // Cap is already reached (100M), so any mint should revert
        vm.expectRevert();
        token.mint(alice, 1);
        vm.stopPrank();
    }

    function test_NonOwnerCannotMint() public {
        vm.prank(alice);
        vm.expectRevert();
        token.mint(alice, 1000 * 1e18);
    }

    /* ═══════════════════════════════════════════ */
    /*              BURNING TESTS                   */
    /* ═══════════════════════════════════════════ */

    function test_HolderCanBurn() public {
        vm.prank(owner);
        token.mint(alice, 1000 * 1e18);

        vm.prank(alice);
        token.burn(500 * 1e18);
        assertEq(token.balanceOf(alice), 500 * 1e18);
    }

    /* ═══════════════════════════════════════════ */
    /*            DELEGATION TESTS                  */
    /* ═══════════════════════════════════════════ */

    function test_DelegateVotes() public {
        vm.prank(owner);
        token.mint(alice, 1000 * 1e18);

        // Alice delegates to herself
        vm.prank(alice);
        token.delegate(alice);
        assertEq(token.getVotes(alice), 1000 * 1e18);

        // Alice delegates to bob
        vm.prank(alice);
        token.delegate(bob);
        assertEq(token.getVotes(bob), 1000 * 1e18);
        assertEq(token.getVotes(alice), 0);
    }

    /* ═══════════════════════════════════════════ */
    /*              FUZZ TESTS                      */
    /* ═══════════════════════════════════════════ */

    function testFuzz_MintWithinCap(uint256 amount) public {
        amount = bound(amount, 0, token.MAX_SUPPLY());
        vm.prank(owner);
        token.mint(alice, amount);
        assertEq(token.balanceOf(alice), amount);
        assertLe(token.totalSupply(), token.MAX_SUPPLY());
    }

    function testFuzz_BurnReducesSupply(uint256 mintAmount, uint256 burnAmount) public {
        mintAmount = bound(mintAmount, 1, token.MAX_SUPPLY());
        burnAmount = bound(burnAmount, 0, mintAmount);

        vm.prank(owner);
        token.mint(alice, mintAmount);

        vm.prank(alice);
        token.burn(burnAmount);

        assertEq(token.balanceOf(alice), mintAmount - burnAmount);
        assertEq(token.totalSupply(), mintAmount - burnAmount);
    }
}

contract SRCVestingTest is Test {
    SRCToken public token;
    SRCVesting public vesting;

    address public multisig = address(0x1);
    address public founder = address(0x2);

    uint256 public constant ALLOCATION = 20_000_000 * 1e18;
    uint256 public constant CLIFF = 180 days;     // 6 months
    uint256 public constant DURATION = 730 days;   // 2 years

    function setUp() public {
        vm.startPrank(multisig);

        token = new SRCToken(multisig);

        uint256 startTime = block.timestamp;
        vesting = new SRCVesting(
            address(token),
            founder,
            ALLOCATION,
            startTime,
            CLIFF,
            DURATION,
            multisig
        );

        // Mint tokens to vesting contract
        token.mint(address(vesting), ALLOCATION);

        vm.stopPrank();
    }

    function test_InitialState() public view {
        assertEq(vesting.beneficiary(), founder);
        assertEq(vesting.totalAllocation(), ALLOCATION);
        assertEq(vesting.claimed(), 0);
        assertFalse(vesting.revoked());
    }

    function test_NothingClaimableDuringCliff() public view {
        assertEq(vesting.claimable(), 0);
        assertEq(vesting.vestedAmount(), 0);
    }

    function test_ClaimableAfterCliff() public {
        // Move past cliff
        vm.warp(block.timestamp + CLIFF + 1);

        uint256 claimableAmount = vesting.claimable();
        assertGt(claimableAmount, 0);
    }

    function test_FullyVestedAfterDuration() public {
        // Move past full vesting duration
        vm.warp(block.timestamp + DURATION + 1);

        assertEq(vesting.vestedAmount(), ALLOCATION);
        assertEq(vesting.claimable(), ALLOCATION);
        assertEq(vesting.unvested(), 0);
    }

    function test_ClaimTokens() public {
        // Move to 50% vested (1 year of 2-year vest)
        vm.warp(block.timestamp + 365 days);

        uint256 claimableAmount = vesting.claimable();
        assertGt(claimableAmount, 0);

        vm.prank(founder);
        vesting.claim();

        assertEq(token.balanceOf(founder), claimableAmount);
        assertEq(vesting.claimed(), claimableAmount);
    }

    function test_OnlyBeneficiaryCanClaim() public {
        vm.warp(block.timestamp + CLIFF + 1);

        vm.prank(address(0x99));
        vm.expectRevert("Vesting: not beneficiary");
        vesting.claim();
    }

    function test_RevokeByOwner() public {
        // Move to 25% vested
        vm.warp(block.timestamp + DURATION / 4);

        uint256 vestedBefore = vesting.vestedAmount();
        uint256 unvestedBefore = vesting.unvested();

        vm.prank(multisig);
        vesting.revoke();

        assertTrue(vesting.revoked());
        // Unvested tokens returned to multisig
        assertEq(token.balanceOf(multisig), unvestedBefore);

        // Beneficiary can still claim vested tokens
        vm.prank(founder);
        vesting.claim();
        assertEq(token.balanceOf(founder), vestedBefore);
    }

    function test_RevokeOnlyOwner() public {
        vm.prank(founder);
        vm.expectRevert();
        vesting.revoke();
    }

    function test_CannotRevokeAfterRevoked() public {
        vm.startPrank(multisig);
        vesting.revoke();

        vm.expectRevert("Vesting: already revoked");
        vesting.revoke();
        vm.stopPrank();
    }

    function test_ScheduleInfo() public view {
        (
            address _beneficiary,
            uint256 _totalAllocation,
            uint256 _claimed,
            uint256 _claimable,
            uint256 _unvested,
            uint256 _startTime,
            uint256 _cliffEnd,
            uint256 _vestingEnd,
            bool _revoked
        ) = vesting.scheduleInfo();

        assertEq(_beneficiary, founder);
        assertEq(_totalAllocation, ALLOCATION);
        assertEq(_claimed, 0);
        assertEq(_claimable, 0);
        assertEq(_unvested, ALLOCATION);
        assertEq(_cliffEnd, _startTime + CLIFF);
        assertEq(_vestingEnd, _startTime + DURATION);
        assertFalse(_revoked);
    }

    /* ═══════════════════════════════════════════ */
    /*              FUZZ TESTS                      */
    /* ═══════════════════════════════════════════ */

    function testFuzz_VestingLinear(uint256 elapsed) public {
        elapsed = bound(elapsed, CLIFF, DURATION);
        vm.warp(block.timestamp + elapsed);

        uint256 vested = vesting.vestedAmount();
        uint256 expected = (ALLOCATION * elapsed) / DURATION;

        // Allow 1 wei rounding difference
        assertApproxEqAbs(vested, expected, 1);
    }
}
