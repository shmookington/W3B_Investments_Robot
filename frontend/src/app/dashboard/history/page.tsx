'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { fadeInUp } from '@/lib/motion';
import styles from './page.module.css';

interface Transaction {
    id: string;
    type: 'deposit' | 'withdraw' | 'return';
    amount: string;
    amountNum: number;
    date: string;
    timestamp: number;
    ref: string;
    status: 'confirmed' | 'pending';
}

const TYPE_OPTIONS = ['all', 'deposit', 'withdraw', 'return'] as const;
type TypeFilter = (typeof TYPE_OPTIONS)[number];

export default function TransactionHistoryPage() {
    const { user } = useAuth();
    const isConnected = !!user;
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    /* ─── Live transactions from API ─── */
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isConnected) return;

        async function fetchTransactions() {
            try {
                const res = await fetch('/api/user/transactions');
                if (res.ok) {
                    const json = await res.json();
                    const raw = json.data ?? json;
                    if (Array.isArray(raw)) {
                        setTransactions(raw.map((tx: {
                            id?: string;
                            type?: string;
                            amount?: number;
                            date?: string;
                            createdAt?: string;
                            timestamp?: number;
                            reference?: string;
                            ref?: string;
                            status?: string;
                        }, i: number) => ({
                            id: tx.id ?? String(i),
                            type: (tx.type ?? 'deposit') as 'deposit' | 'withdraw' | 'return',
                            amount: (tx.amount ?? 0).toLocaleString(),
                            amountNum: tx.amount ?? 0,
                            date: tx.date ?? tx.createdAt?.split('T')[0] ?? '—',
                            timestamp: tx.timestamp ?? 0,
                            ref: tx.reference ?? tx.ref ?? `TX-${tx.id ?? i}`,
                            status: (tx.status ?? 'confirmed') as 'confirmed' | 'pending',
                        })));
                    }
                }
            } catch { /* API unavailable */ }
            setLoading(false);
        }
        fetchTransactions();
    }, [isConnected]);

    const filtered = useMemo(() => {
        return transactions.filter((tx) => {
            if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
            if (dateFrom && tx.date < dateFrom) return false;
            if (dateTo && tx.date > dateTo) return false;
            return true;
        });
    }, [typeFilter, dateFrom, dateTo, transactions]);

    const exportCSV = useCallback(async () => {
        // Try API export first
        try {
            const res = await fetch('/api/user/transactions/export?format=csv');
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `w3b-transactions-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                return;
            }
        } catch { /* fallback to local export */ }

        // Fallback: export from loaded data
        const headers = ['Date', 'Type', 'Amount', 'Reference', 'Status'];
        const rows = filtered.map((tx) => [
            tx.date,
            tx.type.toUpperCase(),
            tx.amount,
            tx.ref,
            tx.status,
        ]);
        const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `w3b-transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [filtered]);

    /* ─── Not connected ─── */
    if (!isConnected) {
        return (
            <PageContainer>
                <motion.section className={styles.connectScreen} initial="hidden" animate="visible" variants={fadeInUp}>
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="rgba(0, 240, 255, 0.3)" strokeWidth="1.2">
                        <rect x="10" y="24" width="36" height="26" rx="4" />
                        <path d="M18 24V16a10 10 0 0 1 20 0v8" />
                        <circle cx="28" cy="38" r="4" fill="rgba(0, 240, 255, 0.2)" />
                    </svg>
                    <h1 className={styles.connectTitle}>TRANSACTION HISTORY</h1>
                    <p className={styles.connectDesc}>Log in to view your full transaction history.</p>
                </motion.section>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            {/* ─── Header ─── */}
            <motion.section className={styles.pageHeader} initial="hidden" animate="visible" variants={fadeInUp}>
                <HoloLabel>TRANSACTION HISTORY</HoloLabel>
                <h1 className={styles.pageTitle}>Your Transactions</h1>
                <p className={styles.pageSubtitle}>
                    Full history of deposits, withdrawals, and returns earned.
                </p>
            </motion.section>

            {/* ─── Filters & Export ─── */}
            <motion.section className={styles.section} initial="hidden" animate="visible" variants={fadeInUp}>
                <div className={styles.filterBar}>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>TYPE</label>
                        <div className={styles.filterBtns}>
                            {TYPE_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    className={`${styles.filterBtn} ${typeFilter === opt ? styles.filterActive : ''}`}
                                    onClick={() => setTypeFilter(opt)}
                                >
                                    {opt.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>DATE RANGE</label>
                        <div className={styles.dateInputs}>
                            <input
                                type="date"
                                className={styles.dateInput}
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                placeholder="From"
                            />
                            <span className={styles.dateSep}>→</span>
                            <input
                                type="date"
                                className={styles.dateInput}
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                placeholder="To"
                            />
                        </div>
                    </div>

                    <button className={styles.exportBtn} onClick={exportCSV}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <path d="M8 2v8" />
                            <path d="M4 7l4 4 4-4" />
                            <path d="M2 12v2h12v-2" />
                        </svg>
                        EXPORT CSV
                    </button>
                </div>
            </motion.section>

            {/* ─── Transaction Table — LIVE from API ─── */}
            <motion.section className={styles.section} initial="hidden" animate="visible" variants={fadeInUp}>
                <HoloPanel size="lg" depth="mid">
                    {loading ? (
                        <div className={styles.emptyState}>
                            <p style={{ color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                                LOADING TRANSACTIONS…
                            </p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>{transactions.length === 0 ? 'No transactions yet. Make a deposit to get started.' : 'No transactions found for the selected filters.'}</p>
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.txTable}>
                                <thead>
                                    <tr>
                                        <th>DATE</th>
                                        <th>TYPE</th>
                                        <th>AMOUNT</th>
                                        <th>REFERENCE</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((tx) => (
                                        <tr key={tx.id}>
                                            <td className={styles.dateCell}>{tx.date}</td>
                                            <td>
                                                <span className={`${styles.typeBadge} ${styles[`type_${tx.type}`]}`}>
                                                    {tx.type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className={styles.amountCell}>
                                                {tx.type === 'withdraw' ? '-' : '+'}${tx.amount}
                                            </td>
                                            <td>
                                                <span className={styles.txLink}>{tx.ref}</span>
                                            </td>
                                            <td>
                                                <span className={styles.statusConfirmed}>
                                                    {tx.status.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className={styles.tableFooter}>
                        <span className={styles.txCount}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
                    </div>
                </HoloPanel>
            </motion.section>
        </PageContainer>
    );
}
