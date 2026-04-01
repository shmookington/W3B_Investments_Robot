'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Log = { id: string; time: string; text: string; type: 'fill' | 'hedging' | 'regime' };

export function ExecutionTape() {
  const [logs, setLogs] = useState<Log[]>([
    { id: '1', time: new Date().toLocaleTimeString(), text: 'INITIALIZING WEBSOCKET CONNECTION...', type: 'regime' }
  ]);

  useEffect(() => {
    let count = 2;
    const actions = [
      { text: (n: number) => `ACQUIRING ${Math.floor(n*500)+100} LAL_YES at $${(n*0.2+0.3).toFixed(2)}... [FILLED]`, type: 'fill' },
      { text: (n: number) => `HEDGING: EXECUTING ${Math.floor(n*300)+50} DEN_NO at $${(n*0.1+0.5).toFixed(2)}... [FILLED]`, type: 'hedging' },
      { text: () => `REGIME SWING DETECTED: CLUTCH_TIME_VARIANCE`, type: 'regime' },
      { text: (n: number) => `ARBITRAGE SCALPED: +$${(n*150+10).toFixed(2)} REALIZED`, type: 'fill' },
      { text: () => `RE-POLLING KALSHI ORDERBOOK (LATENCY: 12ms)`, type: 'regime' },
    ];

    const interval = setInterval(() => {
      const action = actions[Math.floor(Math.random() * actions.length)];
      setLogs((prev) => {
        const newLogs = [{ id: (count++).toString(), time: new Date().toLocaleTimeString(), text: action.text(Math.random()), type: action.type as "fill" | "hedging" | "regime" }, ...prev];
        return newLogs.slice(0, 30); // Keep last 30 logs memory
      });
    }, 1500 + Math.random() * 2000); // Random offset every 1.5 - 3.5s

    return () => clearInterval(interval);
  }, []);

  const getColor = (type: string) => {
    if (type === 'fill') return 'var(--data-positive, #00e5ff)';
    if (type === 'hedging') return 'var(--accent-gold-primary, #d4af37)';
    return 'var(--text-platinum, #f4f4f5)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(212,175,55,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: '12px', color: 'var(--accent-gold-primary)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>MONOLITH TAPE</div>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--data-positive, #00e5ff)', boxShadow: '0 0 8px #00e5ff' }} />
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to bottom, rgba(23,23,25,1), transparent)', zIndex: 10 }} />
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  lineHeight: '1.4'
                }}
              >
                <div style={{ color: 'rgba(244,244,245,0.3)', whiteSpace: 'nowrap' }}>[{log.time}]</div>
                <div style={{ color: getColor(log.type) }}>{log.text}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to top, rgba(23,23,25,1) 20%, transparent)', zIndex: 10 }} />
      </div>
    </div>
  );
}
