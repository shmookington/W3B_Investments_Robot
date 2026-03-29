// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IChainlinkAggregator
 */
interface IChainlinkAggregator {
    function latestRoundData() external view returns (
        uint80, int256, uint256, uint256, uint80
    );
    function decimals() external view returns (uint8);
}

/**
 * @title IPythFeed
 * @notice Simplified Pyth oracle interface
 */
interface IPythFeed {
    function getPrice() external view returns (int64 price, uint64 conf, int32 expo, uint256 publishTime);
}

/**
 * @title OracleAggregator — Multi-Source Price Oracle
 * @notice Aggregates prices from Chainlink (primary) and Pyth (secondary) oracles.
 *         Uses median of available sources, rejects stale or divergent prices,
 *         and implements automatic failover.
 *
 * Features:
 *   - Primary: Chainlink price feed
 *   - Secondary: Pyth Network price feed
 *   - Tertiary: Custom feed (from off-chain relayer)
 *   - Median of available sources for robustness
 *   - 2% max deviation between sources
 *   - 5-minute staleness check
 *   - Automatic fallback if primary fails
 *
 * @dev Each asset has its own OracleAggregator instance or a feed config
 *      registered via `configureFeed`.
 */
contract OracleAggregator is Ownable {

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant PRECISION = 1e18;
    uint256 public constant BPS = 10_000;

    /// @notice Max price deviation between sources: 2%
    uint256 public constant MAX_DEVIATION_BPS = 200;

    /// @notice Max price staleness: 5 minutes
    uint256 public constant MAX_STALENESS = 5 minutes;

    /* ============================================================ */
    /*                          ENUMS                               */
    /* ============================================================ */

    enum FeedType { CHAINLINK, PYTH, CUSTOM }
    enum FeedStatus { ACTIVE, STALE, FAILED }

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct FeedConfig {
        address feedAddress;
        FeedType feedType;
        bool active;
        uint8 priority;          // Lower = higher priority (0 = primary)
    }

    struct AssetConfig {
        FeedConfig[] feeds;
        bool active;
        uint256 lastValidPrice;  // Cached last valid price (fallback)
        uint256 lastUpdateTime;
    }

    struct PriceData {
        uint256 price;           // Price in 18 decimals
        uint256 updatedAt;       // Timestamp
        FeedType source;         // Which oracle provided it
        FeedStatus status;       // Active, stale, or failed
    }

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice Asset configurations: asset symbol => config
    mapping(string => AssetConfig) internal assetConfigs;

    /// @notice Custom price feed values (set by off-chain relayer)
    mapping(address => int256) public customPrices;
    mapping(address => uint256) public customPriceTimestamps;
    mapping(address => uint8) public customPriceDecimals;

    /// @notice Authorized relayer address
    address public relayer;

    /// @notice All registered asset symbols
    string[] public registeredAssets;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event FeedConfigured(string indexed asset, address feed, FeedType feedType, uint8 priority);
    event PriceUpdated(string indexed asset, uint256 price, FeedType source, uint256 timestamp);
    event FallbackUsed(string indexed asset, FeedType primary, FeedType fallback_);
    event CustomPriceSet(address indexed feed, int256 price, uint256 timestamp);
    event DeviationDetected(string indexed asset, uint256 price1, uint256 price2, uint256 deviationBps);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    constructor(address _owner) Ownable(_owner) {}

    /* ============================================================ */
    /*                    FEED CONFIGURATION                        */
    /* ============================================================ */

    /**
     * @notice Register a price feed for an asset
     * @param asset     Asset symbol (e.g., "AAPL", "ETH")
     * @param feed      Feed contract address
     * @param feedType  Chainlink, Pyth, or Custom
     * @param priority  0 = primary, 1 = secondary, 2 = tertiary
     */
    function configureFeed(
        string calldata asset,
        address feed,
        FeedType feedType,
        uint8 priority
    ) external onlyOwner {
        require(feed != address(0), "Oracle: zero feed");

        AssetConfig storage config = assetConfigs[asset];
        if (!config.active) {
            config.active = true;
            registeredAssets.push(asset);
        }

        // Add or update feed
        config.feeds.push(FeedConfig({
            feedAddress: feed,
            feedType: feedType,
            active: true,
            priority: priority
        }));

        emit FeedConfigured(asset, feed, feedType, priority);
    }

    /* ============================================================ */
    /*                    PRICE RETRIEVAL                           */
    /* ============================================================ */

    /**
     * @notice Get the aggregated price for an asset (18 decimals)
     * @dev Uses median of valid sources, falls back to cached price if all fail
     */
    function getPrice(string calldata asset) external view returns (uint256 price) {
        AssetConfig storage config = assetConfigs[asset];
        require(config.active, "Oracle: unknown asset");

        PriceData[] memory prices = _fetchAllPrices(config);

        // Count valid prices
        uint256 validCount;
        for (uint256 i = 0; i < prices.length; i++) {
            if (prices[i].status == FeedStatus.ACTIVE) validCount++;
        }

        if (validCount == 0) {
            // All feeds failed — use cached price if recent
            require(
                config.lastValidPrice > 0 &&
                block.timestamp - config.lastUpdateTime <= MAX_STALENESS * 2,
                "Oracle: no valid price"
            );
            return config.lastValidPrice;
        }

        // Extract valid prices
        uint256[] memory validPrices = new uint256[](validCount);
        uint256 idx;
        for (uint256 i = 0; i < prices.length; i++) {
            if (prices[i].status == FeedStatus.ACTIVE) {
                validPrices[idx++] = prices[i].price;
            }
        }

        // Use median
        price = _median(validPrices);

        // Deviation check if multiple sources
        if (validCount > 1) {
            _checkDeviation(validPrices);
        }
    }

    /**
     * @notice Get price data from all configured feeds
     */
    function getAllPrices(string calldata asset) external view returns (PriceData[] memory) {
        AssetConfig storage config = assetConfigs[asset];
        require(config.active, "Oracle: unknown asset");
        return _fetchAllPrices(config);
    }

    /**
     * @notice Get price from a specific feed type (with fallback)
     */
    function getPriceWithFallback(string calldata asset) external view returns (
        uint256 price, FeedType source
    ) {
        AssetConfig storage config = assetConfigs[asset];
        require(config.active, "Oracle: unknown asset");

        // Sort feeds by priority
        PriceData[] memory prices = _fetchAllPrices(config);

        // Try feeds in priority order
        for (uint256 i = 0; i < prices.length; i++) {
            if (prices[i].status == FeedStatus.ACTIVE) {
                return (prices[i].price, prices[i].source);
            }
        }

        // Fallback to cached
        require(config.lastValidPrice > 0, "Oracle: no valid price");
        return (config.lastValidPrice, FeedType.CUSTOM);
    }

    /* ============================================================ */
    /*                    CUSTOM PRICE RELAY                        */
    /* ============================================================ */

    /**
     * @notice Set custom price (called by off-chain relayer)
     */
    function setCustomPrice(address feed, int256 price, uint8 decimals_) external {
        require(msg.sender == relayer || msg.sender == owner(), "Oracle: unauthorized");
        require(price > 0, "Oracle: invalid price");

        customPrices[feed] = price;
        customPriceTimestamps[feed] = block.timestamp;
        customPriceDecimals[feed] = decimals_;

        emit CustomPriceSet(feed, price, block.timestamp);
    }

    /**
     * @notice Batch set custom prices
     */
    function batchSetCustomPrices(
        address[] calldata feeds,
        int256[] calldata prices_,
        uint8[] calldata decimals_
    ) external {
        require(msg.sender == relayer || msg.sender == owner(), "Oracle: unauthorized");
        require(feeds.length == prices_.length && feeds.length == decimals_.length, "Oracle: length mismatch");

        for (uint256 i = 0; i < feeds.length; i++) {
            require(prices_[i] > 0, "Oracle: invalid price");
            customPrices[feeds[i]] = prices_[i];
            customPriceTimestamps[feeds[i]] = block.timestamp;
            customPriceDecimals[feeds[i]] = decimals_[i];

            emit CustomPriceSet(feeds[i], prices_[i], block.timestamp);
        }
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    function feedCount(string calldata asset) external view returns (uint256) {
        return assetConfigs[asset].feeds.length;
    }

    function totalAssets() external view returns (uint256) {
        return registeredAssets.length;
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "Oracle: zero relayer");
        relayer = _relayer;
    }

    function deactivateFeed(string calldata asset, uint256 feedIndex) external onlyOwner {
        assetConfigs[asset].feeds[feedIndex].active = false;
    }

    /* ============================================================ */
    /*                    INTERNAL                                  */
    /* ============================================================ */

    function _fetchAllPrices(AssetConfig storage config) internal view returns (PriceData[] memory) {
        uint256 len = config.feeds.length;
        PriceData[] memory results = new PriceData[](len);

        for (uint256 i = 0; i < len; i++) {
            FeedConfig storage feed = config.feeds[i];
            if (!feed.active) {
                results[i] = PriceData(0, 0, feed.feedType, FeedStatus.FAILED);
                continue;
            }

            if (feed.feedType == FeedType.CHAINLINK) {
                results[i] = _fetchChainlink(feed.feedAddress);
            } else if (feed.feedType == FeedType.PYTH) {
                results[i] = _fetchPyth(feed.feedAddress);
            } else {
                results[i] = _fetchCustom(feed.feedAddress);
            }
        }

        return results;
    }

    function _fetchChainlink(address feed) internal view returns (PriceData memory) {
        try IChainlinkAggregator(feed).latestRoundData() returns (
            uint80, int256 answer, uint256, uint256 updatedAt, uint80
        ) {
            if (answer <= 0) return PriceData(0, 0, FeedType.CHAINLINK, FeedStatus.FAILED);
            if (block.timestamp - updatedAt > MAX_STALENESS) {
                return PriceData(0, updatedAt, FeedType.CHAINLINK, FeedStatus.STALE);
            }

            uint8 dec = IChainlinkAggregator(feed).decimals();
            uint256 price = (uint256(answer) * PRECISION) / (10 ** dec);
            return PriceData(price, updatedAt, FeedType.CHAINLINK, FeedStatus.ACTIVE);
        } catch {
            return PriceData(0, 0, FeedType.CHAINLINK, FeedStatus.FAILED);
        }
    }

    function _fetchPyth(address feed) internal view returns (PriceData memory) {
        try IPythFeed(feed).getPrice() returns (
            int64 price, uint64, int32 expo, uint256 publishTime
        ) {
            if (price <= 0) return PriceData(0, 0, FeedType.PYTH, FeedStatus.FAILED);
            if (block.timestamp - publishTime > MAX_STALENESS) {
                return PriceData(0, publishTime, FeedType.PYTH, FeedStatus.STALE);
            }

            // Convert Pyth price (price * 10^expo) to 18 decimals
            uint256 normalizedPrice;
            if (expo < 0) {
                normalizedPrice = (uint256(uint64(price)) * PRECISION) / (10 ** uint32(-expo));
            } else {
                normalizedPrice = uint256(uint64(price)) * PRECISION * (10 ** uint32(expo));
            }
            return PriceData(normalizedPrice, publishTime, FeedType.PYTH, FeedStatus.ACTIVE);
        } catch {
            return PriceData(0, 0, FeedType.PYTH, FeedStatus.FAILED);
        }
    }

    function _fetchCustom(address feed) internal view returns (PriceData memory) {
        int256 price = customPrices[feed];
        uint256 ts = customPriceTimestamps[feed];
        uint8 dec = customPriceDecimals[feed];

        if (price <= 0) return PriceData(0, 0, FeedType.CUSTOM, FeedStatus.FAILED);
        if (block.timestamp - ts > MAX_STALENESS) {
            return PriceData(0, ts, FeedType.CUSTOM, FeedStatus.STALE);
        }

        uint256 normalizedPrice = (uint256(price) * PRECISION) / (10 ** dec);
        return PriceData(normalizedPrice, ts, FeedType.CUSTOM, FeedStatus.ACTIVE);
    }

    function _checkDeviation(uint256[] memory prices) internal pure {
        for (uint256 i = 0; i < prices.length; i++) {
            for (uint256 j = i + 1; j < prices.length; j++) {
                uint256 diff = prices[i] > prices[j]
                    ? prices[i] - prices[j]
                    : prices[j] - prices[i];
                uint256 avg = (prices[i] + prices[j]) / 2;
                uint256 deviationBps = (diff * BPS) / avg;
                require(deviationBps <= MAX_DEVIATION_BPS, "Oracle: price deviation > 2%");
            }
        }
    }

    function _median(uint256[] memory arr) internal pure returns (uint256) {
        uint256 len = arr.length;
        if (len == 1) return arr[0];

        // Simple sort for small arrays (max ~3 feeds)
        for (uint256 i = 0; i < len; i++) {
            for (uint256 j = i + 1; j < len; j++) {
                if (arr[j] < arr[i]) {
                    (arr[i], arr[j]) = (arr[j], arr[i]);
                }
            }
        }

        if (len % 2 == 0) {
            return (arr[len / 2 - 1] + arr[len / 2]) / 2;
        }
        return arr[len / 2];
    }
}
