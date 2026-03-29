import styles from './Avatar.module.css';

interface AvatarProps { address: string; size?: number; }

/** Generates a deterministic color from an Ethereum address */
function addrToColor(addr: string): string {
    const hash = addr.slice(2, 8);
    return `#${hash}`;
}

export function Avatar({ address, size = 24 }: AvatarProps) {
    const color = addrToColor(address);
    return (
        <div
            className={styles.avatar}
            style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}88)` }}
            title={address}
        />
    );
}
