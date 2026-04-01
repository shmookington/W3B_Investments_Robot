'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_MODELS = [
    { id: 'ELO', name: 'DYNAMIC ELO RATING', weight: 65 },
    { id: 'MRKV', name: 'MARKOV CHAIN REGIMES', weight: 20 },
    { id: 'FATG', name: 'SCHEDULE FATIGUE INDEX', weight: 10 },
    { id: 'POIS', name: 'POISSON GOAL/POINT', weight: 5 }
];

export function SubModelLeaderboard() {
    const [models, setModels] = useState(BASE_MODELS);

    useEffect(() => {
        // Simulating the backend decaying models based on performance variance
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                setModels(prev => {
                    let next = [...prev];
                    const idx1 = Math.floor(Math.random() * next.length);
                    const idx2 = Math.floor(Math.random() * next.length);
                    
                    if (idx1 !== idx2) {
                        const shift = Math.floor(Math.random() * 3) + 1; // 1 to 3 point shift
                        if (next[idx2].weight - shift > 1) {
                            next[idx2].weight -= shift;
                            next[idx1].weight += shift;
                        }
                    }
                    
                    // Re-sort to show the physical leaderboard shifting layout smoothly
                    return next.sort((a, b) => b.weight - a.weight);
                });
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(244,244,245,0.05)', fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                <div>ENSEMBLE ROUTINE</div>
                <div>AUTONOMIC WEIGHT</div>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
                <AnimatePresence>
                    {models.map((model, index) => (
                        <motion.div
                            key={model.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px',
                                background: index === 0 ? 'rgba(212, 175, 55, 0.05)' : 'rgba(244,244,245,0.02)',
                                border: index === 0 ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(244,244,245,0.05)',
                                marginBottom: '8px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                    width: '12px', height: '12px', borderRadius: '50%', 
                                    background: index === 0 ? 'var(--accent-gold-primary)' : 'rgba(244,244,245,0.2)' 
                                }} />
                                <div>
                                    <div style={{ color: index === 0 ? 'var(--accent-gold-primary)' : 'var(--text-platinum)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                                        {model.name}
                                    </div>
                                    <div style={{ color: 'rgba(244,244,245,0.3)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginTop: '4px' }}>
                                        [{model.id}_ENGINE]
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ color: index === 0 ? 'var(--accent-gold-primary)' : 'var(--text-platinum)', fontSize: '16px', fontFamily: 'var(--font-mono)' }}>
                                {model.weight}%
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
