'use client';

import React from 'react';
import { InstitutionalGlass } from '@/components/ui/InstitutionalGlass';
import { CircuitBreakerPanel } from '@/components/ui/CircuitBreakerPanel';
import { ExposureHeatmap } from '@/components/ui/ExposureHeatmap';
import { EmergencyKillSwitch } from '@/components/ui/EmergencyKillSwitch';
import Link from 'next/link';

export default function RiskManagementPage() {
    return (
        <div style={{ 
            display: 'flex', 
            width: '100%', 
            height: '100%', 
            gap: '24px',
        }}>
            {/* LEFT COLUMN: Deep Risk Indicators */}
            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
                
                {/* Circuit Breaker Array */}
                <InstitutionalGlass style={{ flex: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid rgba(244,244,245,0.05)', flexShrink: 0, display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-platinum)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>INTERNAL ML CIRCUIT BREAKERS</div>
                            <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>MONITORING PLATFORM HEALTH</div>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--data-positive, #00e5ff)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                            [ ALL SYSTEMS NOMINAL ]
                        </div>
                    </div>
                    <div style={{ flex: 1, padding: '24px' }}>
                        <CircuitBreakerPanel />
                    </div>
                </InstitutionalGlass>

                <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
                    <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>CURRENT PORTFOLIO KELLY FRACTION</div>
                        <div style={{ fontSize: '24px', color: 'var(--text-platinum)' }}>f* = 0.08</div>
                        <div style={{ fontSize: '10px', color: 'var(--data-positive)', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>STRICT CONSERVATIVE SIZING</div>
                    </InstitutionalGlass>
                    <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>PORTFOLIO UTILIZATION EXPOSURE</div>
                        <div style={{ fontSize: '24px', color: 'var(--accent-gold-primary)' }}>14.2% DEPLOYED</div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>85.8% IDLE CAPITAL IN LIQUID RESERVE</div>
                    </InstitutionalGlass>
                </div>
                
                <div style={{ marginTop: 'auto' }}>
                    <Link href="/dashboard" style={{ color: 'rgba(244,244,245,0.3)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textDecoration: 'none' }}>
                        ← RETURN TO DASHBOARD
                    </Link>
                </div>
            </div>

            {/* RIGHT COLUMN: Treemap & Killswitch */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
                <InstitutionalGlass style={{ flex: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid rgba(244,244,245,0.05)', flexShrink: 0 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-platinum)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>KELLY EXPOSURE HEATMAP</div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>LIVE EVENT NOTIONAL SIZING</div>
                    </div>
                    <div style={{ flex: 1, padding: '24px' }}>
                        <ExposureHeatmap />
                    </div>
                </InstitutionalGlass>

                <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <EmergencyKillSwitch />
                </InstitutionalGlass>
            </div>
        </div>
    );
}
