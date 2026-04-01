'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const generateAnomaly = () => {
    const events = ['EVT-LAL-BOS', 'EVT-KC-BAL', 'EVT-VGK-COL', 'EVT-MCI-ARS'];
    const codes = ['ERR_RECONCILE', 'WARN_LATENCY', 'ERR_PROVIDER_DROP'];
    
    return {
        id: Math.random().toString(),
        timestamp: new Date().toISOString().substring(11, 23),
        code: codes[Math.floor(Math.random() * codes.length)],
        event: events[Math.floor(Math.random() * events.length)],
        msg: 'Cross-source verification failed. Execution suspended.'
    };
};

export function AnomalousDataLog() {
    const [logs, setLogs] = useState(() => Array.from({ length: 6 }, generateAnomaly));

    useEffect(() => {
        // High frequency polling simulator for errors (rarely populates)
        const interval = setInterval(() => {
            if (Math.random() > 0.85) {
                setLogs(prev => {
                    const next = [generateAnomaly(), ...prev];
                    if (next.length > 20) next.pop(); // keep tail light
                    return next;
                });
            }
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ 
            height: '100%', 
            width: '100%', 
            background: 'rgba(10,10,12,0.6)', 
            border: '1px solid rgba(255, 59, 59, 0.2)', 
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ 
                padding: '12px 16px', borderBottom: '1px solid rgba(255, 59, 59, 0.2)',
                background: 'rgba(255, 59, 59, 0.05)', display: 'flex', justifyContent: 'space-between'
            }}>
                <div style={{ color: '#ff3b3b', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em' }}>
                    ANOMALOUS DATA / DROPPED PACKETS
                </div>
                <div style={{ color: '#ff3b3b', fontSize: '10px', fontFamily: 'var(--font-mono)', animation: 'pulse 2s infinite' }}>
                    [ TAILING ]
                </div>
            </div>

            <div style={{ flex: 1, padding: '16px', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <AnimatePresence initial={false}>
                    {logs.map((log) => (
                        <motion.div 
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{ 
                                fontFamily: 'var(--font-mono)', fontSize: '11px', display: 'flex', gap: '12px',
                                color: log.code.startsWith('ERR') ? '#ff3b3b' : 'var(--accent-gold-primary)'
                            }}
                        >
                            <span style={{ opacity: 0.5 }}>[{log.timestamp}]</span>
                            <span style={{ minWidth: '120px' }}>{log.code}</span>
                            <span style={{ color: 'rgba(244,244,245,0.7)' }}>{log.event}</span>
                            <span style={{ color: 'rgba(244,244,245,0.4)' }}>{log.msg}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
