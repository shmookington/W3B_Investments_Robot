import styles from './ChainBadge.module.css';

const CHAIN_INFO: Record<number, { name: string; color: string }> = {
    1: { name: 'ETHEREUM', color: '#627eea' },
    8453: { name: 'BASE', color: '#0052ff' },
    10: { name: 'OPTIMISM', color: '#ff0420' },
    42161: { name: 'ARBITRUM', color: '#2d374b' },
    137: { name: 'POLYGON', color: '#8247e5' },
};

interface ChainBadgeProps { chainId: number; }

export function ChainBadge({ chainId }: ChainBadgeProps) {
    const info = CHAIN_INFO[chainId] || { name: `CHAIN ${chainId}`, color: '#666' };
    return (
        <span className={styles.badge} style={{ borderColor: `${info.color}44`, color: info.color }}>
            ● {info.name}
        </span>
    );
}
