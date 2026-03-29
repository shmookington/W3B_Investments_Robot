// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {TBillAllocator, ITBillToken} from "../src/TBillAllocator.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Mock USDC
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

/// @dev Mock T-Bill token (simulates both USDY and BUIDL)
contract MockTBill is ERC20 {
    IERC20 public stablecoin;
    uint256 public _exchangeRate; // 1e18 = 1:1

    constructor(string memory name, string memory symbol, address _stablecoin) ERC20(name, symbol) {
        stablecoin = IERC20(_stablecoin);
        _exchangeRate = 1e18; // Start at 1:1
    }

    function exchangeRate() external view returns (uint256) {
        return _exchangeRate;
    }

    function accruedYield(address) external pure returns (uint256) {
        return 0;
    }

    function deposit(uint256 amount) external returns (uint256 shares) {
        stablecoin.transferFrom(msg.sender, address(this), amount);
        shares = (amount * 1e18) / _exchangeRate;
        _mint(msg.sender, shares);
    }

    function redeem(uint256 shares) external returns (uint256 amount) {
        amount = (shares * _exchangeRate) / 1e18;
        _burn(msg.sender, shares);
        stablecoin.transfer(msg.sender, amount);
    }

    /// @dev Simulate yield accrual by increasing exchange rate
    function simulateYield(uint256 yieldBps) external {
        _exchangeRate = _exchangeRate * (10_000 + yieldBps) / 10_000;
    }
}

contract TBillAllocatorTest is Test {
    TBillAllocator public allocator;
    MockUSDC public usdc;
    MockTBill public usdy;
    MockTBill public buidl;

    address public owner = address(0x1);
    address public vaultAddr = address(0x2);

    uint256 constant USDC_UNIT = 1e6;

    function setUp() public {
        usdc = new MockUSDC();
        usdy = new MockTBill("Ondo USDY", "USDY", address(usdc));
        buidl = new MockTBill("BlackRock BUIDL", "BUIDL", address(usdc));

        // Fund the mock T-Bill contracts with USDC for redemptions
        usdc.mint(address(usdy), 100_000_000 * USDC_UNIT);
        usdc.mint(address(buidl), 100_000_000 * USDC_UNIT);

        vm.prank(owner);
        allocator = new TBillAllocator(
            address(usdc), vaultAddr, address(usdy), address(buidl), owner
        );

        // Fund vault and approve
        usdc.mint(vaultAddr, 10_000_000 * USDC_UNIT);
        vm.prank(vaultAddr);
        usdc.approve(address(allocator), type(uint256).max);
    }

    /* ============================================================ */
    /*                    ALLOCATION TESTS                          */
    /* ============================================================ */

    function test_Allocate() public {
        vm.prank(vaultAddr);
        allocator.allocate(1_000_000 * USDC_UNIT);

        // 60% to USDY = 600K
        assertEq(allocator.usdyDeposited(), 600_000 * USDC_UNIT);
        // 20% to BUIDL = 200K
        assertEq(allocator.buidlDeposited(), 200_000 * USDC_UNIT);
        // 20% stays liquid = 200K
        assertEq(usdc.balanceOf(address(allocator)), 200_000 * USDC_UNIT);
    }

    function test_AllocateOnlyVault() public {
        vm.prank(address(0x99));
        vm.expectRevert("TBill: only vault");
        allocator.allocate(1_000_000 * USDC_UNIT);
    }

    function test_TotalAssets() public {
        vm.prank(vaultAddr);
        allocator.allocate(1_000_000 * USDC_UNIT);

        // Total should be ~1M (minus rounding)
        assertApproxEqAbs(allocator.totalAssets(), 1_000_000 * USDC_UNIT, 1);
    }

    /* ============================================================ */
    /*                    RECALL TESTS                              */
    /* ============================================================ */

    function test_RecallFromLiquid() public {
        vm.prank(vaultAddr);
        allocator.allocate(1_000_000 * USDC_UNIT);

        uint256 vaultBefore = usdc.balanceOf(vaultAddr);

        vm.prank(vaultAddr);
        allocator.recall(100_000 * USDC_UNIT); // Less than 200K liquid

        assertEq(usdc.balanceOf(vaultAddr) - vaultBefore, 100_000 * USDC_UNIT);
    }

    function test_RecallRedeemsTBills() public {
        vm.prank(vaultAddr);
        allocator.allocate(1_000_000 * USDC_UNIT);

        uint256 vaultBefore = usdc.balanceOf(vaultAddr);

        // Recall more than liquid (200K), should trigger T-Bill redemptions
        vm.prank(vaultAddr);
        allocator.recall(500_000 * USDC_UNIT);

        assertEq(usdc.balanceOf(vaultAddr) - vaultBefore, 500_000 * USDC_UNIT);
    }

    /* ============================================================ */
    /*                    YIELD TESTS                               */
    /* ============================================================ */

    function test_YieldHarvest() public {
        vm.prank(vaultAddr);
        allocator.allocate(1_000_000 * USDC_UNIT);

        // Simulate 5% yield on USDY (represents T-Bill yield accrual)
        usdy.simulateYield(500); // 5%

        uint256 vaultBefore = usdc.balanceOf(vaultAddr);
        allocator.harvestYield();

        uint256 yieldReceived = usdc.balanceOf(vaultAddr) - vaultBefore;
        assertGt(yieldReceived, 0);
        assertGt(allocator.totalYieldHarvested(), 0);
    }

    /* ============================================================ */
    /*                    REBALANCING TESTS                         */
    /* ============================================================ */

    function test_DefaultAllocation() public view {
        assertEq(allocator.usdyAllocationBps(), 6000);
        assertEq(allocator.buidlAllocationBps(), 2000);
    }

    function test_RebalanceLowWithdrawals() public {
        // < 10 withdrawals
        for (uint i = 0; i < 5; i++) {
            vm.prank(vaultAddr);
            allocator.trackWithdrawal();
        }

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(owner);
        allocator.rebalance();

        assertEq(allocator.usdyAllocationBps(), 6000); // Standard
        assertEq(allocator.buidlAllocationBps(), 2000);
    }

    function test_RebalanceMediumWithdrawals() public {
        // 10-50 withdrawals
        for (uint i = 0; i < 25; i++) {
            vm.prank(vaultAddr);
            allocator.trackWithdrawal();
        }

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(owner);
        allocator.rebalance();

        assertEq(allocator.usdyAllocationBps(), 5000); // More liquid
        assertEq(allocator.buidlAllocationBps(), 1500);
    }

    function test_RebalanceHighWithdrawals() public {
        // > 50 withdrawals
        for (uint i = 0; i < 55; i++) {
            vm.prank(vaultAddr);
            allocator.trackWithdrawal();
        }

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(owner);
        allocator.rebalance();

        assertEq(allocator.usdyAllocationBps(), 4000); // Maximum liquid
        assertEq(allocator.buidlAllocationBps(), 1000);
    }

    function test_RebalanceCooldown() public {
        vm.prank(owner);
        vm.expectRevert("TBill: cooldown active");
        allocator.rebalance();
    }

    /* ============================================================ */
    /*                    WITHDRAWAL TRACKING                      */
    /* ============================================================ */

    function test_WithdrawalWindowResets() public {
        for (uint i = 0; i < 10; i++) {
            vm.prank(vaultAddr);
            allocator.trackWithdrawal();
        }
        assertEq(allocator.withdrawalCount7d(), 10);

        // Fast forward 8 days
        vm.warp(block.timestamp + 8 days);

        vm.prank(vaultAddr);
        allocator.trackWithdrawal();

        assertEq(allocator.withdrawalCount7d(), 1); // Reset
    }

    /* ============================================================ */
    /*                    ADMIN TESTS                               */
    /* ============================================================ */

    function test_SetAllocation() public {
        vm.prank(owner);
        allocator.setAllocation(7000, 2000); // 70% USDY, 20% BUIDL, 10% liquid

        assertEq(allocator.usdyAllocationBps(), 7000);
        assertEq(allocator.buidlAllocationBps(), 2000);
    }

    function test_SetAllocationTooHigh() public {
        vm.prank(owner);
        vm.expectRevert("TBill: allocation > 100%");
        allocator.setAllocation(8000, 3000); // 110%
    }

    function test_EmergencyExitAll() public {
        vm.prank(vaultAddr);
        allocator.allocate(1_000_000 * USDC_UNIT);

        uint256 vaultBefore = usdc.balanceOf(vaultAddr);

        vm.prank(owner);
        allocator.emergencyExitAll();

        // All funds should be back at vault
        uint256 returned = usdc.balanceOf(vaultAddr) - vaultBefore;
        assertApproxEqAbs(returned, 1_000_000 * USDC_UNIT, 1);
        assertEq(allocator.usdyDeposited(), 0);
        assertEq(allocator.buidlDeposited(), 0);
    }

    function test_AllocatorStatus() public {
        vm.prank(vaultAddr);
        allocator.allocate(1_000_000 * USDC_UNIT);

        (
            uint256 totalAst, uint256 usdyDep, uint256 buidlDep,
            uint256 liquid, , uint256 usdyBps, uint256 buidlBps,
            uint256 liquidBps,
        ) = allocator.allocatorStatus();

        assertApproxEqAbs(totalAst, 1_000_000 * USDC_UNIT, 1);
        assertEq(usdyDep, 600_000 * USDC_UNIT);
        assertEq(buidlDep, 200_000 * USDC_UNIT);
        assertEq(liquid, 200_000 * USDC_UNIT);
        assertEq(usdyBps, 6000);
        assertEq(buidlBps, 2000);
        assertEq(liquidBps, 2000);
    }
}
