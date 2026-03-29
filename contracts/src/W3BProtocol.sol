// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title W3BProtocol — Central Contract Registry & Router
 * @notice Links all active prediction fund contracts together.
 *         Provides a single entry point for discovering deployed addresses,
 *         tracking versions, and managing upgrade paths.
 *
 * Registered Contracts:
 *   - SovereignVault:  Core vault (deposits/withdrawals/NAV)
 *   - ProfitSplitter:  Fee distribution (50/30/20 HWM split)
 *   - FeeCollector:    Performance & management fee collection
 *   - InsuranceFund:   Safety net for drawdown coverage
 *   - ProofOfReserve:  On-chain transparency & attestation
 *
 * @dev No DeFi contracts registered (LendingPool, LiquidationEngine,
 *      SyntheticFactory, etc. are archived).
 */
contract W3BProtocol is Ownable {

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    string public constant NAME = "W3B Sovereign Reserve";

    /* ============================================================ */
    /*                          STRUCTS                             */
    /* ============================================================ */

    struct ContractInfo {
        address addr;
        string version;
        bool active;
        uint256 registeredAt;
        uint256 updatedAt;
    }

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice Protocol version (semantic versioning)
    string public protocolVersion;

    /// @notice Registered contracts by name
    mapping(string => ContractInfo) public contracts;

    /// @notice List of all registered contract names
    string[] public contractNames;

    /// @notice Whether the protocol is initialized
    bool public initialized;

    /// @notice Whether upgrades use proxy pattern
    bool public usingProxy;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event ContractRegistered(string name, address addr, string version, uint256 timestamp);
    event ContractUpdated(string name, address oldAddr, address newAddr, string version, uint256 timestamp);
    event ContractDeactivated(string name, address addr, uint256 timestamp);
    event ProtocolVersionUpdated(string oldVersion, string newVersion, uint256 timestamp);
    event ProtocolInitialized(uint256 timestamp);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    /**
     * @param _owner           Admin / multisig
     * @param _version         Initial protocol version (e.g., "2.0.0")
     * @param _usingProxy      Whether contracts use proxy upgrade pattern
     */
    constructor(
        address _owner,
        string memory _version,
        bool _usingProxy
    ) Ownable(_owner) {
        protocolVersion = _version;
        usingProxy = _usingProxy;
    }

    /* ============================================================ */
    /*                    INITIALIZATION                            */
    /* ============================================================ */

    /**
     * @notice Initialize the registry with all active contracts.
     *         Can only be called once.
     * @param _vault          SovereignVault address
     * @param _profitSplitter ProfitSplitter address
     * @param _feeCollector   FeeCollector address
     * @param _insuranceFund  InsuranceFund address
     * @param _proofOfReserve ProofOfReserve address
     */
    function initialize(
        address _vault,
        address _profitSplitter,
        address _feeCollector,
        address _insuranceFund,
        address _proofOfReserve
    ) external onlyOwner {
        require(!initialized, "W3B: already initialized");
        require(_vault != address(0), "W3B: zero vault");
        require(_profitSplitter != address(0), "W3B: zero splitter");
        require(_feeCollector != address(0), "W3B: zero fee collector");
        require(_insuranceFund != address(0), "W3B: zero insurance");
        require(_proofOfReserve != address(0), "W3B: zero proof");

        _registerContract("SovereignVault", _vault, "1.0.0");
        _registerContract("ProfitSplitter", _profitSplitter, "1.0.0");
        _registerContract("FeeCollector", _feeCollector, "1.0.0");
        _registerContract("InsuranceFund", _insuranceFund, "1.0.0");
        _registerContract("ProofOfReserve", _proofOfReserve, "1.0.0");

        initialized = true;
        emit ProtocolInitialized(block.timestamp);
    }

    /* ============================================================ */
    /*                    CONTRACT MANAGEMENT                       */
    /* ============================================================ */

    /**
     * @notice Register a new contract
     */
    function registerContract(
        string calldata name,
        address addr,
        string calldata version
    ) external onlyOwner {
        require(addr != address(0), "W3B: zero address");
        require(contracts[name].addr == address(0), "W3B: already registered");

        _registerContract(name, addr, version);
    }

    /**
     * @notice Update an existing contract address (upgrade)
     */
    function updateContract(
        string calldata name,
        address newAddr,
        string calldata newVersion
    ) external onlyOwner {
        require(newAddr != address(0), "W3B: zero address");
        ContractInfo storage info = contracts[name];
        require(info.addr != address(0), "W3B: not registered");

        address oldAddr = info.addr;
        info.addr = newAddr;
        info.version = newVersion;
        info.updatedAt = block.timestamp;

        emit ContractUpdated(name, oldAddr, newAddr, newVersion, block.timestamp);
    }

    /**
     * @notice Deactivate a contract (soft removal)
     */
    function deactivateContract(string calldata name) external onlyOwner {
        ContractInfo storage info = contracts[name];
        require(info.addr != address(0), "W3B: not registered");
        require(info.active, "W3B: already inactive");

        info.active = false;
        info.updatedAt = block.timestamp;

        emit ContractDeactivated(name, info.addr, block.timestamp);
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    /**
     * @notice Get contract address by name
     */
    function getContract(string calldata name) external view returns (address) {
        require(contracts[name].addr != address(0), "W3B: not found");
        require(contracts[name].active, "W3B: inactive");
        return contracts[name].addr;
    }

    /**
     * @notice Get full contract info
     */
    function getContractInfo(string calldata name) external view returns (ContractInfo memory) {
        require(contracts[name].addr != address(0), "W3B: not found");
        return contracts[name];
    }

    /**
     * @notice Get all registered contract names
     */
    function getContractNames() external view returns (string[] memory) {
        return contractNames;
    }

    /**
     * @notice Get count of registered contracts
     */
    function contractCount() external view returns (uint256) {
        return contractNames.length;
    }

    /**
     * @notice Full protocol status
     */
    function protocolStatus() external view returns (
        string memory _name,
        string memory _version,
        uint256 _contractCount,
        bool _initialized,
        bool _usingProxy
    ) {
        return (
            NAME,
            protocolVersion,
            contractNames.length,
            initialized,
            usingProxy
        );
    }

    /* ============================================================ */
    /*                    ADMIN                                     */
    /* ============================================================ */

    function setProtocolVersion(string calldata _version) external onlyOwner {
        string memory old = protocolVersion;
        protocolVersion = _version;
        emit ProtocolVersionUpdated(old, _version, block.timestamp);
    }

    function setUsingProxy(bool _usingProxy) external onlyOwner {
        usingProxy = _usingProxy;
    }

    /* ============================================================ */
    /*                    INTERNAL                                  */
    /* ============================================================ */

    function _registerContract(string memory name, address addr, string memory version) internal {
        contracts[name] = ContractInfo({
            addr: addr,
            version: version,
            active: true,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });
        contractNames.push(name);

        emit ContractRegistered(name, addr, version, block.timestamp);
    }
}
