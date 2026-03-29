// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {OracleAggregator} from "../src/OracleAggregator.sol";

/// @dev Mock Chainlink feed
contract MockChainlink {
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
    function setStale() external { updatedAt = block.timestamp - 10 minutes; }
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, price, block.timestamp, updatedAt, 1);
    }
}

/// @dev Mock Pyth feed
contract MockPyth {
    int64 public price;
    int32 public expo;
    uint256 public publishTime;

    constructor(int64 _price, int32 _expo) {
        price = _price;
        expo = _expo;
        publishTime = block.timestamp;
    }
    function setPrice(int64 _price) external {
        price = _price;
        publishTime = block.timestamp;
    }
    function setStale() external { publishTime = block.timestamp - 10 minutes; }
    function getPrice() external view returns (int64, uint64, int32, uint256) {
        return (price, 0, expo, publishTime);
    }
}

contract OracleAggregatorTest is Test {
    OracleAggregator public oracle;
    MockChainlink public chainlinkETH;
    MockPyth public pythETH;
    MockChainlink public chainlinkAAPL;

    address public owner = address(0x1);
    address public relayer = address(0x5);

    function setUp() public {
        // ETH: $3000
        chainlinkETH = new MockChainlink(3000 * 1e8, 8);
        pythETH = new MockPyth(300000, -2); // 300000 * 10^-2 = $3000

        // AAPL: $200
        chainlinkAAPL = new MockChainlink(200 * 1e8, 8);

        vm.startPrank(owner);
        oracle = new OracleAggregator(owner);
        oracle.setRelayer(relayer);

        // Configure ETH with Chainlink (primary) + Pyth (secondary)
        oracle.configureFeed("ETH", address(chainlinkETH), OracleAggregator.FeedType.CHAINLINK, 0);
        oracle.configureFeed("ETH", address(pythETH), OracleAggregator.FeedType.PYTH, 1);

        // Configure AAPL with Chainlink only
        oracle.configureFeed("AAPL", address(chainlinkAAPL), OracleAggregator.FeedType.CHAINLINK, 0);
        vm.stopPrank();
    }

    /* ============================================================ */
    /*                    BASIC PRICE TESTS                         */
    /* ============================================================ */

    function test_GetPriceSingleSource() public view {
        uint256 price = oracle.getPrice("AAPL");
        assertEq(price, 200 * 1e18);
    }

    function test_GetPriceMultipleSources() public view {
        uint256 price = oracle.getPrice("ETH");
        // Median of $3000 (Chainlink) and $3000 (Pyth) = $3000
        assertEq(price, 3000 * 1e18);
    }

    function test_UnknownAssetReverts() public {
        vm.expectRevert("Oracle: unknown asset");
        oracle.getPrice("UNKNOWN");
    }

    /* ============================================================ */
    /*                    MEDIAN TESTS                              */
    /* ============================================================ */

    function test_MedianWithDifferentPrices() public {
        // Slightly different prices within 2% deviation
        chainlinkETH.setPrice(3000 * 1e8);
        pythETH.setPrice(3030); // 3030 * 10^-2 = $30.30 ... 
        // Actually Pyth: 303000 * 10^-2 = $3030
        pythETH.setPrice(303000); // $3030 (1% difference, within 2%)

        uint256 price = oracle.getPrice("ETH");
        // Median of 3000 and 3030 = 3015
        assertEq(price, 3015 * 1e18);
    }

    /* ============================================================ */
    /*                    DEVIATION TESTS                           */
    /* ============================================================ */

    function test_DeviationExceedsThresholdReverts() public {
        // Chainlink: $3000, Pyth: $3100 (3.3% deviation)
        pythETH.setPrice(310000); // $3100

        vm.expectRevert("Oracle: price deviation > 2%");
        oracle.getPrice("ETH");
    }

    function test_DeviationWithinThreshold() public view {
        // Both at $3000 — 0% deviation
        uint256 price = oracle.getPrice("ETH");
        assertEq(price, 3000 * 1e18);
    }

    /* ============================================================ */
    /*                    STALENESS TESTS                           */
    /* ============================================================ */

    function test_StalePrimaryFallsToSecondary() public {
        vm.warp(block.timestamp + 1 hours);
        chainlinkETH.setStale();
        // Pyth is still fresh
        pythETH.setPrice(300000);

        (uint256 price, OracleAggregator.FeedType source) = oracle.getPriceWithFallback("ETH");
        assertEq(price, 3000 * 1e18);
        assertEq(uint256(source), uint256(OracleAggregator.FeedType.PYTH));
    }

    function test_AllStaleFallsToCachedReverts() public {
        vm.warp(block.timestamp + 1 hours);
        chainlinkETH.setStale();
        pythETH.setStale();

        // No cached price either
        vm.expectRevert("Oracle: no valid price");
        oracle.getPrice("ETH");
    }

    /* ============================================================ */
    /*                    FALLBACK TESTS                            */
    /* ============================================================ */

    function test_FallbackToSecondary() public {
        vm.warp(block.timestamp + 1 hours);
        chainlinkETH.setStale();
        pythETH.setPrice(300000); // Fresh Pyth price

        (uint256 price, OracleAggregator.FeedType source) = oracle.getPriceWithFallback("ETH");
        assertEq(price, 3000 * 1e18);
        assertEq(uint256(source), uint256(OracleAggregator.FeedType.PYTH));
    }

    /* ============================================================ */
    /*                    CUSTOM RELAY TESTS                        */
    /* ============================================================ */

    function test_SetCustomPrice() public {
        address customFeed = address(0x99);

        vm.prank(owner);
        oracle.configureFeed("TSLA", customFeed, OracleAggregator.FeedType.CUSTOM, 0);

        vm.prank(relayer);
        oracle.setCustomPrice(customFeed, 180 * 1e8, 8);

        uint256 price = oracle.getPrice("TSLA");
        assertEq(price, 180 * 1e18);
    }

    function test_BatchSetCustomPrices() public {
        address feed1 = address(0x91);
        address feed2 = address(0x92);

        vm.startPrank(owner);
        oracle.configureFeed("GOOGL", feed1, OracleAggregator.FeedType.CUSTOM, 0);
        oracle.configureFeed("MSFT", feed2, OracleAggregator.FeedType.CUSTOM, 0);
        vm.stopPrank();

        address[] memory feeds = new address[](2);
        int256[] memory prices = new int256[](2);
        uint8[] memory decs = new uint8[](2);

        feeds[0] = feed1; feeds[1] = feed2;
        prices[0] = 170 * 1e8; prices[1] = 420 * 1e8;
        decs[0] = 8; decs[1] = 8;

        vm.prank(relayer);
        oracle.batchSetCustomPrices(feeds, prices, decs);

        assertEq(oracle.getPrice("GOOGL"), 170 * 1e18);
        assertEq(oracle.getPrice("MSFT"), 420 * 1e18);
    }

    function test_UnauthorizedRelayerReverts() public {
        vm.prank(address(0xBAD));
        vm.expectRevert("Oracle: unauthorized");
        oracle.setCustomPrice(address(0x99), 100 * 1e8, 8);
    }

    /* ============================================================ */
    /*                    CONFIG TESTS                              */
    /* ============================================================ */

    function test_FeedCount() public view {
        assertEq(oracle.feedCount("ETH"), 2);
        assertEq(oracle.feedCount("AAPL"), 1);
    }

    function test_TotalAssets() public view {
        assertEq(oracle.totalAssets(), 2); // ETH + AAPL
    }

    function test_GetAllPrices() public view {
        OracleAggregator.PriceData[] memory prices = oracle.getAllPrices("ETH");
        assertEq(prices.length, 2);
        assertEq(prices[0].price, 3000 * 1e18);
    }
}
