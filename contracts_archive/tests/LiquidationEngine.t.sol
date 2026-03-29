// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {LiquidationEngine, IFlashLoanReceiver} from "../src/LiquidationEngine.sol";
import {CollateralManager} from "../src/CollateralManager.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Mock USDC
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

/// @dev Mock WETH
contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

/// @dev Mock Chainlink price feed
contract MockPriceFeed {
    int256 public price;
    uint8 public decimals;
    uint256 public updatedAt;

    constructor(int256 _price, uint8 _decimals) {
        price = _price;
        decimals = _decimals;
        updatedAt = block.timestamp;
    }
    function setPrice(int256 _price) external {
        price = _price;
        updatedAt = block.timestamp;
    }
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, price, block.timestamp, updatedAt, 1);
    }
}

/// @dev Mock flash loan receiver
contract MockFlashReceiver is IFlashLoanReceiver {
    IERC20 public debtAsset;
    constructor(address _debtAsset) { debtAsset = IERC20(_debtAsset); }

    function onFlashLoan(
        address, address, uint256 debtAmount, uint256, bytes calldata
    ) external returns (bytes32) {
        // In a real flash liquidation, we'd swap collateral for debt and repay
        // For testing, just approve the engine to pull the debt amount
        debtAsset.approve(msg.sender, debtAmount);
        return keccak256("IFlashLoanReceiver.onFlashLoan");
    }
}

contract LiquidationEngineTest is Test {
    LiquidationEngine public engine;
    CollateralManager public cm;
    MockUSDC public usdc;
    MockWETH public weth;
    MockPriceFeed public ethFeed;

    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public insuranceFund = address(0x3);
    address public lendingPool = address(0x4);
    address public borrower = address(0x10);
    address public liquidator = address(0x11);

    uint256 constant USDC_UNIT = 1e6;

    function setUp() public {
        usdc = new MockUSDC();
        weth = new MockWETH();
        ethFeed = new MockPriceFeed(3000 * 1e8, 8); // $3,000

        // Deploy CollateralManager
        vm.prank(owner);
        cm = new CollateralManager(owner);
        vm.prank(owner);
        cm.configureCollateral(address(weth), 7500, 8000, 500, address(ethFeed), 18);
        vm.prank(owner);
        cm.setLendingPool(lendingPool);

        // Deploy LiquidationEngine
        vm.prank(owner);
        engine = new LiquidationEngine(
            address(usdc), address(cm), treasury, insuranceFund, owner
        );

        // Setup borrower: deposit 10 ETH ($30K collateral)
        weth.mint(borrower, 10 ether);
        vm.prank(borrower);
        weth.approve(address(cm), type(uint256).max);
        vm.prank(borrower);
        cm.depositCollateral(address(weth), 10 ether);

        // Setup liquidator — need large balance since debt is tracked in 18 decimals
        usdc.mint(liquidator, 100_000 * 1e18);
        vm.prank(liquidator);
        usdc.approve(address(engine), type(uint256).max);

        // Setup insurance fund
        usdc.mint(insuranceFund, 1_000_000 * USDC_UNIT);
        vm.prank(insuranceFund);
        usdc.approve(address(engine), type(uint256).max);
    }

    /* ============================================================ */
    /*                    LIQUIDATION TRIGGER TESTS                 */
    /* ============================================================ */

    function test_NotLiquidatableWhenHealthy() public {
        // HF = max (no borrows)
        assertFalse(engine.isLiquidatable(borrower));
    }

    function test_LiquidatableWhenHFBelow1() public {
        // Give borrower $25K debt → HF = (30K * 0.8) / 25K = 0.96
        vm.prank(lendingPool);
        cm.updateBorrowValue(borrower, 25_000 * 1e18);

        assertTrue(engine.isLiquidatable(borrower));
    }

    function test_NearLiquidationWarning() public {
        // HF = (30K * 0.8) / 23K = ~1.04 (< 1.05 warning)
        vm.prank(lendingPool);
        cm.updateBorrowValue(borrower, 23_000 * 1e18);

        assertTrue(engine.isNearLiquidation(borrower));
        assertFalse(engine.isLiquidatable(borrower)); // Not yet
    }

    /* ============================================================ */
    /*                    PARTIAL LIQUIDATION TESTS                 */
    /* ============================================================ */

    function test_MaxLiquidatableDebt() public {
        vm.prank(lendingPool);
        cm.updateBorrowValue(borrower, 25_000 * 1e18);

        uint256 maxDebt = engine.maxLiquidatableDebt(borrower);
        assertEq(maxDebt, 12_500 * 1e18); // 50% of 25K
    }

    function test_CapsDebtTo50Percent() public {
        vm.prank(lendingPool);
        cm.updateBorrowValue(borrower, 25_000 * 1e18);

        // Preview liquidation with full debt
        LiquidationEngine.LiquidationParams memory params = LiquidationEngine.LiquidationParams({
            user: borrower,
            collateralToken: address(weth),
            debtToCover: 25_000 * 1e18 // Try full amount
        });

        LiquidationEngine.LiquidationResult memory result = engine.previewLiquidation(params);
        assertEq(result.debtCovered, 12_500 * 1e18); // Capped to 50%
    }

    /* ============================================================ */
    /*                    LIQUIDATION EXECUTION TESTS               */
    /* ============================================================ */

    function test_Liquidate() public {
        vm.prank(lendingPool);
        cm.updateBorrowValue(borrower, 25_000 * 1e18);

        LiquidationEngine.LiquidationParams memory params = LiquidationEngine.LiquidationParams({
            user: borrower,
            collateralToken: address(weth),
            debtToCover: 10_000 * 1e18
        });

        uint256 liquidatorBalanceBefore = usdc.balanceOf(liquidator);

        vm.prank(liquidator);
        LiquidationEngine.LiquidationResult memory result = engine.liquidate(params);

        assertEq(result.debtCovered, 10_000 * 1e18);
        assertGt(result.collateralSeized, 0);
        assertGt(result.liquidatorBonus, 0);
        assertGt(result.protocolFee, 0);

        // Liquidator should have paid debt
        assertLt(usdc.balanceOf(liquidator), liquidatorBalanceBefore);

        // Treasury should have received fee
        assertGt(usdc.balanceOf(treasury), 0);
    }

    function test_LiquidateNotLiquidatableReverts() public {
        // No borrows, HF = max
        LiquidationEngine.LiquidationParams memory params = LiquidationEngine.LiquidationParams({
            user: borrower,
            collateralToken: address(weth),
            debtToCover: 1000 * 1e18
        });

        vm.prank(liquidator);
        vm.expectRevert("Liq: not liquidatable");
        engine.liquidate(params);
    }

    /* ============================================================ */
    /*                    INCENTIVE TESTS                           */
    /* ============================================================ */

    function test_LiquidationBonus() public {
        vm.prank(lendingPool);
        cm.updateBorrowValue(borrower, 25_000 * 1e18);

        LiquidationEngine.LiquidationParams memory params = LiquidationEngine.LiquidationParams({
            user: borrower,
            collateralToken: address(weth),
            debtToCover: 10_000 * 1e18
        });

        LiquidationEngine.LiquidationResult memory result = engine.previewLiquidation(params);

        // Bonus = 5% of base collateral
        // Base collateral = 10K / 3000 = 3.333... ETH
        // Bonus = 3.333... * 0.05 = 0.1666... ETH
        uint256 debtVal = 10_000 * 1e18;
        uint256 ethPrice = 3000 * 1e18;
        uint256 baseCollateral = (debtVal * 1e18) / ethPrice;
        uint256 expectedBonus = (baseCollateral * 500) / 10_000;
        assertEq(result.liquidatorBonus, expectedBonus);
    }

    function test_ProtocolFee() public {
        vm.prank(lendingPool);
        cm.updateBorrowValue(borrower, 25_000 * 1e18);

        LiquidationEngine.LiquidationParams memory params = LiquidationEngine.LiquidationParams({
            user: borrower,
            collateralToken: address(weth),
            debtToCover: 10_000 * 1e18
        });

        LiquidationEngine.LiquidationResult memory result = engine.previewLiquidation(params);

        // Fee = 2.5% of debt
        uint256 expectedFee = (10_000 * 1e18 * 250) / 10_000;
        assertEq(result.protocolFee, expectedFee);
    }

    /* ============================================================ */
    /*                    BAD DEBT TESTS                            */
    /* ============================================================ */

    function test_AbsorbBadDebt() public {
        uint256 badDebt = 5_000 * USDC_UNIT;

        vm.prank(owner);
        engine.absorbBadDebt(borrower, badDebt);

        assertEq(engine.totalBadDebtAbsorbed(), badDebt);
        // Insurance fund should have been debited
        assertEq(usdc.balanceOf(insuranceFund), 1_000_000 * USDC_UNIT - badDebt);
    }

    /* ============================================================ */
    /*                    PREVIEW TESTS                             */
    /* ============================================================ */

    function test_PreviewNotLiquidatable() public {
        LiquidationEngine.LiquidationParams memory params = LiquidationEngine.LiquidationParams({
            user: borrower,
            collateralToken: address(weth),
            debtToCover: 1000 * 1e18
        });

        LiquidationEngine.LiquidationResult memory result = engine.previewLiquidation(params);
        assertEq(result.debtCovered, 0); // Not liquidatable
    }

    /* ============================================================ */
    /*                    STATS TESTS                               */
    /* ============================================================ */

    function test_EngineStats() public {
        vm.prank(lendingPool);
        cm.updateBorrowValue(borrower, 25_000 * 1e18);

        LiquidationEngine.LiquidationParams memory params = LiquidationEngine.LiquidationParams({
            user: borrower,
            collateralToken: address(weth),
            debtToCover: 10_000 * 1e18
        });

        vm.prank(liquidator);
        engine.liquidate(params);

        (uint256 totalLiqs, uint256 totalDebt, , uint256 totalFees, ) = engine.engineStats();
        assertEq(totalLiqs, 1);
        assertEq(totalDebt, 10_000 * 1e18);
        assertGt(totalFees, 0);
    }

    /* ============================================================ */
    /*                    SCENARIO TESTS                            */
    /* ============================================================ */

    function test_ScenarioPriceDrop() public {
        // Borrower has 10 ETH, borrows $20K
        vm.prank(lendingPool);
        cm.updateBorrowValue(borrower, 20_000 * 1e18);

        // Initially healthy: HF = (30K * 0.8) / 20K = 1.2
        assertFalse(engine.isLiquidatable(borrower));

        // ETH drops to $2,400 → collateral = 10 * 2400 = $24K
        // HF = (24K * 0.8) / 20K = 0.96 → liquidatable
        ethFeed.setPrice(2400 * 1e8);

        assertTrue(engine.isLiquidatable(borrower));

        // Liquidate 50% = $10K debt
        LiquidationEngine.LiquidationParams memory params = LiquidationEngine.LiquidationParams({
            user: borrower,
            collateralToken: address(weth),
            debtToCover: 10_000 * 1e18
        });

        vm.prank(liquidator);
        LiquidationEngine.LiquidationResult memory result = engine.liquidate(params);

        assertEq(result.debtCovered, 10_000 * 1e18);
        assertFalse(result.badDebt);
    }

    function test_ScenarioMultipleLiquidations() public {
        vm.prank(lendingPool);
        cm.updateBorrowValue(borrower, 25_000 * 1e18);

        // First liquidation: 5K
        LiquidationEngine.LiquidationParams memory params1 = LiquidationEngine.LiquidationParams({
            user: borrower,
            collateralToken: address(weth),
            debtToCover: 5_000 * 1e18
        });

        vm.prank(liquidator);
        engine.liquidate(params1);

        // Second liquidation: another 5K
        vm.prank(liquidator);
        engine.liquidate(params1);

        (uint256 totalLiqs, , , , ) = engine.engineStats();
        assertEq(totalLiqs, 2);
    }
}
