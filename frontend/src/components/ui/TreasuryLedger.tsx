'use client';

import React, { useState } from 'react';

// Institutional T+1 / T+2 Mock Ledger Data
const generateLedger = () => {
    return [
        { id: 'TX-091A', date: '2026-03-29 14:02:44', type: 'USDC DEPOSIT', status: 'SETTLED', cycle: 'T+0', amount: '+$50,000.00', hash: '0x8f...1a4c', highlight: true },
        { id: 'TX-084B', date: '2026-03-27 09:15:10', type: 'BASE ALLOCATION', status: 'SETTLED', cycle: 'T+0', amount: '-$12,000.00', hash: '0x2b...9d8a', highlight: false },
        { id: 'TX-082C', date: '2026-03-25 18:33:05', type: 'YIELD SETTLEMENT', status: 'SETTLED', cycle: 'T+1', amount: '+$1,450.00', hash: '0x99...4f21', highlight: true },
        { id: 'TX-082D', date: '2026-03-25 18:33:05', type: 'ALPHA HARVEST (20%)', status: 'SETTLED', cycle: 'T+1', amount: '-$290.00', hash: 'INTERNAL', highlight: false },
        { id: 'TX-077E', date: '2026-03-20 11:42:19', type: 'FIAT WITHDRAWAL', status: 'CLEARING', cycle: 'T+2', amount: '-$5,000.00', hash: 'ROUTING...', highlight: false },
        { id: 'TX-071F', date: '2026-03-14 08:00:11', type: 'USDC DEPOSIT', status: 'SETTLED', cycle: 'T+0', amount: '+$25,000.00', hash: '0x1c...7bcd', highlight: true },
    ];
};

export function TreasuryLedger() {
    const [logs] = useState(generateLedger());

    return (
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* TABLE HEADER */}
            <div style={{ display: 'flex', padding: '16px 24px', borderBottom: '1px solid rgba(244,244,245,0.05)', fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                <div style={{ flex: 1.5 }}>DATE (UTC)</div>
                <div style={{ flex: 1.5 }}>TRANSACTION TYPE</div>
                <div style={{ flex: 1, textAlign: 'center' }}>CYCLE</div>
                <div style={{ flex: 1, textAlign: 'center' }}>STATUS</div>
                <div style={{ flex: 1.5, textAlign: 'right' }}>HASH / TXID</div>
                <div style={{ flex: 1.5, textAlign: 'right' }}>NOTIONAL</div>
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
                        fontFamily: 'var(--font-mono)',
                        alignItems: 'center'
                    }}>
                        <div style={{ flex: 1.5, color: 'rgba(244,244,245,0.5)' }}>{log.date}</div>
                        <div style={{ flex: 1.5, color: '#a1a1aa' }}>{log.type}</div>
                        <div style={{ flex: 1, textAlign: 'center', color: 'rgba(244,244,245,0.4)' }}>{log.cycle}</div>
                        <div style={{ 
                            flex: 1, textAlign: 'center', 
                            color: log.status === 'CLEARING' ? 'var(--accent-gold-primary)' : 'rgba(244,244,245,0.3)' 
                        }}>
                            {log.status === 'CLEARING' ? '[ CLEARING ]' : '[ SETTLED ]'}
                        </div>
                        <div style={{ flex: 1.5, textAlign: 'right', color: 'rgba(244,244,245,0.3)' }}>{log.hash}</div>
                        <div style={{ 
                            flex: 1.5, textAlign: 'right', 
                            color: log.amount.startsWith('+') ? 'var(--data-positive)' : 'rgba(244,244,245,0.6)' 
                        }}>
                            {log.amount}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
