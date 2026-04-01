'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ChartProps {
  data: any[];
}

export function PerformanceChartAdvanced({ data }: ChartProps) {
  // A gradient to make it look incredibly institutional
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '250px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-gold-primary, #d4af37)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--accent-gold-primary, #d4af37)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,244,245,0.05)" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'rgba(244,244,245,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            tick={{ fill: 'rgba(244,244,245,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 25, 0.9)', border: '1px solid var(--accent-gold-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
            itemStyle={{ color: 'var(--text-platinum)' }}
          />
          <Area 
            type="monotone" 
            dataKey="equity" 
            stroke="var(--accent-gold-primary, #d4af37)" 
            fillOpacity={1} 
            fill="url(#colorYield)" 
            isAnimationActive={true}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
