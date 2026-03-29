'use client';

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { CONTRACTS } from '@/lib/wagmi';
import {
    SovereignVaultABI,
    LendingPoolABI,
    CollateralManagerABI,
    SyntheticFactoryABI,
    SRCTokenABI,
    GovernorABI,
    ProofOfReserveABI,
    PatriotYieldABI,
} from '@/lib/abis';

/* ─── useSovereignVault ─── */
export function useSovereignVault() {
    const { address } = useAccount();
    const { writeContract } = useWriteContract();

    const balance = useReadContract({
        address: CONTRACTS.sovereignVault,
        abi: SovereignVaultABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const totalAssets = useReadContract({
        address: CONTRACTS.sovereignVault,
        abi: SovereignVaultABI,
        functionName: 'totalAssets',
    });

    const sharePrice = useReadContract({
        address: CONTRACTS.sovereignVault,
        abi: SovereignVaultABI,
        functionName: 'sharePrice',
    });

    const deposit = (amount: bigint) =>
        writeContract({
            address: CONTRACTS.sovereignVault,
            abi: SovereignVaultABI,
            functionName: 'deposit',
            args: [amount],
        });

    const withdraw = (shares: bigint) =>
        writeContract({
            address: CONTRACTS.sovereignVault,
            abi: SovereignVaultABI,
            functionName: 'withdraw',
            args: [shares],
        });

    return { balance, totalAssets, sharePrice, deposit, withdraw };
}

/* ─── useLendingPool ─── */
export function useLendingPool() {
    const { writeContract } = useWriteContract();

    const supply = (asset: `0x${string}`, amount: bigint) =>
        writeContract({
            address: CONTRACTS.lendingPool,
            abi: LendingPoolABI,
            functionName: 'supply',
            args: [asset, amount],
        });

    const borrow = (asset: `0x${string}`, amount: bigint) =>
        writeContract({
            address: CONTRACTS.lendingPool,
            abi: LendingPoolABI,
            functionName: 'borrow',
            args: [asset, amount],
        });

    const repay = (asset: `0x${string}`, amount: bigint) =>
        writeContract({
            address: CONTRACTS.lendingPool,
            abi: LendingPoolABI,
            functionName: 'repay',
            args: [asset, amount],
        });

    const getSupplyRate = (asset: `0x${string}`) =>
        useReadContract({
            address: CONTRACTS.lendingPool,
            abi: LendingPoolABI,
            functionName: 'getSupplyRate',
            args: [asset],
        });

    return { supply, borrow, repay, getSupplyRate };
}

/* ─── useCollateralManager ─── */
export function useCollateralManager() {
    const { address } = useAccount();
    const { writeContract } = useWriteContract();

    const healthFactor = useReadContract({
        address: CONTRACTS.collateralManager,
        abi: CollateralManagerABI,
        functionName: 'getHealthFactor',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const collateralValue = useReadContract({
        address: CONTRACTS.collateralManager,
        abi: CollateralManagerABI,
        functionName: 'getCollateralValue',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const depositCollateral = (token: `0x${string}`, amount: bigint) =>
        writeContract({
            address: CONTRACTS.collateralManager,
            abi: CollateralManagerABI,
            functionName: 'depositCollateral',
            args: [token, amount],
        });

    return { healthFactor, collateralValue, depositCollateral };
}

/* ─── useSyntheticFactory ─── */
export function useSyntheticFactory() {
    const { writeContract } = useWriteContract();

    const mint = (synth: `0x${string}`, amount: bigint) =>
        writeContract({
            address: CONTRACTS.syntheticFactory,
            abi: SyntheticFactoryABI,
            functionName: 'mint',
            args: [synth, amount],
        });

    const burn = (synth: `0x${string}`, amount: bigint) =>
        writeContract({
            address: CONTRACTS.syntheticFactory,
            abi: SyntheticFactoryABI,
            functionName: 'burn',
            args: [synth, amount],
        });

    return { mint, burn };
}

/* ─── useSRCToken ─── */
export function useSRCToken() {
    const { address } = useAccount();
    const { writeContract } = useWriteContract();

    const balance = useReadContract({
        address: CONTRACTS.srcToken,
        abi: SRCTokenABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const votes = useReadContract({
        address: CONTRACTS.srcToken,
        abi: SRCTokenABI,
        functionName: 'getVotes',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const delegate = (delegatee: `0x${string}`) =>
        writeContract({
            address: CONTRACTS.srcToken,
            abi: SRCTokenABI,
            functionName: 'delegate',
            args: [delegatee],
        });

    return { balance, votes, delegate };
}

/* ─── useGovernor ─── */
export function useGovernor() {
    const { writeContract } = useWriteContract();

    const propose = (
        targets: `0x${string}`[],
        values: bigint[],
        calldatas: `0x${string}`[],
        description: string
    ) =>
        writeContract({
            address: CONTRACTS.governor,
            abi: GovernorABI,
            functionName: 'propose',
            args: [targets, values, calldatas, description],
        });

    const castVote = (proposalId: bigint, support: number) =>
        writeContract({
            address: CONTRACTS.governor,
            abi: GovernorABI,
            functionName: 'castVote',
            args: [proposalId, support],
        });

    return { propose, castVote };
}

/* ─── useProofOfReserve ─── */
export function useProofOfReserve() {
    const reserveRatio = useReadContract({
        address: CONTRACTS.proofOfReserve,
        abi: ProofOfReserveABI,
        functionName: 'getReserveRatio',
    });

    const tvl = useReadContract({
        address: CONTRACTS.proofOfReserve,
        abi: ProofOfReserveABI,
        functionName: 'getTotalValueLocked',
    });

    const lastAudit = useReadContract({
        address: CONTRACTS.proofOfReserve,
        abi: ProofOfReserveABI,
        functionName: 'getLastAuditTimestamp',
    });

    return { reserveRatio, tvl, lastAudit };
}

/* ─── usePatriotYield ─── */
export function usePatriotYield() {
    const { address } = useAccount();

    const totalTBills = useReadContract({
        address: CONTRACTS.patriotYield,
        abi: PatriotYieldABI,
        functionName: 'totalTBillsPurchased',
    });

    const currentYield = useReadContract({
        address: CONTRACTS.patriotYield,
        abi: PatriotYieldABI,
        functionName: 'currentYield',
    });

    const userYield = useReadContract({
        address: CONTRACTS.patriotYield,
        abi: PatriotYieldABI,
        functionName: 'userYield',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    return { totalTBills, currentYield, userYield };
}
