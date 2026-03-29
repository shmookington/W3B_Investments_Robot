'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './RiskDisclosureModal.module.css';

interface RiskDisclosureModalProps {
    isOpen: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

const DISCLOSURES = [
    'Past performance is not indicative of future results. Historical returns do not guarantee future performance.',
    'You may lose some or all of your investment. The fund\'s strategies involve risk, including the risk of total loss of principal.',
    'The fund deploys capital into CFTC-regulated event contracts. While regulated, these instruments carry inherent market risk.',
    'Performance fees (20%) are charged only on profits above the high-water mark. No fee is charged during periods of loss.',
    'Trading systems, while thoroughly tested, may experience unexpected failures. The fund depends on exchange infrastructure for position execution and settlement.',
    'The regulatory landscape for event contracts is evolving. Changes in law or regulation could impact fund operations.',
    'Withdrawals are processed within 1-2 business days. During extreme market conditions, processing may take longer.',
    'This is not financial advice. The information provided does not constitute a recommendation to invest.',
];

/**
 * RiskDisclosureModal — Required before first deposit.
 * Must acknowledge all risks and sign before proceeding.
 */
export function RiskDisclosureModal({ isOpen, onAccept, onDecline }: RiskDisclosureModalProps) {
    const [checked, setChecked] = useState<boolean[]>(new Array(DISCLOSURES.length).fill(false));
    const [signed, setSigned] = useState('');

    const allChecked = checked.every(Boolean);
    const hasSigned = signed.trim().length >= 2;
    const canAccept = allChecked && hasSigned;

    const toggleCheck = (idx: number) => {
        const next = [...checked];
        next[idx] = !next[idx];
        setChecked(next);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className={styles.modal}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                    >
                        <div className={styles.header}>
                            <span className={styles.headerIcon}>⚠</span>
                            <h2 className={styles.title}>RISK DISCLOSURE</h2>
                            <p className={styles.subtitle}>
                                You must acknowledge the following before making your first deposit.
                            </p>
                        </div>

                        <div className={styles.disclosures}>
                            {DISCLOSURES.map((text, i) => (
                                <label key={i} className={styles.disclosure}>
                                    <input
                                        type="checkbox"
                                        checked={checked[i]}
                                        onChange={() => toggleCheck(i)}
                                    />
                                    <span>{text}</span>
                                </label>
                            ))}
                        </div>

                        <div className={styles.signatureBox}>
                            <label className={styles.signatureLabel}>
                                TYPE YOUR NAME TO ACKNOWLEDGE
                            </label>
                            <input
                                type="text"
                                className={styles.signatureInput}
                                value={signed}
                                onChange={(e) => setSigned(e.target.value)}
                                placeholder="Your full name"
                            />
                        </div>

                        <div className={styles.actions}>
                            <button className={styles.declineBtn} onClick={onDecline}>
                                DECLINE
                            </button>
                            <button
                                className={styles.acceptBtn}
                                onClick={onAccept}
                                disabled={!canAccept}
                            >
                                I ACCEPT — PROCEED TO DEPOSIT
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
