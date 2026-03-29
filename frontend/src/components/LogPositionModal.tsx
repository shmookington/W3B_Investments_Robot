'use client';

import React, { useState, useEffect } from 'react';
import styles from './LogPositionModal.module.css';

interface Signal {
    event_id: string;
    sport: string;
    target: string;
    market_type: string;
    market_probability: number;
    recommended_stake: number;
    event?: string;
    home_team?: string;
    away_team?: string;
}

interface LogPositionModalProps {
    signal: Signal;
    onClose: () => void;
    onSuccess: () => void;
}

export function LogPositionModal({ signal, onClose, onSuccess }: LogPositionModalProps) {
    const [balance, setBalance] = useState<number>(0);
    const [stake, setStake] = useState<number>(signal.recommended_stake || 0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const eventName = signal.event || `${signal.home_team || 'Away'} vs ${signal.away_team || 'Home'}`;
    const odds = (signal.market_probability * 100).toFixed(1);

    useEffect(() => {
        // Fetch real balance from Kalshi account sync
        const fetchBalance = async () => {
            try {
                const res = await fetch('/api/engine/proxy?endpoint=api/risk/capital');
                const data = await res.json();
                if (data && data.capital) {
                    setBalance(data.capital.available || data.capital.total_balance || 0);
                } else {
                    const altRes = await fetch('/api/engine/proxy?endpoint=api/account/balance');
                    const altData = await altRes.json();
                    if (altData && altData.balance_usd) setBalance(altData.available_usd || altData.balance_usd);
                }
            } catch (err) {
                console.error("Failed to fetch balance", err);
            }
        };
        fetchBalance();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        if (stake <= 0) {
            setError("Stake must be greater than zero.");
            return;
        }
        
        if (balance > 0 && stake > balance) {
            setError("Insufficient Kalshi balance available.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/engine/proxy?endpoint=api/bet/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: eventName,
                    sport: signal.sport,
                    selection: signal.target,
                    stake: Number(stake),
                    odds: parseFloat(odds)
                })
            });

            const data = await res.json();
            if (data.status === 'success') {
                onSuccess();
            } else {
                setError(data.error || "Failed to log position");
            }
        } catch (err) {
            setError("Network error communicating with the Hetzner VPS");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>ORACLE PROTOCOL :: LOG POSITION</h2>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>
                
                <div className={styles.content}>
                    <div className={styles.eventInfo}>
                        <div className={styles.label}>MATCHUP</div>
                        <div className={styles.value}>{eventName} ({signal.sport.toUpperCase()})</div>
                    </div>
                    
                    <div className={styles.grid}>
                        <div className={styles.eventInfo}>
                            <div className={styles.label}>TARGET SIGNAL</div>
                            <div className={styles.targetStr}>{signal.target}</div>
                        </div>
                        <div className={styles.eventInfo}>
                            <div className={styles.label}>IMPLIED MARKET ODDS</div>
                            <div className={styles.value}>{odds}%</div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.formSection}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>AMOUNT TO RISK (USD)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                className={styles.input}
                                value={stake}
                                onChange={(e) => setStake(parseFloat(e.target.value))}
                                max={balance > 0 ? balance : undefined}
                            />
                            <div className={styles.balanceInfo}>
                                CURRENT KALSHI BALANCE: <span className={balance < stake ? styles.errorText : styles.okText}>${balance.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        {error && <div className={styles.errorBanner}>{error}</div>}
                        
                        <div className={styles.footerInfo}>
                            * This logs the position locally to the tracker since live market execution via Kalshi keys is disabled.
                        </div>

                        <button 
                            type="submit" 
                            disabled={submitting} 
                            className={styles.submitBtn}
                        >
                            {submitting ? 'LOGGING...' : 'LOG POSITION TO TRACKER'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
