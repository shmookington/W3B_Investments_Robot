// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {SyntheticExchange} from "../src/SyntheticExchange.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @dev Mock synthetic token (mint/burn by owner)
contract MockSynth is ERC20, Ownable {
    constructor(string memory name, string memory symbol)
        ERC20(name, symbol) Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function burn(address from, uint256 amount) external { _burn(from, amount); }
    function transferOwnershipTo(address newOwner) external { transferOwnership(newOwner); }
}

/// @dev Mock oracle aggregator
contract MockOracle {
    mapping(string => uint256) public prices;

    function setPrice(string memory symbol, uint256 price) external {
        prices[symbol] = price;
    }
    function getPrice(string calldata symbol) external view returns (uint256) {
        return prices[symbol];
    }
}

contract SyntheticExchangeTest is Test {
    SyntheticExchange public exchange;
    MockOracle public oracle;
    MockSynth public sAAPL;
    MockSynth public sTSLA;

    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public patriotYield = address(0x3);
    address public lpPool = address(0x4);
    address public alice = address(0x10);

    function setUp() public {
        oracle = new MockOracle();
        oracle.setPrice("AAPL", 200 * 1e18);  // $200
        oracle.setPrice("TSLA", 180 * 1e18);  // $180

        sAAPL = new MockSynth("Synthetic Apple", "sAAPL");
        sTSLA = new MockSynth("Synthetic Tesla", "sTSLA");

        vm.prank(owner);
        exchange = new SyntheticExchange(
            address(oracle), treasury, patriotYield, lpPool, owner
        );

        // Register synths
        vm.startPrank(owner);
        exchange.registerSynth(address(sAAPL), "AAPL");
        exchange.registerSynth(address(sTSLA), "TSLA");
        vm.stopPrank();

        // Transfer ownership of synths to exchange (for mint/burn)
        sAAPL.transferOwnershipTo(address(exchange));
        sTSLA.transferOwnershipTo(address(exchange));

        // Give Alice some sAAPL
        // Mint before ownership transfer won't work — mint as exchange
        vm.prank(address(exchange));
        sAAPL.mint(alice, 100 * 1e18); // 100 sAAPL
    }

    /* ============================================================ */
    /*                    SWAP TESTS                                */
    /* ============================================================ */

    function test_Swap() public {
        // Swap 10 sAAPL ($2000) → sTSLA ($180 each)
        // After 0.3% fee: $2000 * 0.997 = $1994
        // Expected sTSLA: $1994 / $180 = ~11.077... sTSLA
        vm.prank(alice);
        SyntheticExchange.SwapResult memory result = exchange.swap(
            address(sAAPL), address(sTSLA), 10 * 1e18, 100
        );

        assertEq(result.amountIn, 10 * 1e18);
        assertGt(result.amountOut, 0);
        assertGt(result.feeTotal, 0);

        // Alice should have sAAPL reduced and sTSLA added
        assertEq(sAAPL.balanceOf(alice), 90 * 1e18);
        assertGt(sTSLA.balanceOf(alice), 0);
    }

    function test_SwapFee() public {
        vm.prank(alice);
        SyntheticExchange.SwapResult memory result = exchange.swap(
            address(sAAPL), address(sTSLA), 10 * 1e18, 100
        );

        // Fee = valueIn * 0.3% = $2000 * 0.003 = $6
        assertEq(result.feeTotal, 6 * 1e18);
    }

    function test_FeeDistribution() public {
        vm.prank(alice);
        SyntheticExchange.SwapResult memory result = exchange.swap(
            address(sAAPL), address(sTSLA), 10 * 1e18, 100
        );

        // 70% LP, 20% treasury, 10% patriot
        // $6 fee: LP=$4.2, Treasury=$1.2, Patriot=$0.6
        uint256 fee = result.feeTotal; // 6e18
        assertEq(result.feeLp, (fee * 7000) / 10_000);
        assertEq(result.feeTreasury, (fee * 2000) / 10_000);
        assertEq(result.feePatriot, fee - result.feeLp - result.feeTreasury);
    }

    function test_SwapZeroAmountReverts() public {
        vm.prank(alice);
        vm.expectRevert("Exchange: zero amount");
        exchange.swap(address(sAAPL), address(sTSLA), 0, 100);
    }

    function test_SwapSameTokenReverts() public {
        vm.prank(alice);
        vm.expectRevert("Exchange: same token");
        exchange.swap(address(sAAPL), address(sAAPL), 10 * 1e18, 100);
    }

    function test_SwapInactiveSynthReverts() public {
        vm.prank(owner);
        exchange.deactivateSynth(address(sTSLA));

        vm.prank(alice);
        vm.expectRevert("Exchange: synthOut inactive");
        exchange.swap(address(sAAPL), address(sTSLA), 10 * 1e18, 100);
    }

    /* ============================================================ */
    /*                    SLIPPAGE TESTS                            */
    /* ============================================================ */

    function test_SlippageProtection() public {
        // Swap should pass with reasonable slippage
        vm.prank(alice);
        SyntheticExchange.SwapResult memory result = exchange.swap(
            address(sAAPL), address(sTSLA), 10 * 1e18, 100 // 1% slippage OK
        );
        assertGt(result.amountOut, 0);
    }

    function test_SlippageExceededReverts() public {
        // Set very tight slippage (0.01%) — fee of 0.3% will exceed this
        vm.prank(alice);
        vm.expectRevert("Exchange: slippage exceeded");
        exchange.swap(address(sAAPL), address(sTSLA), 10 * 1e18, 1);
    }

    /* ============================================================ */
    /*                    PREVIEW TESTS                             */
    /* ============================================================ */

    function test_PreviewSwap() public view {
        (uint256 amountOut, uint256 fee) = exchange.previewSwap(
            address(sAAPL), address(sTSLA), 10 * 1e18
        );

        assertGt(amountOut, 0);
        assertEq(fee, 6 * 1e18); // $6 fee
    }

    function test_GetRate() public view {
        // AAPL/TSLA = $200/$180 = 1.111...
        uint256 rate = exchange.getRate(address(sAAPL), address(sTSLA));
        assertGt(rate, 1e18); // > 1:1
    }

    /* ============================================================ */
    /*                    STATS TESTS                               */
    /* ============================================================ */

    function test_ExchangeStats() public {
        vm.prank(alice);
        exchange.swap(address(sAAPL), address(sTSLA), 10 * 1e18, 100);

        (uint256 swaps, uint256 volume, uint256 fees, , , ) = exchange.exchangeStats();
        assertEq(swaps, 1);
        assertEq(volume, 2000 * 1e18); // $2000 trade
        assertEq(fees, 6 * 1e18);
    }

    function test_MultipleSwapsAccumulate() public {
        vm.prank(alice);
        exchange.swap(address(sAAPL), address(sTSLA), 5 * 1e18, 100);

        vm.prank(alice);
        exchange.swap(address(sAAPL), address(sTSLA), 5 * 1e18, 100);

        (uint256 swaps, , , , , ) = exchange.exchangeStats();
        assertEq(swaps, 2);
    }

    /* ============================================================ */
    /*                    REGISTRATION TESTS                        */
    /* ============================================================ */

    function test_RegisterSynth() public view {
        assertEq(exchange.totalRegistered(), 2);
    }

    function test_DuplicateRegistrationReverts() public {
        vm.prank(owner);
        vm.expectRevert("Exchange: already registered");
        exchange.registerSynth(address(sAAPL), "AAPL");
    }
}
