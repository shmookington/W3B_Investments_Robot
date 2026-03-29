'use client';

import { useState } from 'react';
import styles from './AddressDisplay.module.css';

interface AddressDisplayProps {
    address: string;
    ens?: string;
    full?: boolean;
}

function shorten(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function AddressDisplay({ address, ens, full }: AddressDisplayProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <span className={styles.wrapper} onClick={handleCopy} title={`Click to copy: ${address}`}>
            <span className={styles.address}>{ens || (full ? address : shorten(address))}</span>
            <span className={styles.copyIcon}>{copied ? '✓' : '⧉'}</span>
        </span>
    );
}
