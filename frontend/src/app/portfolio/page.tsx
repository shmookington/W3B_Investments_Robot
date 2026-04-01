'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { InstitutionalGlass } from '@/components/ui/InstitutionalGlass';
import { PageContainer } from '@/components/Layout';
import { HoloLabel } from '@/components/HoloText';

interface Position {
    ticker: string;
    class: string;
    qty: number;
    entry: number;
    market: number;
    pnl: number;
    ev_pct: number;
}

export default function PortfolioPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);

    // Mock live holdings with expected value (EV)
    const mockHoldings: Position[] = [
        { ticker: 'NBA-LAL-BOS-2605', class: 'HOME_WIN', qty: 450, entry: 0.45, market: 0.62, pnl: 76.50, ev_pct: 12.4 },
        { ticker: 'NFL-KC-BAL-2622', class: 'SPREAD_-3', qty: 2500, entry: 0.20, market: 0.82, pnl: 1550.00, ev_pct: 28.1 },
        { ticker: 'MLB-NYY-BOS-2618', class: 'TOTAL_OVER', qty: 800, entry: 0.50, market: 0.55, pnl: 40.00, ev_pct: 4.5 },
        { ticker: 'UFC-OMAL-DVAL-2635', class: 'DECISION', qty: 150, entry: 0.28, market: 0.41, pnl: 19.50, ev_pct: 8.9 },
        { ticker: 'EPL-MCI-ARS-2630', class: 'DRAW', qty: 300, entry: 0.15, market: 0.12, pnl: -9.00, ev_pct: -2.3 },
        { ticker: 'NBA-DEN-PHX-2612', class: 'AWAY_WIN', qty: 1200, entry: 0.32, market: 0.31, pnl: -12.00, ev_pct: -0.5 },
        { ticker: 'NBA-MIA-CHI-2640', class: 'HOME_WIN', qty: 950, entry: 0.51, market: 0.45, pnl: -57.00, ev_pct: -4.1 },
        { ticker: 'NFL-SF-SEA-2645', class: 'TOTAL_UNDER', qty: 3200, entry: 0.44, market: 0.68, pnl: 768.00, ev_pct: 15.2 },
        { ticker: 'NHL-VGK-COL-2650', class: 'MONEYLINE', qty: 500, entry: 0.33, market: 0.35, pnl: 10.00, ev_pct: 1.1 }
    ];

    const totalExposure = 3120.00;
    const totalEv = mockHoldings.reduce((sum, h) => sum + (h.qty * h.market * (h.ev_pct / 100)), 0);
    const unrealizedPnl = mockHoldings.reduce((sum, h) => sum + h.pnl, 0);

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>PORTFOLIO EXPOSURE</HoloLabel>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
                
                {/* 1. PORTFOLIO METRICS */}
                <div style={{ display: 'flex', gap: '24px', height: '120px', flexShrink: 0 }}>
                    <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>GROSS EXPOSURE</div>
                        <div style={{ fontSize: '32px', color: 'var(--text-platinum)' }}>
                            ${totalExposure.toLocaleString()}
                        </div>
                    </InstitutionalGlass>

                    <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>PORTFOLIO +EV</div>
                        <div style={{ fontSize: '32px', color: 'var(--data-positive)' }}>
                            +${totalEv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </InstitutionalGlass>

                    <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>UNREALIZED PNL</div>
                        <div style={{ fontSize: '32px', color: unrealizedPnl >= 0 ? 'var(--data-positive)' : '#ff3b3b' }}>
                            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                        </div>
                    </InstitutionalGlass>

                    <InstitutionalGlass style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>ACTIVE TICKERS</div>
                        <div style={{ fontSize: '32px', color: 'var(--accent-gold-primary)' }}>
                            {mockHoldings.length}
                        </div>
                    </InstitutionalGlass>
                </div>

                {/* 2. HOLDINGS GRID */}
                <InstitutionalGlass style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid rgba(212,175,55,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--accent-gold-primary)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>LIVE ALLOCATIONS & CALIBRATION</div>
                        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)' }}>SORTED BY +EV</div>
                    </div>
                    
                    {/* Table Header */}
                    <div style={{ display: 'flex', padding: '16px 24px', borderBottom: '1px solid rgba(244,244,245,0.05)', fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                        <div style={{ flex: 2 }}>TICKER</div>
                        <div style={{ flex: 2 }}>SHARE CLASS</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>QTY</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>ENTRY</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>MARKET</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>MODEL EV</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>UNREALIZED</div>
                    </div>

                    {/* Vertical Scroll Area */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {mockHoldings.sort((a,b) => b.ev_pct - a.ev_pct).map((h, i) => (
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
                                <div style={{ flex: 1, textAlign: 'right', color: h.ev_pct >= 0 ? 'var(--data-positive)' : '#ff3b3b' }}>
                                    {h.ev_pct > 0 ? '+' : ''}{h.ev_pct.toFixed(1)}%
                                </div>
                                <div style={{ flex: 1, textAlign: 'right', color: h.pnl >= 0 ? 'var(--data-positive)' : '#ff3b3b' }}>
                                    {h.pnl >= 0 ? '+' : ''}${h.pnl.toFixed(2)}
                                </div>
                            </div>
                        ))}
                        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(244,244,245,0.2)', fontSize: '10px', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                            END OF ALLOCATIONS
                        </div>
                    </div>
                </InstitutionalGlass>
            </div>
        </PageContainer>
    );
}
