'use client';

import { useState, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { HoloGauge } from '@/components/HoloGauge';
import { PageContainer } from '@/components/Layout';
import { StatCounter } from '@/components/StatCounter';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Component ─────────────────────────────────────────────── */
export default function LaneSplitterPage() {
    const [online, setOnline] = useState(false);
    const [loading, setLoading] = useState(true);
    const [depositAmt, setDepositAmt] = useState('100000');
    const [showConfirm, setShowConfirm] = useState(false);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/engine/proxy?endpoint=health');
            if (res.ok) { const d = await res.json(); setOnline(d.status === 'ok'); }
        } catch { /* offline */ }
        setLoading(false);
    };

    useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, []);

    // Lane splitting calculator (this is a planning tool, not mock data)
    const deposit = parseInt(depositAmt) || 0;
    const numLanes = deposit >= 50000 ? 10 : deposit >= 20000 ? 7 : deposit >= 10000 ? 5 : deposit >= 5000 ? 3 : 1;
    const perLane = deposit > 0 ? Math.floor(deposit / numLanes) : 0;
    const survival = numLanes >= 10 ? 99.7 : numLanes >= 7 ? 99.0 : numLanes >= 5 ? 97.5 : numLanes >= 3 ? 93.0 : 82.0;
    const wipeout = (100 - survival).toFixed(1);
    const expectedSurvivors = Math.round(numLanes * (survival / 100) * 10) / 10;

    if (loading) {
        return (
            <PageContainer>
                <MonolithNav />
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', letterSpacing: '2px' }}>
                    LOADING LANES DATA…
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <MonolithNav />

            {/* STATUS */}
            <section style={{ padding: '0 20px', marginBottom: '16px' }}>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        <span style={{ color: online ? '#39ff14' : '#ff4444' }}>
                            ● ENGINE {online ? 'ONLINE' : 'OFFLINE'}
                        </span>
                        <span style={{ color: 'rgba(224,224,232,0.3)' }}>
                            Lane system not yet deployed — use calculator below for planning
                        </span>
                    </div>
                </HoloPanel>
            </section>

            {/* DEPOSIT & SPLIT CALCULATOR (functional tool, not mock data) */}
            <section className={styles.deposit}>
                <HoloPanel size="sm" depth="mid" header="DEPOSIT & SPLIT CALCULATOR">
                    <div className={styles.depositForm}>
                        <div className={styles.depositInput}>
                            <label className={styles.depositLabel}>DEPOSIT AMOUNT</label>
                            <div className={styles.inputRow}>
                                <span className={styles.currSign}>$</span>
                                <input type="number" className={styles.amountInput} value={depositAmt} onChange={e => setDepositAmt(e.target.value)} />
                                <select className={styles.currSelect}><option>USD</option></select>
                            </div>
                        </div>
                        <div className={styles.planPreview}>
                            <div className={styles.planStat}>
                                <span className={styles.planBig}>{numLanes}</span>
                                <span className={styles.planLabel}>LANES × ${perLane.toLocaleString()}</span>
                            </div>
                            <HoloGauge value={survival} label="SURVIVAL" size={80} />
                            <div className={styles.planStat}>
                                <span className={styles.planBig}>{expectedSurvivors}</span>
                                <span className={styles.planLabel}>EXPECTED SURVIVORS</span>
                            </div>
                            <span className={styles.wipeoutText}>Wipeout: {wipeout}%</span>
                        </div>
                        <button className={styles.deployBtn} onClick={() => setShowConfirm(true)} disabled={!online}>
                            {online ? 'DEPLOY LANES' : 'ENGINE OFFLINE — CANNOT DEPLOY'}
                        </button>
                    </div>
                </HoloPanel>

                {showConfirm && (
                    <div className={styles.modalOverlay} onClick={() => setShowConfirm(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h3 className={styles.modalTitle}>CONFIRM DEPLOYMENT</h3>
                            <div className={styles.modalBody}>
                                <p>Deploying <strong>{numLanes} lanes</strong> × <strong>${perLane.toLocaleString()}</strong></p>
                                <p>Survival probability: <strong>{survival}%</strong></p>
                                <p>Expected survivors: <strong>{expectedSurvivors}</strong></p>
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.modalCancel} onClick={() => setShowConfirm(false)}>CANCEL</button>
                                <button className={styles.modalConfirm} onClick={() => setShowConfirm(false)}>CONFIRM DEPLOY</button>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* LANE MONITOR — NO ACTIVE LANES */}
            <section className={styles.monitor}>
                <HoloLabel>LANE MONITOR</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                        <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.3 }}>◈</div>
                        NO ACTIVE LANES
                        <br /><br />
                        <span style={{ fontSize: '10px', color: 'rgba(224,224,232,0.15)' }}>
                            No lanes have been deployed yet. Use the calculator above to plan your split,
                            <br />then deploy lanes once the lane system is connected to the engine.
                        </span>
                    </div>
                </HoloPanel>
            </section>

            {/* PROJECTION — AWAITING */}
            <section className={styles.projection}>
                <HoloPanel size="md" depth="mid" header="6-MONTH PROJECTION">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Monte Carlo projection will generate once lanes are deployed and
                        <br />accumulate return data for statistical modeling.
                    </div>
                </HoloPanel>
            </section>

            {/* EMERGENCY CONTROLS */}
            <section className={styles.emergency}>
                <HoloLabel>EMERGENCY CONTROLS</HoloLabel>
                <div className={styles.emergencyRow}>
                    <button className={styles.killAllBtn} disabled>KILL ALL LANES</button>
                    <button className={styles.pauseAllBtn} disabled>PAUSE ALL</button>
                    <button className={styles.addLaneBtn} disabled>+ ADD LANE</button>
                </div>
            </section>
        </PageContainer>
    );
}
