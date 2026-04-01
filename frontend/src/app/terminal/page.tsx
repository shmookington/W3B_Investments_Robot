'use client';

import React from 'react';
import { InstitutionalGlass } from '@/components/ui/InstitutionalGlass';
import { OrderBook } from '@/components/ui/OrderBook';
import { ExecutionTape } from '@/components/ui/ExecutionTape';
import { RegimeRadar } from '@/components/ui/RegimeRadar';
import { ExecutionButton } from '@/components/ui/ExecutionButton';

export default function ExecutionsTerminalPage() {
    return (
        <div style={{ 
            display: 'flex', 
            width: '100%', 
            height: '100%', 
            gap: '24px',
        }}>
            {/* LEFT COLUMN: Data Visualizations (Radar + Metrics) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
                <InstitutionalGlass style={{ flex: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid rgba(244,244,245,0.05)', flexShrink: 0 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-platinum)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>REGIME RADAR (MARKOV HMM)</div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>LIVE PROBABILITY WEIGHTINGS</div>
                    </div>
                    <div style={{ flex: 1, minHeight: '300px' }}>
                        <RegimeRadar />
                    </div>
                </InstitutionalGlass>

                <InstitutionalGlass style={{ flex: 2, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                     <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>TARGET EXECUTION ASSET</div>
                     <div style={{ fontSize: '24px', color: 'var(--accent-gold-primary)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>NBA-LAL-BOS-2605</div>
                     <div style={{ fontSize: '12px', color: 'var(--text-platinum)', fontFamily: 'var(--font-mono)' }}>LIQUIDITY POOL: $1,450,230.00</div>
                     
                     <div style={{ display: 'flex', gap: '16px', marginTop: 'auto' }}>
                        <ExecutionButton style={{ flex: 1, fontSize: '10px', letterSpacing: '0.1em', background: 'rgba(0, 229, 255, 0.1)', borderColor: 'rgba(0, 229, 255, 0.5)' }}>
                            FORCE BUY
                        </ExecutionButton>
                        <ExecutionButton style={{ flex: 1, fontSize: '10px', letterSpacing: '0.1em', background: 'rgba(212, 175, 55, 0.1)', borderColor: 'rgba(212, 175, 55, 0.5)' }}>
                            FORCE SELL
                        </ExecutionButton>
                     </div>
                </InstitutionalGlass>
            </div>

            {/* MIDDLE COLUMN: Order Book */}
            <InstitutionalGlass style={{ flex: 1.5, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <OrderBook />
            </InstitutionalGlass>

            {/* RIGHT COLUMN: Execution Tape */}
            <InstitutionalGlass style={{ flex: 1.5, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <ExecutionTape />
            </InstitutionalGlass>
        </div>
    );
}
