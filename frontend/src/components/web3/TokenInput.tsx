'use client';

import { useState } from 'react';
import styles from './TokenInput.module.css';

interface TokenInputProps {
    value: string;
    onChange: (v: string) => void;
    token?: string;
    balance?: string;
    label?: string;
    onMax?: () => void;
    tokens?: string[];
    onTokenChange?: (t: string) => void;
}

export function TokenInput({
    value, onChange, token = 'ETH', balance, label, onMax, tokens, onTokenChange,
}: TokenInputProps) {
    const [showTokens, setShowTokens] = useState(false);

    return (
        <div className={styles.wrapper}>
            {label && <span className={styles.label}>{label}</span>}
            <div className={styles.inputRow}>
                <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={styles.input}
                />
                <div className={styles.tokenArea}>
                    {tokens && tokens.length > 1 ? (
                        <div className={styles.selectorWrapper}>
                            <button className={styles.tokenBtn} onClick={() => setShowTokens(!showTokens)}>
                                {token} ▾
                            </button>
                            {showTokens && (
                                <div className={styles.tokenMenu}>
                                    {tokens.map((t) => (
                                        <button
                                            key={t}
                                            className={`${styles.tokenOption} ${t === token ? styles.active : ''}`}
                                            onClick={() => { onTokenChange?.(t); setShowTokens(false); }}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className={styles.tokenLabel}>{token}</span>
                    )}
                </div>
            </div>
            {(balance || onMax) && (
                <div className={styles.footer}>
                    {balance && <span className={styles.balance}>BAL: {balance}</span>}
                    {onMax && <button className={styles.maxBtn} onClick={onMax}>MAX</button>}
                </div>
            )}
        </div>
    );
}
