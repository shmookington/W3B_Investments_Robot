'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
    timestamp: number;
    odds: number;
    probability: number;
}

interface LineMovementChartProps {
    ticker?: string;
    data?: DataPoint[];
    height?: number;
    color?: string;
}

export function LineMovementChart({ ticker, data: initialData, height = 100, color = 'var(--crt-glow)' }: LineMovementChartProps) {
    const [data, setData] = useState<DataPoint[]>(initialData || []);
    const [loading, setLoading] = useState(!initialData && !!ticker);

    useEffect(() => {
        if (!initialData && ticker) {
            setLoading(true);
            fetch(`/api/engine/proxy?endpoint=api/lines/movement/${ticker}`)
                .then(r => r.json())
                .then(res => {
                    if (res && res.history) {
                        setData(res.history);
                    }
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        } else if (initialData) {
            setData(initialData);
        }
    }, [ticker, initialData]);

    if (loading) {
        return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: '0.8rem' }}>LOADING CHART...</div>;
    }

    if (!data || data.length === 0) {
        return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: '0.8rem' }}>NO MOVEMENT DATA</div>;
    }

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isPositive = data[data.length - 1].probability > data[0].probability;
    const finalColor = isPositive ? '#4cd137' : '#e84118';

    return (
        <div style={{ height, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <XAxis dataKey="timestamp" hide />
                    <YAxis dataKey="probability" hide domain={['auto', 'auto']} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,15,0,0.9)', border: '1px solid var(--crt-glow)', color: 'var(--crt-text)' }}
                        itemStyle={{ color: 'var(--crt-glow)' }}
                        labelFormatter={(label) => formatTime(label as number)}
                        formatter={(val: number | string | undefined) => [val !== undefined ? `${(Number(val) * 100).toFixed(1)}%` : '', 'Win Prob']}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="probability" 
                        stroke={finalColor} 
                        strokeWidth={2} 
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
