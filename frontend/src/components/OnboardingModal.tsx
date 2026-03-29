/**
 * OnboardingModal — Guided Fund Deposit Walkthrough
 *
 * Shows on first visit (localStorage flag) or when triggered from dashboard.
 * 4-step walkthrough: Create Account → Fund → Deposit → Earn
 */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './OnboardingModal.module.css';

const STEPS = [
    {
        step: 1,
        title: 'CREATE YOUR ACCOUNT',
        desc: 'Register with your email and set a secure password. Complete verification if required. This is your gateway to the W3B fund.',
        icon: (
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="1.2">
                <rect x="6" y="16" width="28" height="20" rx="4" />
                <path d="M12 16V10a8 8 0 0 1 16 0v6" />
                <circle cx="20" cy="27" r="3" fill="rgba(0, 240, 255, 0.15)" />
            </svg>
        ),
    },
    {
        step: 2,
        title: 'FUND YOUR ACCOUNT',
        desc: 'Transfer USD to your fund account via bank transfer, wire, or supported payment methods.',
        icon: (
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="rgba(57, 255, 20, 0.5)" strokeWidth="1.2">
                <circle cx="20" cy="20" r="14" />
                <path d="M20 12v16" />
                <path d="M14 18h12" />
            </svg>
        ),
    },
    {
        step: 3,
        title: 'DEPOSIT INTO THE FUND',
        desc: 'Go to the Vault page, enter your deposit amount, review the fee structure and risk disclosures, then confirm the transaction.',
        icon: (
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="1.2">
                <rect x="8" y="8" width="24" height="24" rx="3" />
                <path d="M20 14v12" />
                <path d="M14 20l6 6 6-6" />
            </svg>
        ),
    },
    {
        step: 4,
        title: 'EARN RETURNS AUTOMATICALLY',
        desc: 'Your capital is deployed by our quantitative probability models into CFTC-regulated event contracts. Track returns on your Dashboard. Withdraw anytime.',
        icon: (
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="rgba(57, 255, 20, 0.5)" strokeWidth="1.2">
                <path d="M8 28L14 22L20 26L26 16L32 12" />
                <circle cx="32" cy="12" r="2" fill="rgba(57, 255, 20, 0.3)" />
            </svg>
        ),
    },
];

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (isOpen) setStep(0);
    }, [isOpen]);

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            // Mark as seen
            if (typeof window !== 'undefined') {
                localStorage.setItem('w3b_onboarding_complete', '1');
            }
            onClose();
        }
    };

    const current = STEPS[step];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className={styles.modal}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Progress */}
                        <div className={styles.progress}>
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`${styles.progressDot} ${i <= step ? styles.progressActive : ''}`}
                                />
                            ))}
                        </div>

                        {/* Step Content */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                className={styles.stepContent}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className={styles.stepIcon}>{current.icon}</div>
                                <div className={styles.stepNum}>STEP {current.step} OF {STEPS.length}</div>
                                <h3 className={styles.stepTitle}>{current.title}</h3>
                                <p className={styles.stepDesc}>{current.desc}</p>
                            </motion.div>
                        </AnimatePresence>

                        {/* Actions */}
                        <div className={styles.actions}>
                            {step > 0 && (
                                <button className={styles.backBtn} onClick={() => setStep(step - 1)}>
                                    ← BACK
                                </button>
                            )}
                            <button className={styles.nextBtn} onClick={handleNext}>
                                {step < STEPS.length - 1 ? 'NEXT →' : 'GET STARTED'}
                            </button>
                        </div>

                        <button className={styles.skipBtn} onClick={onClose}>
                            SKIP TOUR
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Hook to auto-show onboarding on first visit
 */
export function useOnboarding() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem('w3b_onboarding_complete')) {
            const timer = setTimeout(() => setShow(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    return { show, setShow };
}
