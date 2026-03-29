'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import styles from './page.module.css';

/* ── Toggle Component ─── */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
    return (
        <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>{label}</span>
            <button className={`${styles.toggle} ${on ? styles.toggleOn : ''}`} onClick={onChange}>
                <span className={styles.toggleThumb} />
            </button>
        </div>
    );
}

/* ── Component ─────────────────────────────────────────────── */

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    /* Profile — loads from API */
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [profileLoading, setProfileLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    /* Account info from API */
    const [account, setAccount] = useState({ id: '—', status: '—', tier: '—' });
    const [verified, setVerified] = useState(false);
    const [verifiedDate, setVerifiedDate] = useState('—');

    /* 2FA */
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [twoFALoading, setTwoFALoading] = useState(false);

    /* Delete account */
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    /* Admin — set to true if the user is an operator */
    const isAdmin = true;

    /* W3B Notifications */
    const [healthFactor, setHealthFactor] = useState(true);
    const [tradeNotifs, setTradeNotifs] = useState(true);
    const [govAlerts, setGovAlerts] = useState(false);
    const [yieldDigest, setYieldDigest] = useState(true);
    const [depositConfirm, setDepositConfirm] = useState(true);
    const [withdrawConfirm, setWithdrawConfirm] = useState(true);
    const [weeklyReport, setWeeklyPerfReport] = useState(true);

    /* MONOLITH Ops */
    const [circuitBreaker, setCircuitBreaker] = useState(true);
    const [regimeAlerts, setRegimeAlerts] = useState(true);
    const [feedOutage, setFeedOutage] = useState(true);
    const [ddAlerts, setDdAlerts] = useState(true);
    const [ddThreshold, setDdThreshold] = useState('-5');
    const [stratNotifs, setStratNotifs] = useState(true);
    const [dailyPnl, setDailyPnl] = useState(true);
    const [opsWeeklyReport, setOpsWeeklyReport] = useState(true);

    /* Display */
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [currency, setCurrency] = useState('USD');
    const [crtEffects, setCrtEffects] = useState(true);
    const [density, setDensity] = useState<'compact' | 'normal' | 'spacious'>('normal');
    const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
    const [language, setLanguage] = useState('en');

    /* Dashboard Prefs */
    const [landingPage, setLandingPage] = useState('/monolith');
    const [chartTimeframe, setChartTimeframe] = useState('1D');
    const [soundAlerts, setSoundAlerts] = useState(false);

    /* ─── Load profile from API ─── */
    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetch('/api/user/profile');
                if (res.ok) {
                    const json = await res.json();
                    const d = json.data ?? json;
                    setDisplayName(d.displayName ?? d.name ?? user?.email?.split('@')[0] ?? '');
                    setEmail(d.email ?? user?.email ?? '');
                    setAccount({
                        id: d.accountId ?? d.id ?? '—',
                        status: d.status ?? 'Active',
                        tier: d.tier ?? 'Standard',
                    });
                    setVerified(d.verified ?? d.kycVerified ?? false);
                    setVerifiedDate(d.verifiedDate ?? d.kycDate ?? '—');
                    setTwoFAEnabled(d.twoFA ?? d.mfaEnabled ?? false);

                    // Load notification prefs if available
                    if (d.notifications) {
                        const n = d.notifications;
                        setHealthFactor(n.healthFactor ?? true);
                        setTradeNotifs(n.tradeNotifs ?? true);
                        setGovAlerts(n.govAlerts ?? false);
                        setYieldDigest(n.yieldDigest ?? true);
                        setDepositConfirm(n.depositConfirm ?? true);
                        setWithdrawConfirm(n.withdrawConfirm ?? true);
                        setWeeklyPerfReport(n.weeklyReport ?? true);
                    }

                    // Load display prefs if available
                    if (d.preferences) {
                        const p = d.preferences;
                        setTheme(p.theme ?? 'dark');
                        setCurrency(p.currency ?? 'USD');
                        setCrtEffects(p.crtEffects ?? true);
                        setDensity(p.density ?? 'normal');
                        setFontSize(p.fontSize ?? 'medium');
                        setLanguage(p.language ?? 'en');
                        setLandingPage(p.landingPage ?? '/monolith');
                        setChartTimeframe(p.chartTimeframe ?? '1D');
                        setSoundAlerts(p.soundAlerts ?? false);
                    }
                } else {
                    // Fallback to auth user
                    setDisplayName(user?.email?.split('@')[0] ?? '');
                    setEmail(user?.email ?? '');
                }
            } catch {
                setDisplayName(user?.email?.split('@')[0] ?? '');
                setEmail(user?.email ?? '');
            }
            setProfileLoading(false);
        }
        loadProfile();
    }, [user]);

    /* ─── Save profile to API ─── */
    const handleSaveProfile = useCallback(async () => {
        setSaveStatus('saving');
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName,
                    email,
                    notifications: {
                        healthFactor, tradeNotifs, govAlerts, yieldDigest,
                        depositConfirm, withdrawConfirm, weeklyReport,
                    },
                    preferences: {
                        theme, currency, crtEffects, density, fontSize,
                        language, landingPage, chartTimeframe, soundAlerts,
                    },
                }),
            });
            if (res.ok) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 2000);
            }
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    }, [displayName, email, healthFactor, tradeNotifs, govAlerts, yieldDigest,
        depositConfirm, withdrawConfirm, weeklyReport, theme, currency, crtEffects,
        density, fontSize, language, landingPage, chartTimeframe, soundAlerts]);

    /* ─── Toggle 2FA via API ─── */
    const handleToggle2FA = useCallback(async () => {
        setTwoFALoading(true);
        try {
            const res = await fetch('/api/user/2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enable: !twoFAEnabled }),
            });
            if (res.ok) {
                setTwoFAEnabled(!twoFAEnabled);
            }
        } catch { /* API unavailable */ }
        setTwoFALoading(false);
    }, [twoFAEnabled]);

    /* ─── Export transaction history ─── */
    const handleExportTxHistory = useCallback(async () => {
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
            }
        } catch { /* API unavailable */ }
    }, []);

    /* ─── Export MONOLITH trade log ─── */
    const handleExportTradeLog = useCallback(async () => {
        try {
            const res = await fetch('/api/portfolio/trades/export?format=csv');
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `monolith-trades-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch { /* API unavailable */ }
    }, []);

    /* ─── Log out ─── */
    const handleLogout = useCallback(async () => {
        await logout();
        router.push('/login');
    }, [logout, router]);

    /* ─── Delete account ─── */
    const handleDeleteAccount = useCallback(async () => {
        setDeleteLoading(true);
        try {
            const res = await fetch('/api/user/account', {
                method: 'DELETE',
            });
            if (res.ok) {
                await logout();
                router.push('/');
            }
        } catch { /* API unavailable */ }
        setDeleteLoading(false);
    }, [logout, router]);

    return (
        <PageContainer>

            {/* ═══════════════════════════════════════════
          ADMIN BADGE (if operator)
          ═════════════════════════════════════════ */}
            {isAdmin && (
                <section className={styles.section}>
                    <div className={styles.adminBadge}>
                        <span className={styles.adminDot} />
                        <span className={styles.adminText}>OPERATOR STATUS: ✅ ACTIVE</span>
                    </div>
                </section>
            )}

            {/* ═══════════════════════════════════════════
          PROFILE — Wired to API
          ═════════════════════════════════════════ */}
            <section className={styles.section}>
                <HoloPanel size="sm" depth="mid" header="PROFILE">
                    <div className={styles.profileGrid}>
                        <div className={styles.profileField}>
                            <label className={styles.prefLabel}>DISPLAY NAME</label>
                            <input
                                className={styles.textInput}
                                value={profileLoading ? '…' : displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                disabled={profileLoading}
                            />
                        </div>
                        <div className={styles.profileField}>
                            <label className={styles.prefLabel}>EMAIL ADDRESS</label>
                            <input
                                className={styles.textInput}
                                type="email"
                                value={profileLoading ? '…' : email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={profileLoading}
                            />
                        </div>
                        <div className={styles.profileField}>
                            <button
                                className={styles.saveBtn}
                                onClick={handleSaveProfile}
                                disabled={saveStatus === 'saving'}
                            >
                                {saveStatus === 'saving' ? 'SAVING…' : saveStatus === 'saved' ? '✓ SAVED' : saveStatus === 'error' ? '✗ FAILED' : 'SAVE CHANGES'}
                            </button>
                        </div>
                    </div>
                </HoloPanel>
            </section>

            {/* ═══════════════════════════════════════════
          WALLET & IDENTITY — Live from API
          ═════════════════════════════════════════ */}
            <section className={styles.walletSection}>
                <HoloLabel>ACCOUNT & IDENTITY</HoloLabel>
                <div className={styles.walletRow}>
                    <HoloPanel size="sm" depth="mid">
                        <div className={styles.walletCard}>
                            <span className={styles.walletLabel}>ACCOUNT</span>
                            <span className={styles.walletAddr}>{account.id}</span>
                            <div className={styles.walletMeta}>
                                <span className={styles.walletEns}>Status: {account.status}</span>
                                <span className={styles.walletChain}>Tier: {account.tier}</span>
                            </div>
                        </div>
                    </HoloPanel>
                    <HoloPanel size="sm" depth="mid">
                        <div className={styles.verifyCard}>
                            <span className={styles.walletLabel}>IDENTITY VERIFICATION</span>
                            {verified ? (
                                <div className={styles.verifiedBox}>
                                    <span className={styles.verifiedBadge}>✓ VERIFIED</span>
                                    <span className={styles.verifyDate}>Verified: {verifiedDate}</span>
                                    <span className={styles.verifyProvider}>via ID Verification</span>
                                </div>
                            ) : (
                                <div className={styles.unverifiedBox}>
                                    <span className={styles.unverifiedText}>Not yet verified</span>
                                    <button className={styles.verifyBtn}>GET VERIFIED</button>
                                </div>
                            )}
                        </div>
                    </HoloPanel>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
          W3B BANK NOTIFICATIONS
          ═════════════════════════════════════════ */}
            <section className={styles.section}>
                <HoloPanel size="sm" depth="mid" header="W3B BANK NOTIFICATIONS">
                    <div className={styles.toggleGroup}>
                        <Toggle label="Deposit confirmation emails" on={depositConfirm} onChange={() => setDepositConfirm(!depositConfirm)} />
                        <Toggle label="Withdrawal confirmation emails" on={withdrawConfirm} onChange={() => setWithdrawConfirm(!withdrawConfirm)} />
                        <Toggle label="Weekly performance report (email)" on={weeklyReport} onChange={() => setWeeklyPerfReport(!weeklyReport)} />
                        <Toggle label="Health factor warnings (email / telegram / push)" on={healthFactor} onChange={() => setHealthFactor(!healthFactor)} />
                        <Toggle label="Trade notifications" on={tradeNotifs} onChange={() => setTradeNotifs(!tradeNotifs)} />
                        <Toggle label="Governance proposal alerts" on={govAlerts} onChange={() => setGovAlerts(!govAlerts)} />
                        <Toggle label="Weekly yield digest" on={yieldDigest} onChange={() => setYieldDigest(!yieldDigest)} />
                    </div>
                </HoloPanel>
            </section>

            {/* ═══════════════════════════════════════════
          MONOLITH OPS NOTIFICATIONS
          ═════════════════════════════════════════ */}
            <section className={styles.section}>
                <HoloPanel size="sm" depth="mid" header="MONOLITH OPS NOTIFICATIONS">
                    <div className={styles.toggleGroup}>
                        <Toggle label="Circuit breaker triggered (always on)" on={circuitBreaker} onChange={() => { }} />
                        <Toggle label="Regime transition alerts" on={regimeAlerts} onChange={() => setRegimeAlerts(!regimeAlerts)} />
                        <Toggle label="Data feed outage warnings" on={feedOutage} onChange={() => setFeedOutage(!feedOutage)} />
                        <div className={styles.toggleWithInput}>
                            <Toggle label="Drawdown threshold alerts" on={ddAlerts} onChange={() => setDdAlerts(!ddAlerts)} />
                            {ddAlerts && (
                                <div className={styles.thresholdInput}>
                                    <label className={styles.threshLabel}>Alert at:</label>
                                    <select className={styles.threshSelect} value={ddThreshold} onChange={e => setDdThreshold(e.target.value)}>
                                        <option value="-3">-3%</option>
                                        <option value="-5">-5%</option>
                                        <option value="-10">-10%</option>
                                        <option value="-15">-15%</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <Toggle label="Strategy killed / paused notifications" on={stratNotifs} onChange={() => setStratNotifs(!stratNotifs)} />
                        <Toggle label="Daily P&L summary (end-of-day email)" on={dailyPnl} onChange={() => setDailyPnl(!dailyPnl)} />
                        <Toggle label="Weekly performance report (email)" on={opsWeeklyReport} onChange={() => setOpsWeeklyReport(!opsWeeklyReport)} />
                    </div>
                </HoloPanel>
            </section>

            {/* ═══════════════════════════════════════════
          DISPLAY PREFERENCES
          ═════════════════════════════════════════ */}
            <section className={styles.section}>
                <HoloPanel size="sm" depth="mid" header="DISPLAY PREFERENCES">
                    <div className={styles.prefGrid}>
                        <div className={styles.prefField}>
                            <label className={styles.prefLabel}>THEME</label>
                            <div className={styles.segmented}>
                                {(['dark', 'light'] as const).map(t => (
                                    <button key={t} className={`${styles.segBtn} ${theme === t ? styles.segActive : ''}`} onClick={() => setTheme(t)}>{t.toUpperCase()}</button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.prefField}>
                            <label className={styles.prefLabel}>DEFAULT CURRENCY</label>
                            <select className={styles.prefSelect} value={currency} onChange={e => setCurrency(e.target.value)}>
                                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                            </select>
                        </div>
                        <div className={styles.prefField}>
                            <label className={styles.prefLabel}>CRT EFFECTS</label>
                            <button className={`${styles.prefToggleBtn} ${crtEffects ? styles.prefOn : ''}`} onClick={() => setCrtEffects(!crtEffects)}>{crtEffects ? 'ON' : 'OFF'}</button>
                        </div>
                        <div className={styles.prefField}>
                            <label className={styles.prefLabel}>TERMINAL DENSITY</label>
                            <div className={styles.segmented}>
                                {(['compact', 'normal', 'spacious'] as const).map(d => (
                                    <button key={d} className={`${styles.segBtn} ${density === d ? styles.segActive : ''}`} onClick={() => setDensity(d)}>{d.toUpperCase()}</button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.prefField}>
                            <label className={styles.prefLabel}>FONT SIZE</label>
                            <div className={styles.segmented}>
                                {(['small', 'medium', 'large'] as const).map(s => (
                                    <button key={s} className={`${styles.segBtn} ${fontSize === s ? styles.segActive : ''}`} onClick={() => setFontSize(s)}>{s.toUpperCase()}</button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.prefField}>
                            <label className={styles.prefLabel}>LANGUAGE</label>
                            <select className={styles.prefSelect} value={language} onChange={e => setLanguage(e.target.value)}>
                                <option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="ja">日本語</option>
                            </select>
                        </div>
                    </div>
                </HoloPanel>
            </section>

            {/* ═══════════════════════════════════════════
          MONOLITH DASHBOARD PREFERENCES
          ═════════════════════════════════════════ */}
            <section className={styles.section}>
                <HoloPanel size="sm" depth="mid" header="MONOLITH DASHBOARD PREFERENCES">
                    <div className={styles.prefGrid}>
                        <div className={styles.prefField}>
                            <label className={styles.prefLabel}>DEFAULT LANDING PAGE</label>
                            <select className={styles.prefSelect} value={landingPage} onChange={e => setLandingPage(e.target.value)}>
                                <option value="/monolith">Overview</option>
                                <option value="/monolith/regime">Regime</option>
                                <option value="/monolith/risk">Risk</option>
                                <option value="/monolith/alpha">Alpha</option>
                                <option value="/monolith/execution">Execution</option>
                                <option value="/monolith/lanes">Lanes</option>
                                <option value="/monolith/portfolio">Portfolio</option>
                            </select>
                        </div>
                        <div className={styles.prefField}>
                            <label className={styles.prefLabel}>CHART DEFAULT TIMEFRAME</label>
                            <div className={styles.segmented}>
                                {['1H', '4H', '1D', '1W', '1M'].map(tf => (
                                    <button key={tf} className={`${styles.segBtn} ${chartTimeframe === tf ? styles.segActive : ''}`} onClick={() => setChartTimeframe(tf)}>{tf}</button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.prefField}>
                            <label className={styles.prefLabel}>SOUND ALERTS</label>
                            <button className={`${styles.prefToggleBtn} ${soundAlerts ? styles.prefOn : ''}`} onClick={() => setSoundAlerts(!soundAlerts)}>{soundAlerts ? 'ON' : 'OFF'}</button>
                        </div>
                    </div>
                </HoloPanel>
            </section>

            {/* ═══════════════════════════════════════════
          TWO-FACTOR AUTHENTICATION — Wired to API
          ═════════════════════════════════════════ */}
            <section className={styles.section}>
                <HoloPanel size="sm" depth="mid" header="TWO-FACTOR AUTHENTICATION">
                    <div className={styles.twoFARow}>
                        <div className={styles.twoFAInfo}>
                            <span className={styles.twoFAStatus}>
                                {twoFAEnabled ? '🔒 2FA ENABLED' : '⚠️ 2FA DISABLED'}
                            </span>
                            <span className={styles.twoFADesc}>
                                {twoFAEnabled
                                    ? 'Your account is protected with two-factor authentication via authenticator app.'
                                    : 'Add an extra layer of security with an authenticator app (Google Authenticator, Authy).'}
                            </span>
                        </div>
                        <button
                            className={twoFAEnabled ? styles.disableBtn : styles.enableBtn}
                            onClick={handleToggle2FA}
                            disabled={twoFALoading}
                        >
                            {twoFALoading ? 'PROCESSING…' : twoFAEnabled ? 'DISABLE 2FA' : 'ENABLE 2FA'}
                        </button>
                    </div>
                </HoloPanel>
            </section>

            {/* ═══════════════════════════════════════════
          EXPORTS & ACTIONS — All wired to API
          ═════════════════════════════════════════ */}
            <section className={styles.section}>
                <HoloLabel>EXPORTS & ACTIONS</HoloLabel>
                <div className={styles.actionRow}>
                    <button className={styles.exportBtn} onClick={handleExportTxHistory}>
                        EXPORT TRANSACTION HISTORY (CSV)
                    </button>
                    <button className={styles.exportBtn} onClick={handleExportTradeLog}>
                        EXPORT MONOLITH TRADE LOG (CSV)
                    </button>
                    <button className={styles.disconnectBtn} onClick={handleLogout}>
                        LOG OUT
                    </button>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
          DANGER ZONE — ACCOUNT DELETION — Wired to API
          ═════════════════════════════════════════ */}
            <section className={styles.section}>
                <HoloPanel size="sm" depth="mid" className={styles.dangerPanel}>
                    <div className={styles.dangerHeader}>DANGER ZONE</div>
                    <div className={styles.dangerRow}>
                        <div className={styles.dangerInfo}>
                            <span className={styles.dangerTitle}>Delete Account</span>
                            <span className={styles.dangerDesc}>
                                Permanently delete your account and all associated data. This action cannot be undone.
                                You must withdraw all funds before deleting your account.
                            </span>
                        </div>
                        {!showDeleteConfirm ? (
                            <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                                DELETE ACCOUNT
                            </button>
                        ) : (
                            <div className={styles.confirmDelete}>
                                <span className={styles.confirmText}>Are you sure? This is permanent.</span>
                                <div className={styles.confirmBtns}>
                                    <button
                                        className={styles.confirmYes}
                                        onClick={handleDeleteAccount}
                                        disabled={deleteLoading}
                                    >
                                        {deleteLoading ? 'DELETING…' : 'YES, DELETE'}
                                    </button>
                                    <button className={styles.confirmNo} onClick={() => setShowDeleteConfirm(false)}>CANCEL</button>
                                </div>
                            </div>
                        )}
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
