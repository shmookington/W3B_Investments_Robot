'use client';

import React from 'react';
import { InstitutionalGlass } from '@/components/ui/InstitutionalGlass';
import { IngestionPipelineTree } from '@/components/ui/IngestionPipelineTree';
import { LatencyPingHUD } from '@/components/ui/LatencyPingHUD';
import { AnomalousDataLog } from '@/components/ui/AnomalousDataLog';
import Link from 'next/link';

export default function DataIntegrityPage() {
    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            width: '100%', 
            height: '100%', 
            gap: '24px',
        }}>
            {/* TOP ROW: Ingestion Tree Visualizer */}
            <InstitutionalGlass style={{ 
                flex: 1.5, display: 'flex', flexDirection: 'column', padding: '0' 
            }}>
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(244,244,245,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-platinum)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>INGESTION PIPELINE PATHWAYS</div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>DATA / STATE CONSENSUS FLOW</div>
                    </div>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <IngestionPipelineTree />
                </div>
            </InstitutionalGlass>

            {/* BOTTOM ROW: Latency Monitors and Anomaly Log */}
            <div style={{ flex: 2, display: 'flex', gap: '24px' }}>
                
                {/* Latency Monitors */}
                <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-platinum)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>SUB-SECOND LATENCY HEALTH</div>
                    <LatencyPingHUD endpoint="WSS://API.KALSHI.COM/V1" label="KALSHI ORDERBOOK NODE" baseMs={42} />
                    <LatencyPingHUD endpoint="HTTPS://API.SPORTSDATA.IO/V3" label="RAPID/ESPN PRIMARY ORACLE" baseMs={114} />
                    <LatencyPingHUD endpoint="DATABASE.REST.SUPABASE" label="W3B INTERNAL RECONCILER" baseMs={18} />
                </InstitutionalGlass>

                {/* Anomaly Log */}
                <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column' }}>
                    <AnomalousDataLog />
                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <Link href="/dashboard" style={{ color: 'rgba(244,244,245,0.3)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textDecoration: 'none' }}>
                            ← RETURN TO DASHBOARD
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
