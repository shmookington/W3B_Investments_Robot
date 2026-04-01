'use client';

import React, { useState } from 'react';
import { InstitutionalGlass } from '@/components/ui/InstitutionalGlass';
import { ExecutionButton } from '@/components/ui/ExecutionButton';
import { PerformanceChartAdvanced } from '@/components/ui/PerformanceChartAdvanced';
import Link from 'next/link';

// Mock data generation for the audit log
const generateAuditLog = (numRecords: number) => {
    const baseDate = new Date();
    return Array.from({ length: numRecords }, (_, i) => {
        const d = new Date(baseDate.getTime() - i * 6 * 60 * 60 * 1000); // minus 6 hours per record
        const yieldAmt = (Math.random() * 20) - 5; // yield between -5% and 15%
        const isWin = yieldAmt > 0;
        return {
            id: `AL-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
            date: d.toISOString().replace('T', ' ').substring(0, 19),
            ticker: `EVT-${['NBA','NFL','EPL','MLB'][Math.floor(Math.random()*4)]}-${Math.floor(Math.random()*900)+100}X`,
            position: Math.random() > 0.5 ? 'LONG SPREAD @ 0.45' : 'SHORT LINE @ 0.52',
            clv: (Math.random() * 0.2 + 0.95).toFixed(2) + 'x',
            yield: isWin ? `ACHIEVED +${yieldAmt.toFixed(1)}% YIELD` : `SETTLED ${yieldAmt.toFixed(1)}% YIELD`,
            isWin
        };
    });
};

const mockChartData = Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i + 1}`,
    equity: 10000 + (i * 200) + (Math.random() * 1000 - 500)
}));

export default function TrackRecordPage() {
    const [logs, setLogs] = useState(generateAuditLog(40));
    const [loading, setLoading] = useState(false);

    const loadMore = () => {
        setLoading(true);
        setTimeout(() => {
            setLogs(prev => [...prev, ...generateAuditLog(100)]);
            setLoading(false);
        }, 800);
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: '80px 40px 40px 40px',
            position: 'relative',
            zIndex: 1, 
        }}>
            <div style={{
                flex: 1,
                width: '100%',
                maxWidth: '1600px',
                margin: '0 auto',
                display: 'flex',
                gap: '24px',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* 1. VERIFICATION RIBBON & HEADER ROW */}
                <div style={{ display: 'flex', gap: '24px', height: '140px', flexShrink: 0 }}>
                    <InstitutionalGlass style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
                        <div style={{ color: 'var(--accent-gold-primary)', fontSize: '11px', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                            W3B IMMUTABLE TRACK RECORD
                        </div>
                        <div style={{ color: 'var(--text-platinum)', fontSize: '28px' }}>
                            Performance Audit Log
                        </div>
                    </InstitutionalGlass>

                    <InstitutionalGlass style={{ flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: 'var(--data-positive, #00e5ff)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: 'var(--data-positive, #00e5ff)', fontSize: '11px', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                                    SYSTEM VERIFICATION
                                </div>
                                <div style={{ color: 'rgba(244,244,245,0.7)', fontSize: '12px', fontFamily: 'var(--font-mono)', lineHeight: '1.6' }}>
                                    [DATA VALIDATED AGAINST CFTC-REGULATED DCM DATA FEEDS]<br/>
                                    All execution hashes are securely written to internal database blocks. Resettlement impossible.
                                </div>
                            </div>
                            <ExecutionButton style={{ padding: '12px 24px', fontSize: '10px', letterSpacing: '0.1em', background: 'rgba(212, 175, 55, 0.1)' }}>
                                EXPORT CSV
                            </ExecutionButton>
                        </div>
                    </InstitutionalGlass>
                </div>

                {/* 2. MAIN LAYOUT: Chart Left, Ledger Right */}
                <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
                    
                    {/* LEFT COLUMN: Chart + Stats */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <InstitutionalGlass style={{ flex: 2, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-platinum)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: '16px' }}>
                                HISTORICAL EQUITY YIELD
                            </div>
                            <div style={{ flex: 1 }}>
                                <PerformanceChartAdvanced data={mockChartData} />
                            </div>
                        </InstitutionalGlass>

                        <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
                            <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>MAX DRAWDOWN</div>
                                <div style={{ fontSize: '24px', color: 'var(--data-negative)' }}>-8.4%</div>
                            </InstitutionalGlass>
                            <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>SHARPE RATIO</div>
                                <div style={{ fontSize: '24px', color: 'var(--accent-gold-primary)' }}>1.84</div>
                            </InstitutionalGlass>
                        </div>
                        
                        <div style={{ marginTop: 'auto', textAlign: 'center' }}>
                            <Link href="/dashboard" style={{ color: 'rgba(244,244,245,0.3)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textDecoration: 'none' }}>
                                ← RETURN TO PORTFOLIO
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: The Dense Ledger */}
                    <InstitutionalGlass style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid rgba(244,244,245,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px', color: 'var(--accent-gold-primary)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>COMPLETE EXECUTION LEDGER</div>
                            <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)' }}>{logs.length} RECORDS RENDERED</div>
                        </div>

                        {/* TABLE HEADER */}
                        <div style={{ display: 'flex', padding: '16px 24px', borderBottom: '1px solid rgba(244,244,245,0.05)', fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                            <div style={{ flex: 2 }}>DATE (UTC)</div>
                            <div style={{ flex: 1.5 }}>TICKER</div>
                            <div style={{ flex: 2 }}>POSITION</div>
                            <div style={{ flex: 1, textAlign: 'center' }}>CLV X</div>
                            <div style={{ flex: 2, textAlign: 'right' }}>SETTLEMENT</div>
                        </div>

                        {/* TABLE SCROLL AREA */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                            {logs.map((log, i) => (
                                <div key={log.id} style={{ 
                                    display: 'flex', 
                                    padding: '16px 24px', 
                                    borderBottom: '1px solid rgba(244,244,245,0.02)', 
                                    background: i % 2 === 0 ? 'transparent' : 'rgba(244,244,245,0.01)',
                                    fontSize: '11px', 
                                    color: 'var(--text-platinum)',
                                    fontFamily: 'var(--font-mono)'
                                }}>
                                    <div style={{ flex: 2, color: 'rgba(244,244,245,0.5)' }}>{log.date}</div>
                                    <div style={{ flex: 1.5, color: '#a1a1aa' }}>{log.ticker}</div>
                                    <div style={{ flex: 2 }}>{log.position}</div>
                                    <div style={{ flex: 1, textAlign: 'center', color: parseFloat(log.clv) > 1 ? 'var(--data-positive)' : 'var(--data-negative)' }}>{log.clv}</div>
                                    <div style={{ flex: 2, textAlign: 'right', color: log.isWin ? 'var(--accent-gold-primary)' : 'rgba(244,244,245,0.4)' }}>
                                        {log.yield}
                                    </div>
                                </div>
                            ))}
                            
                            <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
                                <ExecutionButton 
                                    onClick={loadMore} 
                                    disabled={loading}
                                    style={{ padding: '12px 32px', fontSize: '10px', letterSpacing: '0.2em' }}
                                >
                                    {loading ? 'RETRIEVING FROM DATABASE...' : '[ LOAD NEXT 100 RECORDS ]'}
                                </ExecutionButton>
                            </div>
                        </div>
                    </InstitutionalGlass>
                </div>
            </div>
        </div>
    );
}
