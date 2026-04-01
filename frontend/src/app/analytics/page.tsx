'use client';

import React from 'react';
import { InstitutionalGlass } from '@/components/ui/InstitutionalGlass';
import { BrierCalibrationPlot } from '@/components/ui/BrierCalibrationPlot';
import { SubModelLeaderboard } from '@/components/ui/SubModelLeaderboard';
import { ClvDriftGauge } from '@/components/ui/ClvDriftGauge';
import Link from 'next/link';

export default function QuantAnalyticsPage() {
    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            width: '100%', 
            height: '100%', 
            gap: '24px',
        }}>
            {/* TOP ROW: Brier Plot and CLV Gauge */}
            <div style={{ flex: 1.5, display: 'flex', gap: '24px' }}>
                <InstitutionalGlass style={{ flex: 1.5, display: 'flex', flexDirection: 'column', padding: '32px' }}>
                    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>EXPECTATION VS REALITY</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-platinum)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>BRIER CALIBRATION CURVE</div>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--data-positive)', fontFamily: 'var(--font-mono)' }}>[ PERFECTLY CALIBRATED = DIAGONAL ]</div>
                    </div>
                    <BrierCalibrationPlot />
                </InstitutionalGlass>

                <InstitutionalGlass style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-platinum)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>CLOSING LINE VALUE</div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', marginTop: '8px', lineHeight: '1.4' }}>
                            Absolute mathematical edge generated prior to event binary outcome.
                        </div>
                    </div>
                    
                    <ClvDriftGauge />
                </InstitutionalGlass>
            </div>

            {/* BOTTOM ROW: Ensemble Leaderboard */}
            <div style={{ flex: 1, display: 'flex', gap: '24px' }}>
                <InstitutionalGlass style={{ flex: 2, padding: '32px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--accent-gold-primary)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>AUTONOMIC ENSEMBLE WEIGHTS</div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', marginTop: '8px', lineHeight: '1.4' }}>
                            The Monolith shifts capital across sub-models algorithmically based on performance variance.
                        </div>
                    </div>
                    
                    <SubModelLeaderboard />
                </InstitutionalGlass>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px', border: '1px solid rgba(244,244,245,0.05)', background: 'rgba(10,10,12,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textAlign: 'center', marginBottom: '24px', lineHeight: '1.6' }}>
                        ALL MODELS ARE WRONG.<br/>SOME ARE USEFUL.
                    </div>
                    <Link href="/dashboard" style={{ padding: '12px 24px', border: '1px solid rgba(244,244,245,0.2)', color: 'var(--text-platinum)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textDecoration: 'none', transition: 'all 0.3s', background: 'transparent' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244,244,245,0.05)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                        ← RETURN TO DASHBOARD
                    </Link>
                </div>
            </div>
        </div>
    );
}
