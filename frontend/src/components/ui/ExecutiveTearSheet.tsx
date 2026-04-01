'use client';

import React from 'react';

export function ExecutiveTearSheet() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header Identity */}
            <div>
                <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                    W3B EXECUTIVE VIEW
                </div>
                <div style={{ fontSize: '32px', color: 'var(--text-platinum)', marginTop: '8px' }}>
                    Welcome back.
                </div>
            </div>

            {/* Brutalist PnL Tear Sheet */}
            <div style={{ background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.2)', padding: '24px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: 'var(--accent-gold-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em' }}>
                    NET CAPITAL RESERVES
                </div>
                <div style={{ fontSize: '48px', color: 'var(--text-platinum)', marginTop: '16px', letterSpacing: '-0.02em' }}>
                    $100,000<span style={{ fontSize: '20px', color: 'rgba(244,244,245,0.4)' }}>.00</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--data-positive)', fontFamily: 'var(--font-mono)' }}>+$1,960.00 YTD</div>
                    <div style={{ width: '1px', height: '12px', background: 'rgba(244,244,245,0.1)' }} />
                    <div style={{ fontSize: '12px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)' }}>+1.96%</div>
                </div>
            </div>

            {/* Minor Data Strip */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px dashed rgba(244,244,245,0.1)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(244,244,245,0.6)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                        OPEN EXECUTIONS
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-platinum)', fontFamily: 'var(--font-mono)' }}>
                        24 POSITIONS
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px dashed rgba(244,244,245,0.1)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(244,244,245,0.6)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                        ACTIVE VOLATILITY
                    </div>
                    <div style={{ fontSize: '14px', color: '#ff3b3b', fontFamily: 'var(--font-mono)' }}>
                        HIGH (14%)
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px dashed rgba(244,244,245,0.1)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(244,244,245,0.6)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                        KELLY CRITERION CAP
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--accent-gold-primary)', fontFamily: 'var(--font-mono)' }}>
                        $25,000 LIMIT
                    </div>
                </div>
            </div>

            <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.3)', fontFamily: 'var(--font-mono)', lineHeight: '1.4', textAlign: 'center', marginTop: '32px' }}>
                FOR AUTHORIZED PERSONNEL ONLY.<br/>DISTRIBUTION IS STRICTLY PROHIBITED.
            </div>
        </div>
    );
}
