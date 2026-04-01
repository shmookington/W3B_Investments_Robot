'use client';

import React from 'react';

export function ClvDriftGauge() {
    const openingPrice = 0.45;
    const closingPrice = 0.52;
    const drift = closingPrice - openingPrice;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>AGGREGATE OPENING ACQUISITION</div>
                    <div style={{ fontSize: '24px', color: 'rgba(244,244,245,0.6)', marginTop: '8px' }}>${openingPrice.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>MARKET CLOSING REALITY</div>
                    <div style={{ fontSize: '24px', color: 'var(--text-platinum)', marginTop: '8px' }}>${closingPrice.toFixed(2)}</div>
                </div>
            </div>

            {/* The Horizontal Drift Track */}
            <div style={{ position: 'relative', height: '12px', background: 'rgba(244,244,245,0.05)', borderRadius: '2px', width: '100%', overflow: 'hidden' }}>
                {/* Simulated Drift Progress from 45% -> 52% */}
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '45%', background: 'rgba(244,244,245,0.2)' }} />
                <div 
                    style={{ 
                        position: 'absolute', top: 0, left: '45%', bottom: 0, width: '7%', 
                        background: 'var(--data-positive)', boxShadow: '0 0 10px rgba(0, 229, 255, 0.4)',
                        animation: 'pulse 2s infinite'
                    }} 
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(0, 229, 255, 0.05)', border: '1px dashed var(--data-positive)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-platinum)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>CLV GENERATED (EDGE)</div>
                <div style={{ fontSize: '28px', color: 'var(--data-positive)', fontFamily: 'var(--font-mono)' }}>+${drift.toFixed(2)}</div>
            </div>

             <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.3)', fontFamily: 'var(--font-mono)', lineHeight: '1.4' }}>
                By establishing execution limits aggressively below market consensus, W3B mathematically ensures mathematically positive expected value (+EV) regardless of the binary event outcome.
            </div>
        </div>
    );
}
