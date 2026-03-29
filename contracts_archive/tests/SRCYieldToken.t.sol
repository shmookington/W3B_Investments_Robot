// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {SRCYieldToken} from "../src/SRCYieldToken.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC token (6 decimals)
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SRCYieldTokenTest is Test {
    SRCYieldToken public vault;
    MockUSDC public usdc;

    address public owner = address(0x1);
    address public feeCollector = address(0x2);
    address public alice = address(0x10);
    address public bob = address(0x11);

    uint256 public constant USDC_UNIT = 1e6;

    function setUp() public {
        usdc = new MockUSDC();

        vm.prank(owner);
        vault = new SRCYieldToken(usdc, owner, feeCollector);

        // Mint USDC to users
        usdc.mint(alice, 1_000_000 * USDC_UNIT);
        usdc.mint(bob, 1_000_000 * USDC_UNIT);
        usdc.mint(owner, 1_000_000 * USDC_UNIT);

        // Approve vault
        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(owner);
        usdc.approve(address(vault), type(uint256).max);
    }

    /* ============================================================ */
    /*                    DEPLOYMENT TESTS                          */
    /* ============================================================ */

    function test_Name() public view {
        assertEq(vault.name(), "W3B Yield Token");
    }

    function test_Symbol() public view {
        assertEq(vault.symbol(), "aSRC");
    }

    function test_Decimals() public view {
        // 6 (USDC) + 12 (offset) = 18
        assertEq(vault.decimals(), 18);
    }

    function test_Asset() public view {
        assertEq(vault.asset(), address(usdc));
    }

    function test_InitialSharePrice() public view {
        assertEq(vault.sharePrice(), 1e6);
    }

    /* ============================================================ */
    /*                    DEPOSIT TESTS                             */
    /* ============================================================ */

    function test_Deposit() public {
        uint256 depositAmount = 1000 * USDC_UNIT;

        vm.prank(alice);
        uint256 shares = vault.deposit(depositAmount, alice);

        assertGt(shares, 0);
        assertEq(usdc.balanceOf(address(vault)), depositAmount);
        assertEq(vault.balanceOf(alice), shares);
        assertEq(vault.userTotalDeposited(alice), depositAmount);
    }

    function test_DepositBelowMinimum() public {
        vm.prank(alice);
        vm.expectRevert("aSRC: below minimum deposit");
        vault.deposit(5 * USDC_UNIT, alice); // 5 USDC < 10 USDC min
    }

    function test_DepositAboveMaximum() public {
        usdc.mint(alice, 2_000_000 * USDC_UNIT);
        vm.prank(alice);
        vm.expectRevert("aSRC: above maximum deposit");
        vault.deposit(1_500_000 * USDC_UNIT, alice); // 1.5M > 1M max
    }

    /* ============================================================ */
    /*                    WITHDRAW TESTS                            */
    /* ============================================================ */

    function test_Withdraw() public {
        uint256 depositAmount = 1000 * USDC_UNIT;

        vm.prank(alice);
        vault.deposit(depositAmount, alice);

        uint256 shares = vault.balanceOf(alice);

        vm.prank(alice);
        uint256 assets = vault.redeem(shares, alice, alice);

        // Should get back approximately the same amount (minus rounding)
        assertApproxEqAbs(assets, depositAmount, 1);
        assertEq(vault.balanceOf(alice), 0);
    }

    /* ============================================================ */
    /*                    YIELD TESTS                               */
    /* ============================================================ */

    function test_YieldDistribution() public {
        // Alice deposits 1000 USDC
        vm.prank(alice);
        vault.deposit(1000 * USDC_UNIT, alice);

        uint256 sharePriceBefore = vault.sharePrice();

        // Owner distributes 100 USDC yield
        vm.prank(owner);
        vault.distributeYield(100 * USDC_UNIT);

        uint256 sharePriceAfter = vault.sharePrice();

        // Share price should increase
        assertGt(sharePriceAfter, sharePriceBefore);
        assertEq(vault.totalYieldAccrued(), 100 * USDC_UNIT);

        // Alice should now be able to redeem more than she deposited
        uint256 aliceShareValue = vault.convertToAssets(vault.balanceOf(alice));
        assertGt(aliceShareValue, 1000 * USDC_UNIT);
        assertApproxEqAbs(aliceShareValue, 1100 * USDC_UNIT, 1);
    }

    function test_YieldSharedProportionally() public {
        // Alice deposits 1000 USDC, Bob deposits 3000 USDC
        vm.prank(alice);
        vault.deposit(1000 * USDC_UNIT, alice);
        vm.prank(bob);
        vault.deposit(3000 * USDC_UNIT, bob);

        // Distribute 400 USDC yield
        vm.prank(owner);
        vault.distributeYield(400 * USDC_UNIT);

        uint256 aliceValue = vault.convertToAssets(vault.balanceOf(alice));
        uint256 bobValue = vault.convertToAssets(vault.balanceOf(bob));

        // Alice: 1000 + 25% of 400 = 1100
        // Bob:   3000 + 75% of 400 = 3300
        assertApproxEqAbs(aliceValue, 1100 * USDC_UNIT, 1);
        assertApproxEqAbs(bobValue, 3300 * USDC_UNIT, 1);
    }

    /* ============================================================ */
    /*                    FEE TESTS                                 */
    /* ============================================================ */

    function test_ManagementFeeCollection() public {
        // Alice deposits 10000 USDC
        vm.prank(alice);
        vault.deposit(10_000 * USDC_UNIT, alice);

        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);

        uint256 vaultBalBefore = usdc.balanceOf(address(vault));
        vault.collectManagementFee();
        uint256 vaultBalAfter = usdc.balanceOf(address(vault));

        // Fee should have been collected
        uint256 feeCollected = vaultBalBefore - vaultBalAfter;
        assertGt(feeCollected, 0);
        assertEq(usdc.balanceOf(feeCollector), feeCollected);

        // 1% annual on 10000 USDC for 30 days ~ 8.22 USDC
        uint256 expectedFee = (10_000 * USDC_UNIT * 100 * 30 days) / (10_000 * 365 days);
        assertApproxEqAbs(feeCollected, expectedFee, 1);
    }

    function test_FeeCollectionTooEarly() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC_UNIT, alice);

        // Try collecting fee immediately (< 1 day)
        vm.expectRevert("aSRC: too early");
        vault.collectManagementFee();
    }

    /* ============================================================ */
    /*                    PAUSE TESTS                               */
    /* ============================================================ */

    function test_PauseDeposits() public {
        vm.prank(owner);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert();
        vault.deposit(1000 * USDC_UNIT, alice);
    }

    function test_UnpauseDeposits() public {
        vm.prank(owner);
        vault.pause();
        vm.prank(owner);
        vault.unpause();

        vm.prank(alice);
        vault.deposit(1000 * USDC_UNIT, alice);
        assertGt(vault.balanceOf(alice), 0);
    }

    /* ============================================================ */
    /*                    USER POSITION TESTS                       */
    /* ============================================================ */

    function test_UserPosition() public {
        vm.prank(alice);
        vault.deposit(1000 * USDC_UNIT, alice);

        // Distribute yield
        vm.prank(owner);
        vault.distributeYield(100 * USDC_UNIT);

        (uint256 deposited, uint256 currentValue, uint256 yieldEarned) = vault.userPosition(alice);

        assertEq(deposited, 1000 * USDC_UNIT);
        assertApproxEqAbs(currentValue, 1100 * USDC_UNIT, 1);
        assertApproxEqAbs(yieldEarned, 100 * USDC_UNIT, 1);
    }

    /* ============================================================ */
    /*                    FUZZ TESTS                                */
    /* ============================================================ */

    function testFuzz_DepositAndRedeem(uint256 amount) public {
        amount = bound(amount, vault.MIN_DEPOSIT(), vault.MAX_DEPOSIT());

        usdc.mint(alice, amount);

        vm.prank(alice);
        uint256 shares = vault.deposit(amount, alice);
        assertGt(shares, 0);

        vm.prank(alice);
        uint256 redeemed = vault.redeem(shares, alice, alice);

        // Should get back the same or very close (rounding)
        assertApproxEqAbs(redeemed, amount, 1);
    }

    function testFuzz_YieldIncreasesSharePrice(uint256 yieldAmount) public {
        yieldAmount = bound(yieldAmount, 1 * USDC_UNIT, 100_000 * USDC_UNIT);

        // Alice deposits
        vm.prank(alice);
        vault.deposit(1000 * USDC_UNIT, alice);

        uint256 priceBefore = vault.sharePrice();

        // Distribute yield
        usdc.mint(owner, yieldAmount);
        vm.prank(owner);
        vault.distributeYield(yieldAmount);

        uint256 priceAfter = vault.sharePrice();
        assertGt(priceAfter, priceBefore);
    }
}
