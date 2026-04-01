'use client';

import React from 'react';

interface RibbonProps {
    active: 'VAULT' | 'MARKETS' | 'AUDIT';
    onChange: (t: 'VAULT' | 'MARKETS' | 'AUDIT') => void;
}

export function MobilePortfolioRibbon({ active, onChange }: RibbonProps) {
    return (
        <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '100px', // Covers the bottom 15% easily, handles iOS Home Bar
            background: 'rgba(10, 10, 12, 0.85)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(244,244,245,0.05)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            paddingBottom: 'env(safe-area-inset-bottom)', // PWA iOS Home Bar avoidance
            zIndex: 999999
        }}>
            {['VAULT', 'MARKETS', 'AUDIT'].map((t) => {
                const isActive = active === t;
                return (
                    <button
                        key={t}
                        onClick={() => onChange(t as any)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: isActive ? 'var(--accent-gold-primary)' : 'rgba(244,244,245,0.4)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            letterSpacing: '0.1em',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {/* Dot indicator */}
                        <div style={{ 
                            width: '4px', height: '4px', borderRadius: '50%', 
                            background: isActive ? 'var(--accent-gold-primary)' : 'transparent',
                            transition: 'background 0.3s'
                        }} />
                        {t}
                    </button>
                );
            })}
        </div>
    );
}
