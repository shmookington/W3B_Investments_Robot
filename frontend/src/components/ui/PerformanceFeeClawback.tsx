'use client';

import React from 'react';

export function PerformanceFeeClawback() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', justifyContent: 'center' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px dashed rgba(244,244,245,0.1)' }}>
                <div style={{ color: 'rgba(244,244,245,0.5)', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                    GROSS HEDGE YIELD
                </div>
                <div style={{ color: 'var(--data-positive)', fontSize: '14px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                    +$2,450.00
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px dashed rgba(244,244,245,0.1)' }}>
                <div style={{ color: 'var(--accent-gold-primary)', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                    W3B HARVEST (20% AUTO-CLAWBACK)
                </div>
                <div style={{ color: 'rgba(244,244,245,0.4)', fontSize: '14px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                    -$490.00
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                <div style={{ color: 'var(--text-platinum)', fontSize: '12px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                    NET YIELD SETTLED TO IDLE RESERVE
                </div>
                <div style={{ color: 'var(--text-platinum)', fontSize: '18px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                    +$1,960.00
                </div>
            </div>

             <div style={{ color: 'rgba(244,244,245,0.3)', fontSize: '9px', fontFamily: 'var(--font-mono)', lineHeight: '1.4', marginTop: 'auto' }}>
                Performance fees are mathematically locked to executing addresses. Losses do not accrue fees. High-water mark rules apply.
            </div>
        </div>
    );
}
