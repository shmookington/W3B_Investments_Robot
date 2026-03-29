// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

// ─── Active Prediction Fund Contracts ───
import {SovereignVault} from "../src/SovereignVault.sol";
import {ProfitSplitter} from "../src/ProfitSplitter.sol";
import {FeeCollector} from "../src/FeeCollector.sol";
import {InsuranceFund} from "../src/InsuranceFund.sol";
import {ProofOfReserve} from "../src/ProofOfReserve.sol";
import {W3BProtocol} from "../src/W3BProtocol.sol";

// ─── ARCHIVED (not deployed) ───
// LendingPool, LiquidationEngine, CollateralManager,
// SyntheticExchange, SyntheticFactory, SelfRepayingVault,
// OracleAggregator, PatriotYield, SRCYieldToken, TBillAllocator

// ─── FUTURE (not deployed yet) ───
// SRCToken, SRCGovernor, SRCTimelock, SRCVesting

/**
 * @title DeployMainnet - W3B Prediction Fund — Base Mainnet
 * @notice Deploys only the 6 active prediction fund contracts.
 *
 * Usage:
 *   # Dry run
 *   forge script script/DeployMainnet.s.sol --rpc-url base -vvvv
 *
 *   # Deploy + verify
 *   forge script script/DeployMainnet.s.sol --rpc-url base --broadcast --verify
 *
 * Env vars required:
 *   DEPLOYER_PRIVATE_KEY    - Deployer wallet private key
 *   BASE_MAINNET_RPC_URL    - Base mainnet RPC
 *   BASESCAN_API_KEY        - Basescan API key
 *   GNOSIS_SAFE             - Gnosis Safe multisig address
 *   TREASURY_ADDRESS        - Protocol treasury address
 *   OPERATIONS_WALLET       - ProfitSplitter operations wallet
 *   SOVEREIGN_RESERVE       - ProfitSplitter sovereign reserve
 *   TEAM_WALLET             - ProfitSplitter team wallet
 */
contract DeployMainnet is Script {
    // ─── Base Mainnet Token Addresses ───
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // ─── Shared State ───
    address public deployer;
    address public gnosisSafe;
    address public treasury;

    // Deployed contracts
    address public vault;
    address public profitSplitter;
    address public feeCollector;
    address public insuranceFund;
    address public proofOfReserve;
    address public protocol;

    function run() public {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        deployer = vm.addr(deployerKey);
        gnosisSafe = vm.envAddress("GNOSIS_SAFE");
        treasury = vm.envAddress("TREASURY_ADDRESS");

        require(gnosisSafe != address(0), "GNOSIS_SAFE required");
        require(treasury != address(0), "TREASURY_ADDRESS required");

        console.log("========================================");
        console.log("  W3B PREDICTION FUND - MAINNET DEPLOY  ");
        console.log("========================================");
        console.log("Deployer:    ", deployer);
        console.log("Gnosis Safe: ", gnosisSafe);
        console.log("Treasury:    ", treasury);
        console.log("Chain ID:    ", block.chainid);
        require(block.chainid == 8453, "Must be Base mainnet (8453)");

        vm.startBroadcast(deployerKey);

        _deployInsuranceFund();
        _deployFeeCollector();
        _deployProfitSplitter();
        _deployVault();
        _deployProofOfReserve();
        _deployProtocol();
        _wireContracts();
        _transferOwnership();

        vm.stopBroadcast();

        _printSummary();
    }

    // ═══════════════════════════════════════════════
    // Phase 1: Insurance Fund
    // ═══════════════════════════════════════════════

    function _deployInsuranceFund() internal {
        console.log("[Phase 1] Insurance Fund...");
        InsuranceFund fund = new InsuranceFund(
            USDC_BASE,
            500,    // 5% target
            1500,   // 15% drawdown trigger
            0,      // Initial peak NAV (set after first deposit)
            deployer
        );
        insuranceFund = address(fund);
        console.log("  InsuranceFund: ", insuranceFund);
    }

    // ═══════════════════════════════════════════════
    // Phase 2: Fee Collector
    // ═══════════════════════════════════════════════

    function _deployFeeCollector() internal {
        console.log("[Phase 2] Fee Collector...");
        FeeCollector fc = new FeeCollector(
            USDC_BASE,
            treasury,
            2000,   // 20% performance fee
            100,    // 1% management fee
            0,      // Initial HWM (set after first deposit)
            deployer
        );
        feeCollector = address(fc);
        console.log("  FeeCollector: ", feeCollector);
    }

    // ═══════════════════════════════════════════════
    // Phase 3: Profit Splitter
    // ═══════════════════════════════════════════════

    function _deployProfitSplitter() internal {
        console.log("[Phase 3] Profit Splitter...");
        address opsWallet = vm.envAddress("OPERATIONS_WALLET");
        address sovReserve = vm.envAddress("SOVEREIGN_RESERVE");
        address teamWallet = vm.envAddress("TEAM_WALLET");

        ProfitSplitter ps = new ProfitSplitter(
            USDC_BASE,
            opsWallet,
            sovReserve,
            teamWallet,
            0,      // Initial HWM
            deployer
        );
        profitSplitter = address(ps);
        console.log("  ProfitSplitter: ", profitSplitter);
    }

    // ═══════════════════════════════════════════════
    // Phase 4: Sovereign Vault
    // ═══════════════════════════════════════════════

    function _deployVault() internal {
        console.log("[Phase 4] Sovereign Vault...");
        SovereignVault sv = new SovereignVault(
            USDC_BASE,
            deployer,       // owner
            deployer,       // operator (transfer to bot later)
            feeCollector,
            7               // 7-day lock-up
        );
        vault = address(sv);
        console.log("  SovereignVault: ", vault);
    }

    // ═══════════════════════════════════════════════
    // Phase 5: Proof of Reserve
    // ═══════════════════════════════════════════════

    function _deployProofOfReserve() internal {
        console.log("[Phase 5] Proof of Reserve...");
        ProofOfReserve por = new ProofOfReserve(vault, deployer);
        proofOfReserve = address(por);
        console.log("  ProofOfReserve: ", proofOfReserve);
    }

    // ═══════════════════════════════════════════════
    // Phase 6: W3B Protocol Registry
    // ═══════════════════════════════════════════════

    function _deployProtocol() internal {
        console.log("[Phase 6] W3B Protocol Registry...");
        W3BProtocol w3b = new W3BProtocol(deployer, "2.0.0", false);
        protocol = address(w3b);

        w3b.initialize(
            vault,
            profitSplitter,
            feeCollector,
            insuranceFund,
            proofOfReserve
        );
        console.log("  W3BProtocol: ", protocol);
    }

    // ═══════════════════════════════════════════════
    // Phase 7: Wire Contracts
    // ═══════════════════════════════════════════════

    function _wireContracts() internal {
        console.log("[Phase 7] Wiring contracts...");

        // Authorize vault as caller on InsuranceFund
        InsuranceFund(insuranceFund).authorizeCaller(vault, true);

        // Authorize vault as reporter on FeeCollector
        FeeCollector(feeCollector).authorizeReporter(vault, true);

        // Authorize vault as caller on ProfitSplitter
        ProfitSplitter(profitSplitter).authorizeCaller(vault, true);

        // Authorize deployer as attestor on ProofOfReserve
        ProofOfReserve(proofOfReserve).authorizeAttestor(deployer, true);

        console.log("  Contracts wired");
    }

    // ═══════════════════════════════════════════════
    // Phase 8: Transfer Ownership to Gnosis Safe
    // ═══════════════════════════════════════════════

    function _transferOwnership() internal {
        console.log("[Phase 8] Transferring ownership...");

        SovereignVault(vault).transferOwnership(gnosisSafe);
        ProfitSplitter(profitSplitter).transferOwnership(gnosisSafe);
        FeeCollector(feeCollector).transferOwnership(gnosisSafe);
        InsuranceFund(insuranceFund).transferOwnership(gnosisSafe);
        ProofOfReserve(proofOfReserve).transferOwnership(gnosisSafe);
        W3BProtocol(protocol).transferOwnership(gnosisSafe);

        console.log("  Ownership transferred to: ", gnosisSafe);
    }

    // ═══════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════

    function _printSummary() internal view {
        console.log("========================================");
        console.log("   MAINNET DEPLOYMENT COMPLETE!         ");
        console.log("========================================");
        console.log("");
        console.log("Active Contracts (6):");
        console.log("  SovereignVault:  ", vault);
        console.log("  ProfitSplitter:  ", profitSplitter);
        console.log("  FeeCollector:    ", feeCollector);
        console.log("  InsuranceFund:   ", insuranceFund);
        console.log("  ProofOfReserve:  ", proofOfReserve);
        console.log("  W3BProtocol:     ", protocol);
        console.log("");
        console.log("Ownership: Gnosis Safe ", gnosisSafe);
        console.log("========================================");
        console.log("Post-deploy steps:");
        console.log("  1. Fund InsuranceFund with seed USDC");
        console.log("  2. Set operator address on SovereignVault");
        console.log("  3. Submit initial NAV attestation");
        console.log("  4. Monitor all contracts for 1 week");
        console.log("  5. Launch Immunefi bug bounty");
        console.log("========================================");
    }
}
