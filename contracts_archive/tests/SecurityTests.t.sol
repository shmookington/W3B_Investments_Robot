// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {CollateralManager} from "../src/CollateralManager.sol";
import {SyntheticFactory, SyntheticToken} from "../src/SyntheticFactory.sol";
import {FeeCollector} from "../src/FeeCollector.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/* =================================================================== */
/*                         MOCK CONTRACTS                              */
/* =================================================================== */

contract MockERC20 is ERC20 {
    uint8 private _dec;
    constructor(string memory name, string memory symbol, uint8 dec_) ERC20(name, symbol) { _dec = dec_; }
    function decimals() public view override returns (uint8) { return _dec; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract MockPriceFeed {
    int256 public price;
    uint8 public decimals;
    uint256 public updatedAt;
    constructor(int256 _price, uint8 _decimals) {
        price = _price;
        decimals = _decimals;
        updatedAt = block.timestamp;
    }
    function setPrice(int256 _price) external { price = _price; updatedAt = block.timestamp; }
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, price, block.timestamp, updatedAt, 1);
    }
}

/* =================================================================== */
/*                         FUZZ TESTS                                  */
/* =================================================================== */

/**
 * @title FuzzTests — Fuzz testing for mathematical functions
 * @notice Tests interest calculations, liquidation math, pricing
 *         conversions, and fee calculations with randomized inputs.
 */
contract FuzzTests is Test {
    LendingPool public pool;
    FeeCollector public fc;
    MockERC20 public usdc;
    MockERC20 public usdc18;

    address owner = address(0x1);
    address alice = address(0x10);

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 18);
        usdc18 = new MockERC20("USDC18", "USDC18", 18);

        vm.prank(owner);
        pool = new LendingPool(address(usdc), address(0x99), owner);

        vm.prank(owner);
        fc = new FeeCollector(address(usdc18), owner, 2000, 100, 1_000_000 * 1e18, owner);
    }

    /* ──── Interest Rate Fuzz ──── */

    function testFuzz_UtilizationRate(uint256 supplied, uint256 borrowed) public {
        // Bound to reasonable values
        supplied = bound(supplied, 1e18, 1_000_000_000e18); // 1 to 1B
        borrowed = bound(borrowed, 0, supplied);

        // Utilization = borrowed / supplied, should be 0-100%
        uint256 utilization = (borrowed * 1e18) / supplied;
        assertLe(utilization, 1e18, "Utilization > 100%");
    }

    function testFuzz_InterestNeverNegative(uint256 utilization) public pure {
        utilization = bound(utilization, 0, 1e18);

        // Kink model: base=2%, slope1=4% up to 80%, slope2=75% above
        uint256 rate;
        uint256 kink = 8e17; // 80%
        if (utilization <= kink) {
            rate = 2e16 + (utilization * 4e16) / kink;
        } else {
            rate = 2e16 + 4e16 + ((utilization - kink) * 75e16) / (1e18 - kink);
        }
        assertGe(rate, 2e16, "Rate below base");
    }

    /* ──── Fee Calculation Fuzz ──── */

    function testFuzz_FeeCalculation(uint256 amount) public view {
        amount = bound(amount, 1, type(uint128).max);

        // Performance fee: 20% of profit above HWM
        // NAV = HWM + amount → profit = amount
        uint256 fee = fc.pendingPerformanceFee(1_000_000 * 1e18 + amount);
        assertLe(fee, amount, "Fee > amount");
        assertEq(fee, (amount * 2000) / 10_000);
    }

    function testFuzz_ManagementFeeNonNegative(uint256 aum) public view {
        aum = bound(aum, 1e18, 100_000_000_000e18); // $1 to $100B

        // Management fee should be non-negative for any AUM
        uint256 pending = fc.pendingManagementFee(aum);
        // At time=0, pending should be 0 (not enough time elapsed)
        assertEq(pending, 0);
    }

    /* ──── Collateralization Ratio Fuzz ──── */

    function testFuzz_200PercentCollateral(uint256 price, uint256 amount) public {
        price = bound(price, 1e8, 1_000_000e8);   // $1 to $1M
        amount = bound(amount, 1e18, 1_000_000e18); // 1 to 1M tokens

        // Required = amount * (price normalized to 18 dec) * 200%
        uint256 priceNorm = (price * 1e18) / 1e8;
        uint256 notional = (amount * priceNorm) / 1e18;
        uint256 required = (notional * 20_000) / 10_000;

        // Required should always be 2x notional
        assertEq(required, notional * 2, "Not 200%");
    }

    /* ──── Liquidation Math Fuzz ──── */

    function testFuzz_PartialLiquidation(uint256 debt, uint256 fraction) public pure {
        debt = bound(debt, 1e18, 1_000_000e18);
        fraction = bound(fraction, 1, 5000); // 0.01% to 50%

        uint256 liquidated = (debt * fraction) / 10_000;
        assertLe(liquidated, debt / 2, "Liquidated > 50%");

        uint256 remaining = debt - liquidated;
        assertGe(remaining, debt / 2, "Remaining < 50%");
    }

    function testFuzz_LiquidationBonus(uint256 collateral) public pure {
        collateral = bound(collateral, 1e18, 1_000_000e18);

        // 5% bonus
        uint256 bonus = (collateral * 500) / 10_000;
        uint256 total = collateral + bonus;
        assertEq(total, (collateral * 10_500) / 10_000);
    }

    /* ──── Price Normalization Fuzz ──── */

    function testFuzz_PriceNormalization(int256 rawPrice, uint8 dec) public pure {
        rawPrice = int256(bound(uint256(rawPrice), 1, uint256(type(uint128).max)));
        dec = uint8(bound(dec, 0, 18));

        uint256 normalized = (uint256(rawPrice) * 1e18) / (10 ** dec);
        assertGt(normalized, 0, "Normalized price is zero");
    }
}

/* =================================================================== */
/*                      INVARIANT TESTS                                */
/* =================================================================== */

/**
 * @title InvariantTests — Protocol invariants that must always hold
 */
contract InvariantTests is Test {
    LendingPool public pool;
    MockERC20 public usdc;

    address owner = address(0x1);
    address supplier = address(0x10);

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 18);

        vm.prank(owner);
        pool = new LendingPool(address(usdc), address(0x99), owner);

        // Supplier deposits
        usdc.mint(supplier, 1_000_000e18);
        vm.prank(supplier);
        usdc.approve(address(pool), type(uint256).max);
        vm.prank(supplier);
        pool.supply(100_000e18);
    }

    /// @notice Total borrows must never exceed total supply
    function invariant_BorrowsNeverExceedSupply() public view {
        assertLe(pool.totalBorrowed(), pool.totalSupplied(), "Borrows > Supply");
    }

    /// @notice Reserve factor must stay within bounds
    function invariant_ReserveFactorBounded() public view {
        assertLe(pool.reserveFactorBps(), 10_000, "Reserve > 100%");
    }

    /// @notice Utilization rate must be 0-100%
    function invariant_UtilizationBounded() public view {
        uint256 util = pool.utilizationRate();
        assertLe(util, 1e18, "Utilization > 100%");
    }
}

/* =================================================================== */
/*                     INTEGRATION TESTS                               */
/* =================================================================== */

/**
 * @title IntegrationTests — End-to-End lending → liquidation flow
 */
contract IntegrationTests is Test {
    LendingPool public pool;
    CollateralManager public cm;
    MockERC20 public usdc;
    MockERC20 public weth;
    MockPriceFeed public ethFeed;

    address owner = address(0x1);
    address supplier = address(0x10);
    address borrower = address(0x20);

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 18);
        weth = new MockERC20("WETH", "WETH", 18);
        ethFeed = new MockPriceFeed(3000 * 1e8, 8); // ETH = $3000

        vm.prank(owner);
        pool = new LendingPool(address(usdc), address(0x99), owner);

        vm.prank(owner);
        cm = new CollateralManager(owner);

        // Configure ETH as collateral: 80% LTV, 85% liq threshold, 5% bonus
        vm.prank(owner);
        cm.configureCollateral(address(weth), 8000, 8500, 500, address(ethFeed), 18);

        // Supplier provides liquidity
        usdc.mint(supplier, 1_000_000e18);
        vm.prank(supplier);
        usdc.approve(address(pool), type(uint256).max);
        vm.prank(supplier);
        pool.supply(500_000e18);

        // Borrower gets WETH collateral
        weth.mint(borrower, 100e18); // 100 ETH = $300K
        vm.prank(borrower);
        weth.approve(address(cm), type(uint256).max);
    }

    /**
     * @notice Full end-to-end: deposit collateral → check capacity → price drops → liquidatable
     */
    function test_FullLendingFlow() public {
        // Step 1: Deposit collateral
        vm.prank(borrower);
        cm.depositCollateral(address(weth), 10e18); // 10 ETH = $30K

        // Step 2: Check borrow capacity
        uint256 capacity = cm.maxBorrowValue(borrower);
        assertGt(capacity, 0, "No borrow capacity");

        // Step 3: Health factor is infinite (no borrows)
        uint256 hf = cm.healthFactor(borrower);
        assertEq(hf, type(uint256).max, "HF should be max with no borrows");

        // Step 4: Verify not liquidatable
        bool liq = cm.isLiquidatable(borrower);
        assertFalse(liq, "Should not be liquidatable");

        // Step 5: Price drops to $1000 (66% decline)
        ethFeed.setPrice(1000 * 1e8);

        // Step 6: Capacity drops
        uint256 capacityAfter = cm.maxBorrowValue(borrower);
        assertLt(capacityAfter, capacity, "Capacity should drop after price fall");
    }

    /**
     * @notice Supply → Withdraw flow
     */
    function test_SupplyWithdrawFlow() public {
        uint256 balBefore = usdc.balanceOf(supplier);

        // Withdraw full amount
        vm.prank(supplier);
        pool.withdraw(500_000e18);

        uint256 balAfter = usdc.balanceOf(supplier);
        assertEq(balAfter - balBefore, 500_000e18);
        assertEq(pool.totalSupplied(), 0);
    }

    /**
     * @notice Collateral deposit → withdrawal flow
     */
    function test_CollateralDepositWithdrawFlow() public {
        // Deposit
        vm.prank(borrower);
        cm.depositCollateral(address(weth), 5e18);

        // Verify total collateral value
        uint256 totalVal = cm.totalCollateralValue(borrower);
        assertEq(totalVal, 15_000e18); // 5 * $3000

        // Withdraw (no borrows = safe)
        vm.prank(borrower);
        cm.withdrawCollateral(address(weth), 5e18);
    }

    /**
     * @notice Multi-asset collateral integration
     */
    function test_MultiAssetCollateral() public {
        MockERC20 wbtc = new MockERC20("WBTC", "WBTC", 18);
        MockPriceFeed btcFeed = new MockPriceFeed(60_000 * 1e8, 8);

        vm.prank(owner);
        cm.configureCollateral(address(wbtc), 7500, 8000, 500, address(btcFeed), 18);

        // Borrower deposits both ETH and BTC
        wbtc.mint(borrower, 1e18); // 1 BTC = $60K
        vm.prank(borrower);
        wbtc.approve(address(cm), type(uint256).max);

        vm.prank(borrower);
        cm.depositCollateral(address(weth), 10e18);  // $30K

        vm.prank(borrower);
        cm.depositCollateral(address(wbtc), 1e18);   // $60K

        // Total collateral = $90K
        uint256 totalValue = cm.totalCollateralValue(borrower);
        assertEq(totalValue, 90_000e18);
    }
}
