// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {CollateralManager} from "../src/CollateralManager.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock ERC20 token
contract MockToken is ERC20 {
    uint8 private _dec;
    constructor(string memory name, string memory symbol, uint8 dec) ERC20(name, symbol) {
        _dec = dec;
    }
    function decimals() public view override returns (uint8) { return _dec; }
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

    function setStale() external {
        updatedAt = block.timestamp - 2 hours;
    }

    function latestRoundData() external view returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return (1, price, block.timestamp, updatedAt, 1);
    }
}

contract CollateralManagerTest is Test {
    CollateralManager public cm;
    MockToken public weth;
    MockToken public wbtc;
    MockToken public usdc;
    MockToken public steth;
    MockPriceFeed public ethFeed;
    MockPriceFeed public btcFeed;
    MockPriceFeed public usdcFeed;
    MockPriceFeed public stethFeed;

    address public owner = address(0x1);
    address public lendingPool = address(0x2);
    address public alice = address(0x10);

    function setUp() public {
        // Deploy mock tokens
        weth = new MockToken("Wrapped Ether", "WETH", 18);
        wbtc = new MockToken("Wrapped Bitcoin", "WBTC", 8);
        usdc = new MockToken("USD Coin", "USDC", 6);
        steth = new MockToken("Staked Ether", "stETH", 18);

        // Deploy mock price feeds (Chainlink uses 8 decimals)
        ethFeed = new MockPriceFeed(3000 * 1e8, 8);   // $3,000
        btcFeed = new MockPriceFeed(60000 * 1e8, 8);   // $60,000
        usdcFeed = new MockPriceFeed(1e8, 8);           // $1
        stethFeed = new MockPriceFeed(2950 * 1e8, 8);   // $2,950

        vm.startPrank(owner);
        cm = new CollateralManager(owner);

        // Configure collaterals per spec
        cm.configureCollateral(address(weth), 7500, 8000, 500, address(ethFeed), 18);
        cm.configureCollateral(address(wbtc), 7000, 7500, 500, address(btcFeed), 8);
        cm.configureCollateral(address(usdc), 8500, 9000, 300, address(usdcFeed), 6);
        cm.configureCollateral(address(steth), 7000, 7500, 500, address(stethFeed), 18);

        cm.setLendingPool(lendingPool);
        vm.stopPrank();

        // Fund Alice
        weth.mint(alice, 100 ether);
        wbtc.mint(alice, 10 * 1e8);
        usdc.mint(alice, 1_000_000 * 1e6);
        steth.mint(alice, 100 ether);

        vm.startPrank(alice);
        weth.approve(address(cm), type(uint256).max);
        wbtc.approve(address(cm), type(uint256).max);
        usdc.approve(address(cm), type(uint256).max);
        steth.approve(address(cm), type(uint256).max);
        vm.stopPrank();
    }

    /* ============================================================ */
    /*                    CONFIG TESTS                              */
    /* ============================================================ */

    function test_CollateralConfigured() public view {
        (bool active, uint256 ltv, uint256 liqThreshold, , , ) = cm.collateralConfigs(address(weth));
        assertTrue(active);
        assertEq(ltv, 7500);
        assertEq(liqThreshold, 8000);
    }

    function test_SupportedCollaterals() public view {
        address[] memory collaterals = cm.getSupportedCollaterals();
        assertEq(collaterals.length, 4);
    }

    function test_ConfigLtvGeThresholdReverts() public {
        MockPriceFeed newFeed = new MockPriceFeed(100 * 1e8, 8);
        vm.prank(owner);
        vm.expectRevert("CM: LTV >= liq threshold");
        cm.configureCollateral(address(0x99), 8000, 7500, 500, address(newFeed), 18);
    }

    /* ============================================================ */
    /*                    DEPOSIT TESTS                             */
    /* ============================================================ */

    function test_DepositCollateral() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 10 ether);

        (uint256 amount) = cm.userCollaterals(alice, address(weth));
        assertEq(amount, 10 ether);
    }

    function test_DepositUnsupportedReverts() public {
        MockToken fake = new MockToken("Fake", "FAKE", 18);
        fake.mint(alice, 100 ether);
        vm.prank(alice);
        fake.approve(address(cm), type(uint256).max);

        vm.prank(alice);
        vm.expectRevert("CM: unsupported collateral");
        cm.depositCollateral(address(fake), 10 ether);
    }

    function test_DepositZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert("CM: zero amount");
        cm.depositCollateral(address(weth), 0);
    }

    /* ============================================================ */
    /*                    PRICE TESTS                               */
    /* ============================================================ */

    function test_GetPrice() public view {
        uint256 ethPrice = cm.getPrice(address(weth));
        assertEq(ethPrice, 3000 * 1e18); // $3,000 in 18 decimals

        uint256 btcPrice = cm.getPrice(address(wbtc));
        assertEq(btcPrice, 60000 * 1e18); // $60,000
    }

    function test_StalePriceReverts() public {
        vm.warp(block.timestamp + 3 hours); // Ensure enough time for stale calc
        ethFeed.setStale();

        vm.expectRevert("CM: stale price");
        cm.getPrice(address(weth));
    }

    function test_InvalidPriceReverts() public {
        ethFeed.setPrice(0);

        vm.expectRevert("CM: invalid price");
        cm.getPrice(address(weth));
    }

    /* ============================================================ */
    /*                    COLLATERAL VALUE TESTS                    */
    /* ============================================================ */

    function test_TotalCollateralValue() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 10 ether); // 10 * $3000 = $30,000

        uint256 value = cm.totalCollateralValue(alice);
        assertEq(value, 30_000 * 1e18);
    }

    function test_MultiAssetCollateralValue() public {
        vm.startPrank(alice);
        cm.depositCollateral(address(weth), 10 ether);   // $30,000
        cm.depositCollateral(address(usdc), 10_000 * 1e6); // $10,000
        vm.stopPrank();

        uint256 value = cm.totalCollateralValue(alice);
        assertEq(value, 40_000 * 1e18);
    }

    /* ============================================================ */
    /*                    HEALTH FACTOR TESTS                       */
    /* ============================================================ */

    function test_HealthFactorNoDebt() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 10 ether);

        uint256 hf = cm.healthFactor(alice);
        assertEq(hf, type(uint256).max); // No borrows = infinite HF
    }

    function test_HealthFactorWithDebt() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 10 ether); // $30K collateral, 80% liq = $24K

        // Borrow $12K (HF = 24K / 12K = 2.0)
        vm.prank(lendingPool);
        cm.updateBorrowValue(alice, 12_000 * 1e18);

        uint256 hf = cm.healthFactor(alice);
        assertEq(hf, 2 * 1e18); // HF = 2.0
    }

    function test_HealthFactorLiquidatable() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 10 ether); // $30K, liq threshold $24K

        // Borrow $25K (HF = 24K / 25K = 0.96)
        vm.prank(lendingPool);
        cm.updateBorrowValue(alice, 25_000 * 1e18);

        assertTrue(cm.isLiquidatable(alice));
        assertLt(cm.healthFactor(alice), 1e18);
    }

    /* ============================================================ */
    /*                    WITHDRAW TESTS                            */
    /* ============================================================ */

    function test_WithdrawCollateral() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 10 ether);

        vm.prank(alice);
        cm.withdrawCollateral(address(weth), 5 ether);

        (uint256 amount) = cm.userCollaterals(alice, address(weth));
        assertEq(amount, 5 ether);
    }

    function test_WithdrawWouldLiquidateReverts() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 10 ether); // $30K

        // Borrow $20K (HF = 24K/20K = 1.2, just above 1)
        vm.prank(lendingPool);
        cm.updateBorrowValue(alice, 20_000 * 1e18);

        // Withdrawing 5 ETH would leave $15K collateral, $12K liq threshold
        // HF = 12K / 20K = 0.6 < 1 → should revert
        vm.prank(alice);
        vm.expectRevert("CM: withdrawal would liquidate");
        cm.withdrawCollateral(address(weth), 5 ether);
    }

    function test_WithdrawInsufficientReverts() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 5 ether);

        vm.prank(alice);
        vm.expectRevert("CM: insufficient collateral");
        cm.withdrawCollateral(address(weth), 10 ether);
    }

    /* ============================================================ */
    /*                    BORROW CAPACITY TESTS                     */
    /* ============================================================ */

    function test_MaxBorrowValue() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 10 ether); // $30K at 75% LTV = $22.5K

        uint256 maxBorrow = cm.maxBorrowValue(alice);
        assertEq(maxBorrow, 22_500 * 1e18);
    }

    function test_CanBorrow() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 10 ether); // $22.5K capacity

        assertTrue(cm.canBorrow(alice, 20_000 * 1e18));
        assertFalse(cm.canBorrow(alice, 23_000 * 1e18));
    }

    /* ============================================================ */
    /*                    USER INFO TEST                            */
    /* ============================================================ */

    function test_GetUserCollateralInfo() public {
        vm.prank(alice);
        cm.depositCollateral(address(weth), 10 ether);

        vm.prank(lendingPool);
        cm.updateBorrowValue(alice, 12_000 * 1e18);

        (
            address[] memory tokens, uint256[] memory amounts,
            uint256[] memory values, uint256 totalValue,
            uint256 hf, bool liquidatable
        ) = cm.getUserCollateralInfo(alice);

        assertEq(tokens.length, 4);
        assertEq(amounts[0], 10 ether);
        assertEq(values[0], 30_000 * 1e18);
        assertEq(totalValue, 30_000 * 1e18);
        assertEq(hf, 2 * 1e18);
        assertFalse(liquidatable);
    }
}
