import styles from './TokenIcon.module.css';

const TOKEN_SYMBOLS: Record<string, string> = {
    ETH: 'Ξ',
    WETH: 'Ξ',
    USDC: '$',
    USDT: '₮',
    DAI: '◇',
    WBTC: '₿',
    W3B: 'W',
};

interface TokenIconProps {
    symbol: string;
    size?: number;
}

export function TokenIcon({ symbol, size = 24 }: TokenIconProps) {
    const char = TOKEN_SYMBOLS[symbol.toUpperCase()] || symbol.slice(0, 1).toUpperCase();

    return (
        <div className={styles.icon} style={{ width: size, height: size, fontSize: size * 0.5 }}>
            {char}
        </div>
    );
}
