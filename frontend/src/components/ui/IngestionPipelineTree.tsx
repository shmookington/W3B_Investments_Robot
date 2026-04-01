'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NODES = [
  { id: 'SRC', label: 'API PROVIDERS', sub: 'ESPN / BAL / RAPID' },
  { id: 'REC', label: 'CROSS-RECONCILER', sub: '/api/data/health' },
  { id: 'DB', label: 'BLOCK DATABASE', sub: 'SUPABASE STORAGE' },
  { id: 'ENG', label: 'PREDICTION ENGINE', sub: 'MONOLITH 2.0' },
  { id: 'EXEC', label: 'KALSHI WEBSOCKET', sub: 'WSS://ORDERBOOK' }
];

export function IngestionPipelineTree() {
  const [activeNode, setActiveNode] = useState(0);

  // Simulate data pulsing through the pipeline left to right
  useEffect(() => {
    const pulse = setInterval(() => {
        setActiveNode(prev => (prev + 1) % NODES.length);
    }, 800); // Pulse moves exactly every 800ms
    return () => clearInterval(pulse);
  }, []);

  return (
    <div style={{ 
        width: '100%', 
        height: '100%',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 40px',
        position: 'relative'
    }}>
      
      {/* Background connector line */}
      <div style={{ 
          position: 'absolute', top: '50%', left: '80px', right: '80px', height: '2px', 
          background: 'rgba(244,244,245,0.05)', transform: 'translateY(-50%)', zIndex: 0 
      }} />

      {NODES.map((node, i) => {
        const isActive = activeNode === i;
        const isPast = activeNode > i;
        
        return (
            <div key={node.id} style={{ 
                position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px'
            }}>
                <div style={{ 
                    color: isActive ? 'var(--data-positive)' : 'rgba(244,244,245,0.4)', 
                    fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                    marginBottom: '16px', transition: 'color 0.4s'
                }}>
                    {node.label}
                </div>
                
                {/* Visual Node Mechanism */}
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: isActive ? 'rgba(0, 229, 255, 0.1)' : 'rgba(23, 23, 25, 1)',
                    border: `1px solid ${isActive ? 'var(--data-positive)' : (isPast ? 'var(--accent-gold-primary)' : 'rgba(244,244,245,0.2)')}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? '0 0 20px var(--data-positive)' : 'none',
                    transition: 'all 0.4s ease'
                }}>
                    <div style={{ 
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: isActive ? 'var(--data-positive)' : (isPast ? 'var(--accent-gold-primary)' : 'rgba(244,244,245,0.2)')
                    }} />
                </div>
                
                <div style={{ 
                    color: 'rgba(244,244,245,0.2)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
                    marginTop: '16px'
                }}>
                    {node.sub}
                </div>
            </div>
        );
      })}
    </div>
  );
}
