'use client';

import React, { useState, useEffect } from 'react';

// Real circuit breakers mimicking institutional architecture
const INITIAL_BREAKERS = [
  { id: 'VAR_24H', label: '24H VALUE AT RISK (VAR) LIMIT', status: 'HEALTHY' },
  { id: 'API_LAT', label: 'DCM REGULATORY API LATENCY', status: 'HEALTHY' },
  { id: 'CLV_AVG', label: 'ROLLING CLV THRESHOLD DEGRADATION', status: 'HEALTHY' },
  { id: 'LIQ_DPTH', label: 'ORDERBOOK LIQUIDITY DEPTH', status: 'HEALTHY' },
  { id: 'SPRD_WID', label: 'BID/ASK SPREAD ABNORMALITY', status: 'HEALTHY' },
  { id: 'RGM_NOIS', label: 'MARKOV REGIME NOISE RATIO', status: 'HEALTHY' },
  { id: 'HEDGE_FR', label: 'CROSS-PLATFORM HEDGE FRICTION', status: 'HEALTHY' },
  { id: 'CAP_UTIL', label: 'BASE ASSET CAPITAL UTILIZATION', status: 'HEALTHY' }
];

export function CircuitBreakerPanel() {
  const [breakers, setBreakers] = useState(INITIAL_BREAKERS);

  // Simulate occasional minor system warnings
  useEffect(() => {
    const interval = setInterval(() => {
        setBreakers(prev => prev.map(bk => {
            // 5% chance to warn
            const isWarning = Math.random() > 0.95;
            return {
                ...bk,
                status: isWarning ? 'WARNING' : 'HEALTHY'
            };
        }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'HEALTHY') return 'rgba(244,244,245,0.4)'; // Muted Platinum
    if (status === 'WARNING') return 'var(--accent-gold-primary)'; // Gold Pulse
    return '#ff3b3b'; // Hard Red Halt
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', height: '100%' }}>
      {breakers.map((breaker) => (
        <div key={breaker.id} style={{
            border: `1px solid ${breaker.status === 'WARNING' ? 'var(--accent-gold-primary)' : 'rgba(244,244,245,0.05)'}`,
            background: breaker.status === 'WARNING' ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.4s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ color: 'rgba(244,244,245,0.3)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>[{breaker.id}]</div>
                <div style={{ 
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: getStatusColor(breaker.status),
                    boxShadow: breaker.status === 'WARNING' ? '0 0 10px var(--accent-gold-primary)' : 'none'
                }} />
            </div>
            
            <div style={{ 
                color: breaker.status === 'WARNING' ? 'var(--text-platinum)' : 'rgba(244,244,245,0.6)', 
                fontSize: '11px', 
                letterSpacing: '0.1em', 
                fontFamily: 'var(--font-mono)', 
                marginTop: '16px',
                lineHeight: '1.4'
            }}>
                {breaker.label}
            </div>
            
            <div style={{ 
                color: getStatusColor(breaker.status), 
                fontSize: '10px', 
                fontFamily: 'var(--font-mono)', 
                marginTop: '12px' 
            }}>
                {breaker.status}
            </div>
        </div>
      ))}
    </div>
  );
}
