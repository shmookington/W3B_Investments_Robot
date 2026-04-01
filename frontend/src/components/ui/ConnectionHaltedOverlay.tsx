'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEngineStore } from '@/store/engineStore';

export function ConnectionHaltedOverlay() {
    const isConnected = useEngineStore((state) => state.isConnected);
    const setConnectionStatus = useEngineStore((state) => state.setConnectionStatus);

    useEffect(() => {
        // // SIMULATED ORACLE DISCONNECTS (DISABLED)
        // const interval = setInterval(() => {
        //     if (Math.random() > 0.8) {
        //         setConnectionStatus(false);
        //         
        //         // Simulate reconnection sequence
        //         setTimeout(() => {
        //             setConnectionStatus(true);
        //         }, Math.random() * 3000 + 3000);
        //     }
        // }, 15000);
        // 
        // return () => clearInterval(interval);
    }, [setConnectionStatus]);

    return (
        <AnimatePresence>
            {!isConnected && (
                <motion.div 
                    initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                    animate={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.85)' }}
                    exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)', transition: { delay: 0.5 } }}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 99999, // Absolute highest layer
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        style={{
                            background: '#0a0a0c',
                            border: '1px solid #ff3b3b',
                            padding: '48px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '24px',
                            boxShadow: '0 20px 60px rgba(255, 59, 59, 0.2)'
                        }}
                    >
                        <div style={{ color: '#ff3b3b', fontSize: '32px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                            [ FATAL: ORACLE DISCONNECTED ]
                        </div>
                        
                        <div style={{ color: 'rgba(244,244,245,0.6)', fontSize: '14px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textAlign: 'center', maxWidth: '400px', lineHeight: '1.6' }}>
                            Connection to the backend data queue has been lost. The execution terminal is fully locked to prevent stale execution overrides.
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff3b3b', animation: 'pulse 1s infinite' }} />
                            <div style={{ color: '#ff3b3b', fontSize: '12px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                                RE-ESTABLISHING SECURE PIPELINE...
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
