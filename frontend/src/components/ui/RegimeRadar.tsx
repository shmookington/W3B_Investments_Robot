'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';

export function RegimeRadar() {
  const [data, setData] = useState([
    { subject: 'MOMENTUM', A: 80, fullMark: 100 },
    { subject: 'FATIGUE', A: 30, fullMark: 100 },
    { subject: 'VARIANCE', A: 50, fullMark: 100 },
    { subject: 'SPREAD TIGHTNESS', A: 90, fullMark: 100 },
    { subject: 'VOLATILITY', A: 65, fullMark: 100 }
  ]);

  useEffect(() => {
    // Simulate live markov regime shifts
    const interval = setInterval(() => {
      setData([
        { subject: 'MOMENTUM', A: 40 + Math.random() * 50, fullMark: 100 },
        { subject: 'FATIGUE', A: 10 + Math.random() * 40, fullMark: 100 },
        { subject: 'VARIANCE', A: 30 + Math.random() * 60, fullMark: 100 },
        { subject: 'SPREAD', A: 70 + Math.random() * 30, fullMark: 100 },
        { subject: 'VOLATILITY', A: 40 + Math.random() * 50, fullMark: 100 }
      ]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(244,244,245,0.1)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'rgba(244,244,245,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
          />
          <Radar 
            name="Markov Engine" 
            dataKey="A" 
            stroke="var(--accent-gold-primary, #d4af37)" 
            fill="var(--accent-gold-primary, #d4af37)" 
            fillOpacity={0.2} 
            animationDuration={800}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 25, 0.9)', border: '1px solid var(--accent-gold-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
            itemStyle={{ color: 'var(--text-platinum)' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
