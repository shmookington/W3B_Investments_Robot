// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {SyntheticFactory, SyntheticToken} from "../src/SyntheticFactory.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
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
        updatedAt = block.timestamp - 10 minutes;
    }
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, price, block.timestamp, updatedAt, 1);
    }
}

contract SyntheticFactoryTest is Test {
    SyntheticFactory public factory;
    MockUSDC public usdc;
    MockPriceFeed public aaplFeed;
    MockPriceFeed public tslaFeed;

    address public owner = address(0x1);
    address public alice = address(0x10);

    function setUp() public {
        usdc = new MockUSDC();
        aaplFeed = new MockPriceFeed(200 * 1e8, 8);  // $200 AAPL
        tslaFeed = new MockPriceFeed(180 * 1e8, 8);   // $180 TSLA

        vm.prank(owner);
        factory = new SyntheticFactory(address(usdc), 6, owner);

        // Fund Alice
        usdc.mint(alice, 100_000 * 1e6);
        vm.prank(alice);
        usdc.approve(address(factory), type(uint256).max);
    }

    /* ============================================================ */
    /*                    FACTORY CREATION TESTS                    */
    /* ============================================================ */

    function test_CreateSynthetic() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        assertNotEq(sAAPL, address(0));
        assertEq(factory.totalSynthetics(), 1);
        assertEq(factory.syntheticBySymbol("sAAPL"), sAAPL);
    }

    function test_CreateMultipleSynthetics() public {
        vm.prank(owner);
        factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));
        vm.prank(owner);
        factory.createSynthetic("Synthetic Tesla", "sTSLA", address(tslaFeed));

        assertEq(factory.totalSynthetics(), 2);
    }

    function test_DuplicateSymbolReverts() public {
        vm.prank(owner);
        factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        vm.prank(owner);
        vm.expectRevert("Factory: symbol exists");
        factory.createSynthetic("Synthetic Apple 2", "sAAPL", address(aaplFeed));
    }

    function test_OnlyOwnerCanCreate() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));
    }

    /* ============================================================ */
    /*                    MINT TESTS                                */
    /* ============================================================ */

    function test_Mint() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        // Mint 10 sAAPL at $200 = $2000 notional, 200% = $4000 collateral
        vm.prank(alice);
        factory.mint(sAAPL, 10 * 1e18);

        assertEq(SyntheticToken(sAAPL).balanceOf(alice), 10 * 1e18);
    }

    function test_RequiredCollateral() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        // 10 sAAPL at $200 = $2000 notional × 200% = $4000 = 4,000,000,000 (6 dec)
        uint256 required = factory.requiredCollateral(sAAPL, 10 * 1e18);
        assertEq(required, 4_000 * 1e6);
    }

    function test_MintLocksCollateral() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        uint256 balBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        factory.mint(sAAPL, 10 * 1e18);

        uint256 balAfter = usdc.balanceOf(alice);
        assertEq(balBefore - balAfter, 4_000 * 1e6);
    }

    function test_MintInactiveSynthReverts() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));
        vm.prank(owner);
        factory.deactivateSynthetic(sAAPL);

        vm.prank(alice);
        vm.expectRevert("Factory: inactive synth");
        factory.mint(sAAPL, 1 * 1e18);
    }

    /* ============================================================ */
    /*                    BURN TESTS                                */
    /* ============================================================ */

    function test_Burn() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        vm.prank(alice);
        factory.mint(sAAPL, 10 * 1e18);

        vm.prank(alice);
        factory.burn(sAAPL, 10 * 1e18);

        assertEq(SyntheticToken(sAAPL).balanceOf(alice), 0);
    }

    function test_BurnReturnsCollateral() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        factory.mint(sAAPL, 10 * 1e18); // Locks $4000

        vm.prank(alice);
        factory.burn(sAAPL, 10 * 1e18); // Returns $4000

        assertEq(usdc.balanceOf(alice), balBefore);
    }

    function test_PartialBurn() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        vm.prank(alice);
        factory.mint(sAAPL, 10 * 1e18);

        vm.prank(alice);
        factory.burn(sAAPL, 5 * 1e18); // Burn half

        assertEq(SyntheticToken(sAAPL).balanceOf(alice), 5 * 1e18);
        // Half collateral returned: $2000
        (uint256 synthMinted, uint256 collateralLocked) = factory.userPositions(sAAPL, alice);
        assertEq(synthMinted, 5 * 1e18);
        assertEq(collateralLocked, 2_000 * 1e6);
    }

    function test_BurnInsufficientReverts() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        vm.prank(alice);
        factory.mint(sAAPL, 5 * 1e18);

        vm.prank(alice);
        vm.expectRevert("Factory: insufficient minted");
        factory.burn(sAAPL, 10 * 1e18);
    }

    /* ============================================================ */
    /*                    COLLATERALIZATION TESTS                   */
    /* ============================================================ */

    function test_CollateralizationRatio() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        vm.prank(alice);
        factory.mint(sAAPL, 10 * 1e18);

        // Should be 200% (20000 BPS)
        uint256 ratio = factory.collateralizationRatio(sAAPL, alice);
        assertEq(ratio, 20_000);
    }

    function test_CollateralRatioAfterPriceIncrease() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        vm.prank(alice);
        factory.mint(sAAPL, 10 * 1e18); // $200 price

        // Price rises to $400 → collateral ratio drops to 100%
        aaplFeed.setPrice(400 * 1e8);

        uint256 ratio = factory.collateralizationRatio(sAAPL, alice);
        assertEq(ratio, 10_000); // 100%
    }

    /* ============================================================ */
    /*                    PRICE TESTS                               */
    /* ============================================================ */

    function test_GetAssetPrice() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        uint256 price = factory.getAssetPrice(sAAPL);
        assertEq(price, 200 * 1e18); // $200 in 18 decimals
    }

    function test_StalePriceReverts() public {
        vm.prank(owner);
        address sAAPL = factory.createSynthetic("Synthetic Apple", "sAAPL", address(aaplFeed));

        vm.warp(block.timestamp + 1 hours);
        aaplFeed.setStale();

        vm.prank(alice);
        vm.expectRevert("Factory: stale price");
        factory.mint(sAAPL, 1 * 1e18);
    }
}
