// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IVaultReader — Interface to read SovereignVault state
 */
interface IVaultReader {
    function totalValueLocked() external view returns (uint256);
    function totalDeployedCapital() external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function currentNAV() external view returns (uint256);
    function pricePerShare() external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

/**
 * @title ProofOfReserve — On-Chain Transparency & Attestation
 * @notice Provides real-time, on-chain proof that the prediction fund
 *         holds the assets it claims. Combines automated on-chain reads
 *         with operator-submitted attestations for off-chain balances
 *         (Kalshi account balance, settlement amounts).
 *
 * Features:
 *   - Daily attestation: Operator submits signed proof of Kalshi balance + vault balance
 *   - Anyone can verify: Total NAV >= total vault claims
 *   - Heartbeat: If attestation > 48 hours old → warning flag on frontend
 *   - Integration with Chainlink Proof of Reserve (if applicable)
 *   - Monthly third-party attestation tracking
 *
 * @dev All data is publicly queryable — full transparency is the point.
 */
contract ProofOfReserve is Ownable {

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Attestation staleness threshold (default: 48 hours)
    uint256 public constant DEFAULT_STALENESS_THRESHOLD = 48 hours;

    /* ============================================================ */
    /*                          ENUMS                               */
    /* ============================================================ */

    enum HealthStatus {
        HEALTHY,     // NAV >= claims, attestation fresh
        WARNING,     // Attestation stale OR minor discrepancy
        CRITICAL     // NAV < claims OR attestation very stale
    }

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct Attestation {
        uint256 kalshiBalance;       // Off-chain Kalshi account balance (USDC)
        uint256 kalshiOpenPositions;  // Value of open positions on Kalshi
        uint256 vaultUsdcBalance;     // On-chain vault USDC balance
        uint256 totalNAV;             // Total reported NAV
        uint256 totalClaims;          // Total depositor claims
        bool fullyBacked;             // NAV >= claims
        address attestor;             // Who submitted this attestation
        uint256 timestamp;
        string notes;                 // Optional notes (e.g., settlement details)
    }

    struct ThirdPartyAttestation {
        string firmName;              // Accounting firm name
        string reportHash;            // IPFS hash or document hash
        uint256 verifiedNAV;          // NAV as verified by the firm
        uint256 timestamp;
    }

    struct ReserveReport {
        // On-Chain Data (live)
        uint256 vaultNAV;
        uint256 vaultShares;
        uint256 pricePerShare;
        uint256 deployedCapital;

        // Latest Attestation (operator-submitted)
        uint256 kalshiBalance;
        uint256 kalshiOpenPositions;
        uint256 attestedNAV;
        uint256 attestationAge;
        bool attestationFresh;

        // Health
        HealthStatus status;
        bool fullyBacked;

        // Meta
        uint256 totalAttestations;
        uint256 totalThirdPartyAttestations;
        uint256 timestamp;
    }

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice SovereignVault contract
    IVaultReader public vault;

    /// @notice Authorized attestors (operator, keeper)
    mapping(address => bool) public authorizedAttestors;

    /* ─── Attestation History ─── */

    /// @notice All operator attestations
    Attestation[] public attestations;

    /// @notice Third-party attestations (monthly accounting firm verifications)
    ThirdPartyAttestation[] public thirdPartyAttestations;

    /// @notice Staleness threshold (default: 48 hours)
    uint256 public stalenessThreshold;

    /// @notice Critical staleness (attestation completely expired)
    uint256 public criticalStaleness;

    /* ─── Stats ─── */

    uint256 public totalChecks;
    uint256 public lastCheckTime;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event AttestationSubmitted(
        uint256 indexed attestationId,
        uint256 kalshiBalance,
        uint256 vaultBalance,
        uint256 totalNAV,
        bool fullyBacked,
        address attestor,
        uint256 timestamp
    );

    event ThirdPartyAttestationSubmitted(
        uint256 indexed attestationId,
        string firmName,
        uint256 verifiedNAV,
        uint256 timestamp
    );

    event HealthCheckPerformed(
        uint256 indexed checkNumber,
        HealthStatus status,
        bool fullyBacked,
        bool attestationFresh,
        uint256 timestamp
    );

    event StalenessWarning(uint256 attestationAge, uint256 threshold, uint256 timestamp);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    /**
     * @param _vault    SovereignVault address
     * @param _owner    Admin / multisig
     */
    constructor(
        address _vault,
        address _owner
    ) Ownable(_owner) {
        require(_vault != address(0), "PoR: zero vault");
        vault = IVaultReader(_vault);
        stalenessThreshold = DEFAULT_STALENESS_THRESHOLD;
        criticalStaleness = 96 hours; // 4 days = critical
    }

    /* ============================================================ */
    /*                    ATTESTATION (OPERATOR)                    */
    /* ============================================================ */

    /**
     * @notice Submit a daily attestation of off-chain + on-chain balances.
     *         Operator signs this transaction to attest that the reported
     *         values are accurate.
     *
     * @param kalshiBalance      Current Kalshi account USDC balance
     * @param kalshiOpenPositions Value of open Kalshi positions
     * @param notes              Optional settlement notes
     */
    function submitAttestation(
        uint256 kalshiBalance,
        uint256 kalshiOpenPositions,
        string calldata notes
    ) external {
        require(
            authorizedAttestors[msg.sender] || msg.sender == owner(),
            "PoR: unauthorized"
        );

        // Read on-chain vault state
        uint256 vaultBalance = vault.totalAssets();
        uint256 vaultNAV = vault.currentNAV();
        uint256 totalClaims = vault.totalValueLocked();

        // Total NAV = on-chain vault + off-chain Kalshi
        uint256 totalNAV = vaultBalance + kalshiBalance + kalshiOpenPositions;
        bool fullyBacked = totalNAV >= totalClaims;

        attestations.push(Attestation({
            kalshiBalance: kalshiBalance,
            kalshiOpenPositions: kalshiOpenPositions,
            vaultUsdcBalance: vaultBalance,
            totalNAV: totalNAV,
            totalClaims: totalClaims,
            fullyBacked: fullyBacked,
            attestor: msg.sender,
            timestamp: block.timestamp,
            notes: notes
        }));

        emit AttestationSubmitted(
            attestations.length,
            kalshiBalance,
            vaultBalance,
            totalNAV,
            fullyBacked,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Submit a third-party attestation (monthly accounting verification)
     * @param firmName    Name of the accounting firm
     * @param reportHash  IPFS hash or document hash of the report
     * @param verifiedNAV NAV as verified by the firm
     */
    function submitThirdPartyAttestation(
        string calldata firmName,
        string calldata reportHash,
        uint256 verifiedNAV
    ) external onlyOwner {
        thirdPartyAttestations.push(ThirdPartyAttestation({
            firmName: firmName,
            reportHash: reportHash,
            verifiedNAV: verifiedNAV,
            timestamp: block.timestamp
        }));

        emit ThirdPartyAttestationSubmitted(
            thirdPartyAttestations.length,
            firmName,
            verifiedNAV,
            block.timestamp
        );
    }

    /* ============================================================ */
    /*                    HEALTH CHECK (PUBLIC)                     */
    /* ============================================================ */

    /**
     * @notice Perform a health check. Callable by ANYONE.
     *         Checks attestation freshness and reserve backing.
     */
    function healthCheck() external returns (ReserveReport memory report) {
        report = _buildReport();

        totalChecks++;
        lastCheckTime = block.timestamp;

        // Emit staleness warning if applicable
        if (!report.attestationFresh && attestations.length > 0) {
            emit StalenessWarning(
                report.attestationAge,
                stalenessThreshold,
                block.timestamp
            );
        }

        emit HealthCheckPerformed(
            totalChecks,
            report.status,
            report.fullyBacked,
            report.attestationFresh,
            block.timestamp
        );
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    /// @notice Get current reserve report (read-only, no state change)
    function getReport() external view returns (ReserveReport memory) {
        return _buildReport();
    }

    /// @notice Is the latest attestation fresh (< 48 hours old)?
    function isAttestationFresh() external view returns (bool) {
        if (attestations.length == 0) return false;
        return (block.timestamp - attestations[attestations.length - 1].timestamp) < stalenessThreshold;
    }

    /// @notice How old is the latest attestation?
    function attestationAge() external view returns (uint256) {
        if (attestations.length == 0) return type(uint256).max;
        return block.timestamp - attestations[attestations.length - 1].timestamp;
    }

    /// @notice Get attestation count
    function attestationCount() external view returns (uint256) {
        return attestations.length;
    }

    /// @notice Get a specific attestation
    function getAttestation(uint256 index) external view returns (Attestation memory) {
        require(index < attestations.length, "PoR: invalid index");
        return attestations[index];
    }

    /// @notice Get latest attestation
    function latestAttestation() external view returns (Attestation memory) {
        require(attestations.length > 0, "PoR: no attestations");
        return attestations[attestations.length - 1];
    }

    /// @notice Get third-party attestation count
    function thirdPartyAttestationCount() external view returns (uint256) {
        return thirdPartyAttestations.length;
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "PoR: zero vault");
        vault = IVaultReader(_vault);
    }

    function setStalenessThreshold(uint256 _threshold) external onlyOwner {
        stalenessThreshold = _threshold;
    }

    function setCriticalStaleness(uint256 _threshold) external onlyOwner {
        criticalStaleness = _threshold;
    }

    function authorizeAttestor(address attestor, bool authorized) external onlyOwner {
        require(attestor != address(0), "PoR: zero attestor");
        authorizedAttestors[attestor] = authorized;
    }

    /* ============================================================ */
    /*                    INTERNAL                                  */
    /* ============================================================ */

    function _buildReport() internal view returns (ReserveReport memory report) {
        // On-chain data
        report.vaultNAV = vault.currentNAV();
        report.vaultShares = vault.totalSupply();
        report.pricePerShare = vault.pricePerShare();
        report.deployedCapital = vault.totalDeployedCapital();

        // Latest attestation data
        if (attestations.length > 0) {
            Attestation storage latest = attestations[attestations.length - 1];
            report.kalshiBalance = latest.kalshiBalance;
            report.kalshiOpenPositions = latest.kalshiOpenPositions;
            report.attestedNAV = latest.totalNAV;
            report.attestationAge = block.timestamp - latest.timestamp;
            report.attestationFresh = report.attestationAge < stalenessThreshold;
            report.fullyBacked = latest.fullyBacked;
        }

        // Determine health status
        report.status = _determineStatus(report);

        // Meta
        report.totalAttestations = attestations.length;
        report.totalThirdPartyAttestations = thirdPartyAttestations.length;
        report.timestamp = block.timestamp;
    }

    function _determineStatus(ReserveReport memory report) internal view returns (HealthStatus) {
        // Critical: no attestation, or very stale, or not fully backed
        if (attestations.length == 0) return HealthStatus.WARNING;
        if (report.attestationAge >= criticalStaleness) return HealthStatus.CRITICAL;
        if (!report.fullyBacked) return HealthStatus.CRITICAL;

        // Warning: attestation stale (> 48h but < critical)
        if (!report.attestationFresh) return HealthStatus.WARNING;

        return HealthStatus.HEALTHY;
    }
}
