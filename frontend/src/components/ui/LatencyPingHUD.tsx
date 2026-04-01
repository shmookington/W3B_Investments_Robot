'use client';

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

export function LatencyPingHUD({ endpoint, label, baseMs }: { endpoint: string, label: string, baseMs: number }) {
  const [data, setData] = useState(() => Array.from({ length: 30 }, (_, i) => ({ t: i, ping: baseMs + Math.random() * 10 })));

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const next = [...prev, { t: prev[prev.length - 1].t + 1, ping: baseMs + Math.random() * 20 }];
        next.shift();
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [baseMs]);

  const currentPing = data[data.length - 1].ping;
  const isHealthy = currentPing < 200;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: 'rgba(244,244,245,0.4)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            {endpoint}
          </div>
          <div style={{ color: 'var(--text-platinum)', fontSize: '12px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginTop: '4px' }}>
            {label}
          </div>
        </div>
        <div style={{ 
          color: isHealthy ? 'var(--data-positive)' : '#ff3b3b', 
          fontSize: '18px', 
          fontFamily: 'var(--font-mono)',
          textShadow: isHealthy ? '0 0 10px rgba(0,229,255,0.4)' : '0 0 10px rgba(255,59,59,0.8)'
        }}>
          {currentPing.toFixed(0)} ms
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: '60px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <YAxis domain={[0, 300]} hide={true} />
            <Area 
              type="monotone" 
              dataKey="ping" 
              stroke={isHealthy ? 'var(--data-positive)' : '#ff3b3b'} 
              fill={isHealthy ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 59, 59, 0.2)'} 
              isAnimationActive={false}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
