'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export function AllocationSlider({ totalCapital }: { totalCapital: number }) {
  const [percentage, setPercentage] = useState(25);
  const deployed = (totalCapital * (percentage / 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
            <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>ALGORITHMIC HEDGE LIMIT</div>
            <div style={{ fontSize: '28px', color: 'var(--text-platinum)', marginTop: '8px' }}>{percentage}% MAX</div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>ALLOWED CAPITAL DEPLOYMENT</div>
            <div style={{ fontSize: '20px', color: 'var(--accent-gold-primary)', marginTop: '8px' }}>${deployed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div style={{ position: 'relative', height: '4px', background: 'rgba(244,244,245,0.1)', borderRadius: '2px', width: '100%' }}>
            {/* The Track */}
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${percentage}%`, background: 'var(--accent-gold-primary)' }} />
            
            {/* The Draggable Thumb */}
            <input 
                type="range"
                min="5" 
                max="100" 
                value={percentage} 
                onChange={(e) => setPercentage(Number(e.target.value))}
                style={{ 
                    position: 'absolute', top: '-10px', left: 0, width: '100%', height: '24px', opacity: 0, cursor: 'pointer', zIndex: 10
                }}
            />
            {/* Visual Thumb representation since input is invisible */}
            <motion.div 
                style={{
                    position: 'absolute', top: '-8px', left: `calc(${percentage}% - 10px)`, width: '20px', height: '20px',
                    borderRadius: '50%', background: '#171719', border: '2px solid var(--accent-gold-primary)', pointerEvents: 'none',
                    boxShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
                }}
            />
      </div>

      <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.3)', fontFamily: 'var(--font-mono)', lineHeight: '1.4' }}>
          By allocating capital, you authorize the W3B ML Engine to automatically hedge up to this dollar threshold simultaneously across live prediction markets. This overrides the Kelly Criterion floor.
      </div>
    </div>
  );
}
