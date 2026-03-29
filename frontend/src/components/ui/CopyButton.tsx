'use client';
import { useState } from 'react';
import styles from './CopyButton.module.css';

interface CopyButtonProps { text: string; label?: string; }

export function CopyButton({ text, label = 'COPY' }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button className={`${styles.btn} ${copied ? styles.copied : ''}`} onClick={handleCopy} title="Copy to clipboard">
            {copied ? '✓ COPIED' : label}
        </button>
    );
}
