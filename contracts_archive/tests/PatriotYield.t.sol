// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {PatriotYield} from "../src/PatriotYield.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

/// @dev Mock USDY (Ondo tokenized T-Bills)
contract MockUSDY is ERC20 {
    constructor() ERC20("Ondo USDY", "USDY") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract PatriotYieldTest is Test {
    PatriotYield public py;
    MockUSDC public usdc;
    MockUSDY public usdy;

    address public owner = address(0x1);
    address public feeCollector = address(0x10);
    address public purchaseTarget = address(0x20); // Simulates Ondo USDY minting

    uint256 constant THRESHOLD = 1_000 * 1e18; // $1K threshold

    function setUp() public {
        usdc = new MockUSDC();
        usdy = new MockUSDY();

        vm.prank(owner);
        py = new PatriotYield(
            address(usdc), address(usdy),
            purchaseTarget, THRESHOLD, owner
        );

        // Authorize FeeCollector
        vm.prank(owner);
        py.authorizeDepositor(feeCollector, true);

        // Fund FeeCollector
        usdc.mint(feeCollector, 100_000 * 1e18);
        vm.prank(feeCollector);
        usdc.approve(address(py), type(uint256).max);
    }

    /* ============================================================ */
    /*                    TAX COLLECTION TESTS                      */
    /* ============================================================ */

    function test_ReceiveTax() public {
        vm.prank(feeCollector);
        py.receiveTax(500 * 1e18);

        assertEq(py.totalFeesReceived(), 500 * 1e18);
        assertEq(usdc.balanceOf(address(py)), 500 * 1e18);
    }

    function test_UnauthorizedDepositReverts() public {
        address rando = address(0x99);
        usdc.mint(rando, 1000 * 1e18);
        vm.prank(rando);
        usdc.approve(address(py), type(uint256).max);

        vm.prank(rando);
        vm.expectRevert("PY: unauthorized");
        py.receiveTax(100 * 1e18);
    }

    function test_ZeroAmountReverts() public {
        vm.prank(feeCollector);
        vm.expectRevert("PY: zero amount");
        py.receiveTax(0);
    }

    /* ============================================================ */
    /*                    AUTO-PURCHASE TESTS                       */
    /* ============================================================ */

    function test_AutoPurchaseAtThreshold() public {
        // Deposit exactly at threshold → triggers purchase
        vm.prank(feeCollector);
        py.receiveTax(1_000 * 1e18);

        assertEq(py.totalUsdcInvested(), 1_000 * 1e18);
        assertEq(py.totalUsdyPurchased(), 1_000 * 1e18);
        assertEq(py.totalPurchases(), 1);
        assertEq(usdc.balanceOf(address(py)), 0); // All spent
    }

    function test_NoPurchaseBelowThreshold() public {
        vm.prank(feeCollector);
        py.receiveTax(500 * 1e18); // Below $1K threshold

        assertEq(py.totalPurchases(), 0);
        assertEq(usdc.balanceOf(address(py)), 500 * 1e18);
    }

    function test_ManualPurchase() public {
        vm.prank(feeCollector);
        py.receiveTax(500 * 1e18); // Below threshold

        // Manual trigger
        py.purchaseTBills();

        assertEq(py.totalPurchases(), 1);
        assertEq(py.totalUsdcInvested(), 500 * 1e18);
    }

    /* ============================================================ */
    /*                    PATRIOT TRACKER TESTS                     */
    /* ============================================================ */

    function test_PatriotTracker() public {
        vm.prank(feeCollector);
        py.receiveTax(2_000 * 1e18);

        (
            uint256 feesReceived,
            uint256 usdcInvested,
            uint256 usdyPurchased,
            uint256 purchases,
            ,
            uint256 pending,
            uint256 lastTime
        ) = py.patriotTracker();

        assertEq(feesReceived, 2_000 * 1e18);
        assertEq(usdcInvested, 2_000 * 1e18);
        assertEq(usdyPurchased, 2_000 * 1e18);
        assertEq(purchases, 1);
        assertEq(pending, 0);
        assertGt(lastTime, 0);
    }

    function test_PurchaseHistory() public {
        vm.prank(feeCollector);
        py.receiveTax(1_500 * 1e18);

        assertEq(py.purchaseCount(), 1);

        PatriotYield.PurchaseRecord memory record = py.getPurchase(0);
        assertEq(record.usdcSpent, 1_500 * 1e18);
        assertEq(record.usdyReceived, 1_500 * 1e18);
        assertEq(record.cumulativeTotal, 1_500 * 1e18);
    }

    function test_MultiplePurchaseHistory() public {
        // First deposit + purchase
        vm.prank(feeCollector);
        py.receiveTax(1_000 * 1e18);

        // Second deposit + purchase
        vm.prank(feeCollector);
        py.receiveTax(2_000 * 1e18);

        assertEq(py.purchaseCount(), 2);

        PatriotYield.PurchaseRecord memory r2 = py.getPurchase(1);
        assertEq(r2.cumulativeTotal, 3_000 * 1e18);
    }

    function test_PublicQueryPending() public {
        vm.prank(feeCollector);
        py.receiveTax(500 * 1e18);

        assertEq(py.pendingUsdc(), 500 * 1e18);
    }

    /* ============================================================ */
    /*                    ADMIN TESTS                               */
    /* ============================================================ */

    function test_SetThreshold() public {
        vm.prank(owner);
        py.setPurchaseThreshold(5_000 * 1e18);

        assertEq(py.purchaseThreshold(), 5_000 * 1e18);
    }
}
