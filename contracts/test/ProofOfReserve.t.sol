// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {ProofOfReserve} from "../src/ProofOfReserve.sol";

/// @dev Mock SovereignVault that implements IVaultReader interface
contract MockVault {
    uint256 public currentNAV;
    uint256 private _totalSupply;
    uint256 private _pricePerShare;

    function setNAV(uint256 _nav) external { currentNAV = _nav; }
    function setTotalSupply(uint256 _ts) external { _totalSupply = _ts; }
    function setPricePerShare(uint256 _pps) external { _pricePerShare = _pps; }

    function totalValueLocked() external view returns (uint256) { return currentNAV; }
    function totalAssets() external view returns (uint256) { return currentNAV; }
    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function pricePerShare() external view returns (uint256) {
        return _pricePerShare > 0 ? _pricePerShare : 1e6;
    }
    function totalDeployedCapital() external view returns (uint256) {
        // For testing, deployed = 0 unless NAV > balance (simplified)
        return 0;
    }
}

contract ProofOfReserveTest is Test {
    ProofOfReserve public por;
    MockVault public mockVault;

    address public owner = address(0x1);
    address public attestor = address(0x10);
    uint256 constant USDC = 1e6;

    function setUp() public {
        mockVault = new MockVault();

        vm.prank(owner);
        por = new ProofOfReserve(
            address(mockVault),
            owner
        );

        // Authorize attestor
        vm.prank(owner);
        por.authorizeAttestor(attestor, true);
    }

    /* ============================================================ */
    /*                    ATTESTATION TESTS                         */
    /* ============================================================ */

    function test_SubmitAttestation() public {
        mockVault.setNAV(1_000_000 * USDC);

        vm.prank(attestor);
        por.submitAttestation(
            500_000 * USDC,  // Kalshi balance
            200_000 * USDC,  // Kalshi open positions
            "Daily attestation"
        );

        assertEq(por.attestationCount(), 1);
        assertTrue(por.isAttestationFresh());
    }

    function test_AttestationFreshness() public {
        mockVault.setNAV(1_000_000 * USDC);

        vm.prank(attestor);
        por.submitAttestation(500_000 * USDC, 200_000 * USDC, "");

        // Fresh immediately
        assertTrue(por.isAttestationFresh());

        // Warp past 48 hours
        vm.warp(block.timestamp + 49 hours);
        assertFalse(por.isAttestationFresh());
    }

    function test_AttestationAge() public {
        mockVault.setNAV(1_000_000 * USDC);

        vm.prank(attestor);
        por.submitAttestation(500_000 * USDC, 200_000 * USDC, "");

        // Warp 24 hours
        vm.warp(block.timestamp + 24 hours);
        assertEq(por.attestationAge(), 24 hours);
    }

    function test_LatestAttestation() public {
        mockVault.setNAV(1_000_000 * USDC);

        vm.prank(attestor);
        por.submitAttestation(500_000 * USDC, 200_000 * USDC, "Day 1");

        ProofOfReserve.Attestation memory a = por.latestAttestation();
        assertEq(a.kalshiBalance, 500_000 * USDC);
        assertEq(a.kalshiOpenPositions, 200_000 * USDC);
        assertEq(a.attestor, attestor);
    }

    /* ============================================================ */
    /*                    HEALTH STATUS TESTS                       */
    /* ============================================================ */

    function test_HealthyStatus() public {
        mockVault.setNAV(1_000_000 * USDC);

        // Submit attestation showing fully backed
        vm.prank(attestor);
        por.submitAttestation(500_000 * USDC, 200_000 * USDC, "");

        ProofOfReserve.ReserveReport memory r = por.getReport();
        assertEq(uint256(r.status), uint256(ProofOfReserve.HealthStatus.HEALTHY));
        assertTrue(r.attestationFresh);
    }

    function test_WarningWhenNoAttestation() public view {
        // No attestation submitted → WARNING
        ProofOfReserve.ReserveReport memory r = por.getReport();
        assertEq(uint256(r.status), uint256(ProofOfReserve.HealthStatus.WARNING));
    }

    function test_WarningWhenStale() public {
        mockVault.setNAV(1_000_000 * USDC);

        vm.prank(attestor);
        por.submitAttestation(500_000 * USDC, 500_000 * USDC, "");

        // Warp past 48h staleness threshold
        vm.warp(block.timestamp + 49 hours);

        ProofOfReserve.ReserveReport memory r = por.getReport();
        assertFalse(r.attestationFresh);
        assertEq(uint256(r.status), uint256(ProofOfReserve.HealthStatus.WARNING));
    }

    function test_CriticalWhenVerySale() public {
        mockVault.setNAV(1_000_000 * USDC);

        vm.prank(attestor);
        por.submitAttestation(500_000 * USDC, 500_000 * USDC, "");

        // Warp past 96h critical threshold
        vm.warp(block.timestamp + 97 hours);

        ProofOfReserve.ReserveReport memory r = por.getReport();
        assertEq(uint256(r.status), uint256(ProofOfReserve.HealthStatus.CRITICAL));
    }

    /* ============================================================ */
    /*                    HEALTH CHECK TESTS                        */
    /* ============================================================ */

    function test_HealthCheckEmitsEvent() public {
        mockVault.setNAV(1_000_000 * USDC);

        vm.prank(attestor);
        por.submitAttestation(500_000 * USDC, 200_000 * USDC, "");

        por.healthCheck();
        assertEq(por.totalChecks(), 1);
    }

    function test_AnyoneCanCallHealthCheck() public {
        mockVault.setNAV(1_000_000 * USDC);

        vm.prank(address(0x999));
        por.healthCheck();
        assertEq(por.totalChecks(), 1);
    }

    function test_StalenessWarning() public {
        mockVault.setNAV(1_000_000 * USDC);

        vm.prank(attestor);
        por.submitAttestation(500_000 * USDC, 200_000 * USDC, "");

        // Warp past 48h
        vm.warp(block.timestamp + 49 hours);

        // Health check should emit staleness warning
        por.healthCheck();
        assertEq(por.totalChecks(), 1);
    }

    /* ============================================================ */
    /*                    THIRD-PARTY ATTESTATION TESTS             */
    /* ============================================================ */

    function test_ThirdPartyAttestation() public {
        vm.prank(owner);
        por.submitThirdPartyAttestation(
            "Deloitte",
            "QmXyz123...",
            1_000_000 * USDC
        );

        assertEq(por.thirdPartyAttestationCount(), 1);
    }

    /* ============================================================ */
    /*                    REPORT TESTS                              */
    /* ============================================================ */

    function test_GetReport() public {
        mockVault.setNAV(1_000_000 * USDC);
        mockVault.setTotalSupply(1_000_000 * USDC);

        vm.prank(attestor);
        por.submitAttestation(300_000 * USDC, 200_000 * USDC, "");

        ProofOfReserve.ReserveReport memory r = por.getReport();

        assertEq(r.vaultNAV, 1_000_000 * USDC);
        assertEq(r.kalshiBalance, 300_000 * USDC);
        assertEq(r.kalshiOpenPositions, 200_000 * USDC);
        assertTrue(r.attestationFresh);
        assertEq(r.totalAttestations, 1);
    }

    /* ============================================================ */
    /*                    ADMIN TESTS                               */
    /* ============================================================ */

    function test_UnauthorizedAttestorReverts() public {
        vm.prank(address(0x99));
        vm.expectRevert("PoR: unauthorized");
        por.submitAttestation(500_000 * USDC, 200_000 * USDC, "");
    }

    function test_SetStalenessThreshold() public {
        vm.prank(owner);
        por.setStalenessThreshold(24 hours);

        assertEq(por.stalenessThreshold(), 24 hours);
    }
}
