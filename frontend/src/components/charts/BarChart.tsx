'use client';

import {
    ResponsiveContainer,
    BarChart as RechartsBar,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { CRT_CHART_COLORS, CRT_PALETTE, CRT_AXIS_STYLE, CRT_TOOLTIP_STYLE, CRT_GRID_STYLE } from './chartTheme';

interface BarChartProps {
    data: Record<string, unknown>[];
    xKey: string;
    yKeys: string[];
    height?: number;
    colors?: string[];
    stacked?: boolean;
}

export function BarChart({ data, xKey, yKeys, height = 300, colors, stacked }: BarChartProps) {
    const palette = colors || [...CRT_PALETTE];

    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsBar data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...CRT_GRID_STYLE} />
                <XAxis dataKey={xKey} {...CRT_AXIS_STYLE} />
                <YAxis {...CRT_AXIS_STYLE} />
                <Tooltip {...CRT_TOOLTIP_STYLE} />
                {yKeys.map((key, i) => (
                    <Bar
                        key={key}
                        dataKey={key}
                        fill={palette[i % palette.length]}
                        fillOpacity={0.7}
                        stackId={stacked ? 'stack' : undefined}
                    />
                ))}
            </RechartsBar>
        </ResponsiveContainer>
    );
}
