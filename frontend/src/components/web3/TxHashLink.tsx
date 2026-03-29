import styles from './TxHashLink.module.css';

const EXPLORER_URLS: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    8453: 'https://basescan.org/tx/',
    10: 'https://optimistic.etherscan.io/tx/',
    42161: 'https://arbiscan.io/tx/',
    137: 'https://polygonscan.com/tx/',
};

interface TxHashLinkProps {
    hash: string;
    chainId?: number;
    label?: string;
}

function shortenHash(hash: string): string {
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

export function TxHashLink({ hash, chainId = 8453, label }: TxHashLinkProps) {
    const baseUrl = EXPLORER_URLS[chainId] || EXPLORER_URLS[8453];
    return (
        <a href={`${baseUrl}${hash}`} target="_blank" rel="noopener noreferrer" className={styles.link}>
            {label || shortenHash(hash)} ↗
        </a>
    );
}
