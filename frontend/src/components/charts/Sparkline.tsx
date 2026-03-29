'use client';

import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { CRT_CHART_COLORS } from './chartTheme';

interface SparklineProps {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
}

export function Sparkline({ data, color = CRT_CHART_COLORS.cyan, width = 80, height = 24 }: SparklineProps) {
    const chartData = data.map((v, i) => ({ i, v }));

    return (
        <ResponsiveContainer width={width} height={height}>
            <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Line
                    type="monotone"
                    dataKey="v"
                    stroke={color}
                    strokeWidth={1}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
