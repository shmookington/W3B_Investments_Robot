'use client';

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export function EmergencyKillSwitch() {
  const [armed, setArmed] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [0, 200],
    ['rgba(244,244,245,0.05)', 'rgba(255, 59, 59, 0.4)']
  );
  const color = useTransform(x, [0, 200], ['#f4f4f5', '#ff3b3b']);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x >= 190) {
      setTriggered(true);
      // Actual halt execution boundary
    } else {
      x.stop();
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 20 });
    }
  };

  if (triggered) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ 
          fontSize: '24px', color: '#ff3b3b', fontFamily: 'var(--font-mono)', 
          letterSpacing: '0.2em', textShadow: '0 0 20px rgba(255,59,59,0.5)',
          animation: 'pulse 1.5s infinite' 
        }}>
          SYSTEM HALTED
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.5)', marginTop: '8px', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
          ALL EXECUTIONS SUSPENDED. MANUAL OVERRIDE REQUIRED.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#ff3b3b', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
            EMERGENCY LIQUIDATION OVERRIDE
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', lineHeight: '1.4' }}>
            Bypass all ML regime outputs and force-hedge current exposure across the entire LP allocation back into base currency.
          </div>
        </div>
        
        {/* Arming Checkbox */}
        <div 
          onClick={() => setArmed(!armed)}
          style={{
            border: `1px solid ${armed ? '#ff3b3b' : 'rgba(244,244,245,0.2)'}`,
            background: armed ? 'rgba(255, 59, 59, 0.1)' : 'transparent',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            color: armed ? '#ff3b3b' : 'rgba(244,244,245,0.5)',
            transition: 'all 0.3s'
          }}
        >
          {armed ? '[ ARMED ]' : '[ DISARMED ]'}
        </div>
      </div>

      {/* Slide to Halt */}
      <div style={{ 
        position: 'relative', 
        height: '60px', 
        borderRadius: '30px', 
        overflow: 'hidden',
        background: 'rgba(23, 23, 25, 0.8)',
        border: '1px solid rgba(244,244,245,0.1)',
        opacity: armed ? 1 : 0.3,
        pointerEvents: armed ? 'auto' : 'none',
        marginTop: 'auto'
      }}>
        <motion.div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, background, pointerEvents: 'none' }} />
        <div style={{ 
          position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', fontSize: '12px', color: 'rgba(244,244,245,0.3)',
          letterSpacing: '0.2em', fontFamily: 'var(--font-mono)', pointerEvents: 'none'
        }}>
          SLIDE TO HALT TRADING ▸▸
        </div>
        
        <motion.div 
          drag={armed ? "x" : false}
          dragConstraints={{ left: 0, right: 260 }} // Assume width context roughly ~320px 
          onDragEnd={handleDragEnd}
          style={{ x }}
          animate={!armed ? { x: 0 } : {}}
          whileHover={armed ? { scale: 1.05 } : {}}
          whileTap={armed ? { scale: 0.95 } : {}}
        >
            <div style={{
                position: 'absolute', top: '4px', left: '4px', width: '50px', height: '50px', borderRadius: '25px',
                background: '#ff3b3b', cursor: armed ? 'grab' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="M12 5l7 7-7 7"></path>
                </svg>
            </div>
        </motion.div>
      </div>
    </div>
  );
}
