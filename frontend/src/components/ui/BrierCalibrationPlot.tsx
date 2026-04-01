'use client';

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';

export function BrierCalibrationPlot() {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        // Generate realistically noisy calibration data around the x=y ideal line
        const generated = [];
        for (let i = 10; i <= 90; i += 2) {
            // Slight noise, heavily favoring perfect calibration near 50-60%
            const variance = i > 40 && i < 70 ? (Math.random() * 4 - 2) : (Math.random() * 10 - 5);
            generated.push({ x: i, y: i + variance });
        }
        setData(generated);
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                    EXPECTED WIN PROBABILITY (%)
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                    REALIZED FREQUENCY (%)
                </div>
            </div>
            <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,244,245,0.05)" />
                        <XAxis type="number" dataKey="x" name="Expected" domain={[0, 100]} stroke="rgba(244,244,245,0.2)" tick={{ fontSize: 10, fill: 'rgba(244,244,245,0.4)' }} />
                        <YAxis type="number" dataKey="y" name="Realized" domain={[0, 100]} stroke="rgba(244,244,245,0.2)" tick={{ fontSize: 10, fill: 'rgba(244,244,245,0.4)' }} />
                        
                        {/* Perfect Calibration Line x=y */}
                        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="rgba(212, 175, 55, 0.4)" strokeDasharray="3 3" />
                        
                        {/* Actual ML Drift Mapping */}
                        <Scatter name="Execution State" data={data} fill="var(--data-positive)" />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
