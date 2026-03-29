'use client';

import {
    ResponsiveContainer,
    PieChart as RechartsPie,
    Pie,
    Cell,
    Tooltip,
} from 'recharts';
import { CRT_PALETTE, CRT_TOOLTIP_STYLE } from './chartTheme';

interface PieChartProps {
    data: { name: string; value: number }[];
    height?: number;
    colors?: string[];
    innerRadius?: number;
}

export function PieChart({ data, height = 260, colors, innerRadius = 50 }: PieChartProps) {
    const palette = colors || [...CRT_PALETTE];

    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsPie>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={innerRadius + 30}
                    dataKey="value"
                    stroke="none"
                    paddingAngle={2}
                >
                    {data.map((_, i) => (
                        <Cell key={i} fill={palette[i % palette.length]} />
                    ))}
                </Pie>
                <Tooltip {...CRT_TOOLTIP_STYLE} />
            </RechartsPie>
        </ResponsiveContainer>
    );
}
