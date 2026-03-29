// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {W3BProtocol} from "../src/W3BProtocol.sol";

contract W3BProtocolTest is Test {
    W3BProtocol public w3b;

    address public owner = address(0x1);
    address public vault = address(0x10);
    address public splitter = address(0x11);
    address public feeCollector = address(0x12);
    address public insurance = address(0x13);
    address public proof = address(0x14);

    function setUp() public {
        vm.prank(owner);
        w3b = new W3BProtocol(owner, "2.0.0", false);
    }

    /* ============================================================ */
    /*                    INITIALIZATION TESTS                      */
    /* ============================================================ */

    function test_Initialize() public {
        vm.prank(owner);
        w3b.initialize(vault, splitter, feeCollector, insurance, proof);

        assertTrue(w3b.initialized());
        assertEq(w3b.contractCount(), 5);
    }

    function test_InitializeRegistersAllContracts() public {
        vm.prank(owner);
        w3b.initialize(vault, splitter, feeCollector, insurance, proof);

        assertEq(w3b.getContract("SovereignVault"), vault);
        assertEq(w3b.getContract("ProfitSplitter"), splitter);
        assertEq(w3b.getContract("FeeCollector"), feeCollector);
        assertEq(w3b.getContract("InsuranceFund"), insurance);
        assertEq(w3b.getContract("ProofOfReserve"), proof);
    }

    function test_DoubleInitializeReverts() public {
        vm.prank(owner);
        w3b.initialize(vault, splitter, feeCollector, insurance, proof);

        vm.prank(owner);
        vm.expectRevert("W3B: already initialized");
        w3b.initialize(vault, splitter, feeCollector, insurance, proof);
    }

    function test_InitializeZeroVaultReverts() public {
        vm.prank(owner);
        vm.expectRevert("W3B: zero vault");
        w3b.initialize(address(0), splitter, feeCollector, insurance, proof);
    }

    function test_InitializeZeroSplitterReverts() public {
        vm.prank(owner);
        vm.expectRevert("W3B: zero splitter");
        w3b.initialize(vault, address(0), feeCollector, insurance, proof);
    }

    function test_InitializeZeroFeeCollectorReverts() public {
        vm.prank(owner);
        vm.expectRevert("W3B: zero fee collector");
        w3b.initialize(vault, splitter, address(0), insurance, proof);
    }

    function test_InitializeZeroInsuranceReverts() public {
        vm.prank(owner);
        vm.expectRevert("W3B: zero insurance");
        w3b.initialize(vault, splitter, feeCollector, address(0), proof);
    }

    function test_InitializeZeroProofReverts() public {
        vm.prank(owner);
        vm.expectRevert("W3B: zero proof");
        w3b.initialize(vault, splitter, feeCollector, insurance, address(0));
    }

    function test_InitializeOnlyOwner() public {
        vm.prank(address(0x99));
        vm.expectRevert();
        w3b.initialize(vault, splitter, feeCollector, insurance, proof);
    }

    /* ============================================================ */
    /*                    REGISTER / UPDATE / DEACTIVATE            */
    /* ============================================================ */

    function test_RegisterContract() public {
        vm.prank(owner);
        w3b.registerContract("NewContract", address(0xAA), "1.0.0");

        assertEq(w3b.getContract("NewContract"), address(0xAA));
        assertEq(w3b.contractCount(), 1);
    }

    function test_RegisterDuplicateReverts() public {
        vm.prank(owner);
        w3b.registerContract("TestContract", address(0xAA), "1.0.0");

        vm.prank(owner);
        vm.expectRevert("W3B: already registered");
        w3b.registerContract("TestContract", address(0xBB), "1.0.0");
    }

    function test_RegisterZeroAddressReverts() public {
        vm.prank(owner);
        vm.expectRevert("W3B: zero address");
        w3b.registerContract("Invalid", address(0), "1.0.0");
    }

    function test_UpdateContract() public {
        vm.prank(owner);
        w3b.registerContract("TestContract", address(0xAA), "1.0.0");

        address newAddr = address(0xBB);
        vm.prank(owner);
        w3b.updateContract("TestContract", newAddr, "2.0.0");

        assertEq(w3b.getContract("TestContract"), newAddr);
    }

    function test_UpdateNotRegisteredReverts() public {
        vm.prank(owner);
        vm.expectRevert("W3B: not registered");
        w3b.updateContract("Unknown", address(0xBB), "2.0.0");
    }

    function test_UpdateZeroAddressReverts() public {
        vm.prank(owner);
        w3b.registerContract("TestContract", address(0xAA), "1.0.0");

        vm.prank(owner);
        vm.expectRevert("W3B: zero address");
        w3b.updateContract("TestContract", address(0), "2.0.0");
    }

    function test_DeactivateContract() public {
        vm.prank(owner);
        w3b.registerContract("TestContract", address(0xAA), "1.0.0");

        vm.prank(owner);
        w3b.deactivateContract("TestContract");

        // Getting deactivated contract should revert
        vm.expectRevert("W3B: inactive");
        w3b.getContract("TestContract");
    }

    function test_DeactivateNotRegisteredReverts() public {
        vm.prank(owner);
        vm.expectRevert("W3B: not registered");
        w3b.deactivateContract("Unknown");
    }

    function test_DeactivateAlreadyInactiveReverts() public {
        vm.prank(owner);
        w3b.registerContract("TestContract", address(0xAA), "1.0.0");

        vm.prank(owner);
        w3b.deactivateContract("TestContract");

        vm.prank(owner);
        vm.expectRevert("W3B: already inactive");
        w3b.deactivateContract("TestContract");
    }

    /* ============================================================ */
    /*                    VIEW FUNCTION TESTS                       */
    /* ============================================================ */

    function test_GetContractInfo() public {
        vm.prank(owner);
        w3b.registerContract("TestContract", address(0xAA), "1.0.0");

        W3BProtocol.ContractInfo memory info = w3b.getContractInfo("TestContract");
        assertEq(info.addr, address(0xAA));
        assertTrue(info.active);
    }

    function test_GetContractInfoNotFoundReverts() public {
        vm.expectRevert("W3B: not found");
        w3b.getContractInfo("Unknown");
    }

    function test_GetContractNotFoundReverts() public {
        vm.expectRevert("W3B: not found");
        w3b.getContract("Unknown");
    }

    function test_GetContractNames() public {
        vm.prank(owner);
        w3b.initialize(vault, splitter, feeCollector, insurance, proof);

        string[] memory names = w3b.getContractNames();
        assertEq(names.length, 5);
    }

    function test_ProtocolStatus() public {
        vm.prank(owner);
        w3b.initialize(vault, splitter, feeCollector, insurance, proof);

        (
            string memory name, string memory version,
            uint256 count, bool init, bool proxy
        ) = w3b.protocolStatus();

        assertEq(name, "W3B Sovereign Reserve");
        assertEq(version, "2.0.0");
        assertEq(count, 5);
        assertTrue(init);
        assertFalse(proxy);
    }

    /* ============================================================ */
    /*                    ADMIN TESTS                               */
    /* ============================================================ */

    function test_SetProtocolVersion() public {
        vm.prank(owner);
        w3b.setProtocolVersion("3.0.0");

        assertEq(w3b.protocolVersion(), "3.0.0");
    }

    function test_SetUsingProxy() public {
        vm.prank(owner);
        w3b.setUsingProxy(true);

        assertTrue(w3b.usingProxy());
    }

    function test_OnlyOwnerAdmin() public {
        vm.prank(address(0x99));
        vm.expectRevert();
        w3b.setProtocolVersion("3.0.0");

        vm.prank(address(0x99));
        vm.expectRevert();
        w3b.registerContract("Foo", address(0xAA), "1.0.0");
    }
}
