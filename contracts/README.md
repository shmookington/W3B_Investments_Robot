# W3B Smart Contracts

> **Prediction Fund Model** — Solidity contracts on Base (L2) using Foundry.

## Active Contracts (6)

| Contract | Purpose |
|---|---|
| `SovereignVault.sol` | Core vault — USDC deposits, share-based NAV, withdrawal queue |
| `ProfitSplitter.sol` | 50/30/20 profit distribution with high-water mark |
| `FeeCollector.sol` | 20% performance fee + optional management fee |
| `InsuranceFund.sol` | 5-10% AUM safety buffer, 15% drawdown trigger |
| `ProofOfReserve.sol` | Daily attestation, 48h staleness, transparency |
| `W3BProtocol.sol` | Contract registry, versioning, lifecycle management |

## Token Contracts — FUTURE (4)

> **Not deployed.** These contracts are ready for deployment once the fund achieves consistent profitability and the governance model is finalized.

| Contract | Purpose |
|---|---|
| `SRCToken.sol` | $SRC governance/utility token (ERC-20) |
| `SRCGovernor.sol` | On-chain governance (OpenZeppelin Governor) |
| `SRCTimelock.sol` | Timelock controller for governance proposals |
| `SRCVesting.sol` | Token vesting for team/investors |

## Archived Contracts

DeFi-specific contracts have been moved to `../contracts_archive/`. These are preserved for reference but are not compiled or deployed:

`LendingPool`, `LiquidationEngine`, `CollateralManager`, `SyntheticExchange`, `SyntheticFactory`, `SelfRepayingVault`, `OracleAggregator`, `PatriotYield`, `SRCYieldToken`, `TBillAllocator`

## Build & Test

```bash
# Build
forge build

# Test
forge test

# Deploy (testnet)
forge script script/DeployTestnet.s.sol --rpc-url base_sepolia --broadcast --verify

# Deploy (mainnet)
forge script script/DeployMainnet.s.sol --rpc-url base --broadcast --verify
```

## Stack

- **Solidity:** 0.8.28
- **Framework:** Foundry (forge, cast, anvil)
- **Network:** Base (L2)
- **Dependencies:** OpenZeppelin Contracts v5
