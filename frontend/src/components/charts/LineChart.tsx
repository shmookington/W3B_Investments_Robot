'use client';

import {
    ResponsiveContainer,
    LineChart as RechartsLine,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { CRT_CHART_COLORS, CRT_PALETTE, CRT_AXIS_STYLE, CRT_TOOLTIP_STYLE, CRT_GRID_STYLE } from './chartTheme';

interface LineChartProps {
    data: Record<string, unknown>[];
    xKey: string;
    yKeys: string[];
    height?: number;
    colors?: string[];
}

export function LineChart({ data, xKey, yKeys, height = 300, colors }: LineChartProps) {
    const palette = colors || [...CRT_PALETTE];

    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsLine data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...CRT_GRID_STYLE} />
                <XAxis dataKey={xKey} {...CRT_AXIS_STYLE} />
                <YAxis {...CRT_AXIS_STYLE} />
                <Tooltip {...CRT_TOOLTIP_STYLE} />
                {yKeys.map((key, i) => (
                    <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={palette[i % palette.length]}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3, fill: palette[i % palette.length], stroke: 'none' }}
                    />
                ))}
            </RechartsLine>
        </ResponsiveContainer>
    );
}
