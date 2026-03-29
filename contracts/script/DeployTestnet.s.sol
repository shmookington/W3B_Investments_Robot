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
 * @title DeployTestnet - W3B Prediction Fund — Base Sepolia
 * @notice Deploys only the 6 active prediction fund contracts with mock USDC.
 *
 * Usage:
 *   # Dry run
 *   forge script script/DeployTestnet.s.sol --rpc-url base_sepolia -vvvv
 *
 *   # Deploy + verify
 *   forge script script/DeployTestnet.s.sol --rpc-url base_sepolia --broadcast --verify
 *
 * Env vars required:
 *   DEPLOYER_PRIVATE_KEY    - Private key for deployer wallet
 *   BASE_SEPOLIA_RPC_URL    - Base Sepolia RPC endpoint
 *   BASESCAN_API_KEY        - Basescan API key for verification
 */
contract DeployTestnet is Script {
    // ─── Shared State ───
    address public deployer;
    address public usdc;

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

        console.log("========================================");
        console.log("  W3B PREDICTION FUND - TESTNET DEPLOY  ");
        console.log("========================================");
        console.log("Deployer:  ", deployer);
        console.log("Chain ID:  ", block.chainid);

        vm.startBroadcast(deployerKey);

        _deployMockUSDC();
        _deployInsuranceFund();
        _deployFeeCollector();
        _deployProfitSplitter();
        _deployVault();
        _deployProofOfReserve();
        _deployProtocol();
        _wireContracts();

        vm.stopBroadcast();

        _printSummary();
    }

    // ═══════════════════════════════════════════════
    // Phase 0: Mock USDC (testnet only)
    // ═══════════════════════════════════════════════

    function _deployMockUSDC() internal {
        console.log("[Phase 0] Mock USDC...");
        MockERC20 mockUsdc = new MockERC20("USD Coin (Test)", "USDC", 6);
        usdc = address(mockUsdc);
        mockUsdc.mint(deployer, 10_000_000 * 1e6);
        console.log("  USDC: ", usdc);
    }

    // ═══════════════════════════════════════════════
    // Phase 1: Insurance Fund
    // ═══════════════════════════════════════════════

    function _deployInsuranceFund() internal {
        console.log("[Phase 1] Insurance Fund...");
        InsuranceFund fund = new InsuranceFund(usdc, 500, 1500, 0, deployer);
        insuranceFund = address(fund);
        console.log("  InsuranceFund: ", insuranceFund);
    }

    // ═══════════════════════════════════════════════
    // Phase 2: Fee Collector
    // ═══════════════════════════════════════════════

    function _deployFeeCollector() internal {
        console.log("[Phase 2] Fee Collector...");
        FeeCollector fc = new FeeCollector(usdc, deployer, 2000, 100, 0, deployer);
        feeCollector = address(fc);
        console.log("  FeeCollector: ", feeCollector);
    }

    // ═══════════════════════════════════════════════
    // Phase 3: Profit Splitter
    // ═══════════════════════════════════════════════

    function _deployProfitSplitter() internal {
        console.log("[Phase 3] Profit Splitter...");
        address opsWallet = vm.envOr("OPERATIONS_WALLET", deployer);
        address sovReserve = vm.envOr("SOVEREIGN_RESERVE", deployer);
        address teamWallet = vm.envOr("TEAM_WALLET", deployer);

        ProfitSplitter ps = new ProfitSplitter(usdc, opsWallet, sovReserve, teamWallet, 0, deployer);
        profitSplitter = address(ps);
        console.log("  ProfitSplitter: ", profitSplitter);
    }

    // ═══════════════════════════════════════════════
    // Phase 4: Sovereign Vault
    // ═══════════════════════════════════════════════

    function _deployVault() internal {
        console.log("[Phase 4] Sovereign Vault...");
        SovereignVault sv = new SovereignVault(usdc, deployer, deployer, feeCollector, 7);
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
        W3BProtocol w3b = new W3BProtocol(deployer, "2.0.0-testnet", false);
        protocol = address(w3b);

        w3b.initialize(vault, profitSplitter, feeCollector, insuranceFund, proofOfReserve);
        console.log("  W3BProtocol: ", protocol);
    }

    // ═══════════════════════════════════════════════
    // Phase 7: Wire Contracts
    // ═══════════════════════════════════════════════

    function _wireContracts() internal {
        console.log("[Phase 7] Wiring contracts...");

        InsuranceFund(insuranceFund).authorizeCaller(vault, true);
        FeeCollector(feeCollector).authorizeReporter(vault, true);
        ProfitSplitter(profitSplitter).authorizeCaller(vault, true);
        ProofOfReserve(proofOfReserve).authorizeAttestor(deployer, true);

        console.log("  Contracts wired");
    }

    // ═══════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════

    function _printSummary() internal view {
        console.log("========================================");
        console.log("   TESTNET DEPLOYMENT COMPLETE!         ");
        console.log("========================================");
        console.log("");
        console.log("Mock Token:");
        console.log("  USDC: ", usdc);
        console.log("");
        console.log("Active Contracts (6):");
        console.log("  SovereignVault:  ", vault);
        console.log("  ProfitSplitter:  ", profitSplitter);
        console.log("  FeeCollector:    ", feeCollector);
        console.log("  InsuranceFund:   ", insuranceFund);
        console.log("  ProofOfReserve:  ", proofOfReserve);
        console.log("  W3BProtocol:     ", protocol);
        console.log("========================================");
    }
}

/// @dev Mock ERC-20 for testnet deployment
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient");
        require(allowance[from][msg.sender] >= amount, "Not approved");
        balanceOf[from] -= amount;
        allowance[from][msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
