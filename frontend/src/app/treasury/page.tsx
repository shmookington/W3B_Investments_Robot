'use client';

import React from 'react';
import { InstitutionalGlass } from '@/components/ui/InstitutionalGlass';
import { ExecutionButton } from '@/components/ui/ExecutionButton';
import { TreasuryLedger } from '@/components/ui/TreasuryLedger';
import { AllocationSlider } from '@/components/ui/AllocationSlider';
import { PerformanceFeeClawback } from '@/components/ui/PerformanceFeeClawback';
import Link from 'next/link';

export default function TreasuryVaultPage() {
    const totalReserve = 100000;

    return (
        <div style={{ 
            display: 'flex', 
            width: '100%', 
            height: '100%', 
            gap: '24px',
        }}>
            {/* LEFT COLUMN: Reserve and Ledgers */}
            <InstitutionalGlass style={{ flex: 1.5, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '32px', borderBottom: '1px solid rgba(244,244,245,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>BASE FIAT RESERVE</div>
                        <div style={{ fontSize: '36px', color: 'var(--text-platinum)', marginTop: '8px' }}>
                            ${totalReserve.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: '16px', color: 'rgba(244,244,245,0.3)' }}>USDC</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <ExecutionButton style={{ padding: '12px 24px', fontSize: '10px', background: 'transparent', border: '1px solid rgba(244,244,245,0.2)' }}>
                            WITHDRAW FIAT
                        </ExecutionButton>
                        <ExecutionButton style={{ padding: '12px 24px', fontSize: '10px' }}>
                            WIRE CAPITAL
                        </ExecutionButton>
                    </div>
                </div>
                
                <div style={{ padding: '24px 32px', background: 'rgba(212, 175, 55, 0.02)', borderBottom: '1px solid rgba(244,244,245,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--accent-gold-primary)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>T+0 CLEARED TREASURY LEDGER</div>
                    <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)' }}>6 RECORDS</div>
                </div>

                <TreasuryLedger />
                
                <div style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(244,244,245,0.05)' }}>
                    <Link href="/dashboard" style={{ color: 'rgba(244,244,245,0.3)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textDecoration: 'none' }}>
                        ← RETURN TO DASHBOARD
                    </Link>
                </div>
            </InstitutionalGlass>

            {/* RIGHT COLUMN: Limits and Clawbacks */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
                
                {/* Allocation Controller */}
                <InstitutionalGlass style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-platinum)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>EXPOSURE CONTROLLER</div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', marginTop: '8px', lineHeight: '1.4' }}>
                            Set the absolute maximum fraction of your reserve that the engine is allowed to hedge.
                        </div>
                    </div>
                    
                    <AllocationSlider totalCapital={totalReserve} />
                </InstitutionalGlass>

                {/* Clawback Visualizer */}
                <InstitutionalGlass style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--accent-gold-primary)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>PERFORMANCE HARVEST</div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', marginTop: '8px', lineHeight: '1.4' }}>
                            W3B transparently extracts algorithmic settlement fees exclusively on net-positive execution paths.
                        </div>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                        <PerformanceFeeClawback />
                    </div>
                </InstitutionalGlass>
                
            </div>
        </div>
    );
}
