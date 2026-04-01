'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { InstitutionalGlass } from '@/components/ui/InstitutionalGlass';
import { ExecutionButton } from '@/components/ui/ExecutionButton';

interface VaultStats {
    tvl: number;
    totalPnl: number;
    winRate: number;
    tradeCount: number;
}

export default function TerminalDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<VaultStats | null>(null);
    const [autoPilot, setAutoPilot] = useState(false);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/vault/stats');
                const json = await res.json();
                if (json.success) setStats(json.data);
            } catch (err) {}
        }
        fetchStats();
    }, []);

    const tvl = stats?.tvl ?? 0;
    const totalPnl = stats?.totalPnl ?? 0;
    const activePositions = stats?.tradeCount ?? 0;

    // Mock live holdings for the dense data grid
    const mockHoldings = [
        { ticker: 'NBA-LAL-BOS-2605', class: 'HOME_WIN', qty: 450, entry: 0.45, market: 0.62, pnl: 76.50 },
        { ticker: 'NBA-DEN-PHX-2612', class: 'AWAY_WIN', qty: 1200, entry: 0.32, market: 0.31, pnl: -12.00 },
        { ticker: 'MLB-NYY-BOS-2618', class: 'TOTAL_OVER', qty: 800, entry: 0.50, market: 0.55, pnl: 40.00 },
        { ticker: 'NFL-KC-BAL-2622', class: 'SPREAD_-3', qty: 2500, entry: 0.20, market: 0.82, pnl: 1550.00 },
        { ticker: 'EPL-MCI-ARS-2630', class: 'DRAW', qty: 300, entry: 0.15, market: 0.12, pnl: -9.00 },
        { ticker: 'UFC-OMAL-DVAL-2635', class: 'DECISION', qty: 150, entry: 0.28, market: 0.41, pnl: 19.50 },
        { ticker: 'NBA-MIA-CHI-2640', class: 'HOME_WIN', qty: 950, entry: 0.51, market: 0.45, pnl: -57.00 },
        { ticker: 'NFL-SF-SEA-2645', class: 'TOTAL_UNDER', qty: 3200, entry: 0.44, market: 0.68, pnl: 768.00 },
        { ticker: 'NHL-VGK-COL-2650', class: 'MONEYLINE', qty: 500, entry: 0.33, market: 0.35, pnl: 10.00 }
    ];

    if (!user) {
        return (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.2em' }}>
                [AUTH] Valid session token required.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
            
            {/* 1. PORTFOLIO STAT RIBBON */}
            <div style={{ display: 'flex', gap: '24px', height: '120px', flexShrink: 0 }}>
                <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>CAPITAL DEPLOYED</div>
                    <div style={{ fontSize: '32px', color: 'var(--text-platinum)' }}>
                        ${tvl > 0 ? tvl.toLocaleString() : '8,450.00'}
                    </div>
                </InstitutionalGlass>

                <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>REALIZED PNL</div>
                    <div style={{ fontSize: '32px', color: 'var(--data-positive)' }}>
                        +${totalPnl > 0 ? totalPnl.toLocaleString() : '1,245.80'}
                    </div>
                </InstitutionalGlass>

                <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>UNREALIZED PNL</div>
                    <div style={{ fontSize: '32px', color: 'var(--data-positive)' }}>
                        +${mockHoldings.reduce((sum, h) => sum + h.pnl, 0).toFixed(2)}
                    </div>
                </InstitutionalGlass>

                <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>DELTA EXPOSURE</div>
                    <div style={{ fontSize: '32px', color: 'var(--accent-gold-primary)' }}>
                        $3,120.00
                    </div>
                </InstitutionalGlass>
            </div>

            {/* 2. HOLDINGS GRID (Scrollable) */}
            <InstitutionalGlass style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(212,175,55,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--accent-gold-primary)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>ACTIVE ALLOCATIONS</div>
                    <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)' }}>{activePositions > 0 ? activePositions : mockHoldings.length} LIVE POSITIONS</div>
                </div>
                
                {/* Table Header */}
                <div style={{ display: 'flex', padding: '16px 24px', borderBottom: '1px solid rgba(244,244,245,0.05)', fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ flex: 2 }}>TICKER</div>
                    <div style={{ flex: 2 }}>SHARE CLASS</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>QTY</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>ENTRY</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>MARKET</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>UNREALIZED</div>
                </div>

                {/* Vertical Scroll Area */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {mockHoldings.map((h, i) => (
                        <div key={i} style={{ 
                            display: 'flex', 
                            padding: '16px 24px', 
                            borderBottom: '1px solid rgba(244,244,245,0.02)', 
                            fontSize: '13px', 
                            color: 'var(--text-platinum)',
                            fontFamily: 'var(--font-mono)'
                        }}>
                            <div style={{ flex: 2, color: 'var(--text-charcoal)' }}>{h.ticker}</div>
                            <div style={{ flex: 2 }}>{h.class}</div>
                            <div style={{ flex: 1, textAlign: 'right', color: 'rgba(244,244,245,0.7)' }}>{h.qty}</div>
                            <div style={{ flex: 1, textAlign: 'right', color: 'rgba(244,244,245,0.7)' }}>${h.entry.toFixed(2)}</div>
                            <div style={{ flex: 1, textAlign: 'right', color: 'var(--accent-gold-primary)' }}>${h.market.toFixed(2)}</div>
                            <div style={{ flex: 1, textAlign: 'right', color: h.pnl >= 0 ? 'var(--data-positive)' : 'var(--data-negative)' }}>
                                {h.pnl >= 0 ? '+' : ''}${h.pnl.toFixed(2)}
                            </div>
                        </div>
                    ))}
                    <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(244,244,245,0.2)', fontSize: '10px', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                        END OF ALLOCATIONS
                    </div>
                </div>
            </InstitutionalGlass>

            {/* 3. ALGORITHMIC HEDGING TOGGLE & ACTIONS */}
            <div style={{ display: 'flex', gap: '24px', height: '80px', flexShrink: 0 }}>
                <InstitutionalGlass style={{ flex: 2, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-platinum)', letterSpacing: '0.1em', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>ALGORITHMIC HEDGING (AUTOPILOT)</div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)' }}>Transfer portfolio sizing control to MONOLITH generic engine.</div>
                    </div>
                    <div 
                        onClick={() => setAutoPilot(!autoPilot)}
                        style={{
                            width: '48px', height: '24px', borderRadius: '12px', 
                            background: autoPilot ? 'rgba(0, 229, 255, 0.2)' : 'rgba(244,244,245,0.1)',
                            border: `1px solid ${autoPilot ? 'var(--data-positive)' : 'rgba(244,244,245,0.2)'}`,
                            position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                        }}
                    >
                        <div style={{
                            position: 'absolute', top: '2px', left: autoPilot ? '26px' : '2px',
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: autoPilot ? 'var(--data-positive)' : 'rgba(244,244,245,0.4)',
                            transition: 'left 0.3s'
                        }} />
                    </div>
                </InstitutionalGlass>

                <ExecutionButton style={{ flex: 1, fontSize: '11px', letterSpacing: '0.1em' }}>
                    DEPOSIT CAPITAL
                </ExecutionButton>
                
                <ExecutionButton style={{ flex: 1, fontSize: '11px', letterSpacing: '0.1em' }} onClick={() => window.location.href='/track-record'}>
                    VIEW AUDIT LOG
                </ExecutionButton>
            </div>
        </div>
    );
}
