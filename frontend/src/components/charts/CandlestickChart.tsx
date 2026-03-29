'use client';

import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, type IChartApi } from 'lightweight-charts';
import { CRT_CHART_COLORS } from './chartTheme';

interface CandleData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface CandlestickChartProps {
    data: CandleData[];
    height?: number;
}

export function CandlestickChart({ data, height = 350 }: CandlestickChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            height,
            layout: {
                background: { color: 'transparent' },
                textColor: CRT_CHART_COLORS.dim,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
            },
            grid: {
                vertLines: { color: CRT_CHART_COLORS.gridLine },
                horzLines: { color: CRT_CHART_COLORS.gridLine },
            },
            crosshair: {
                vertLine: { color: CRT_CHART_COLORS.cyan, width: 1, style: 2 },
                horzLine: { color: CRT_CHART_COLORS.cyan, width: 1, style: 2 },
            },
            rightPriceScale: { borderColor: CRT_CHART_COLORS.gridLine },
            timeScale: { borderColor: CRT_CHART_COLORS.gridLine },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: CRT_CHART_COLORS.green,
            downColor: CRT_CHART_COLORS.red,
            borderUpColor: CRT_CHART_COLORS.green,
            borderDownColor: CRT_CHART_COLORS.red,
            wickUpColor: CRT_CHART_COLORS.green,
            wickDownColor: CRT_CHART_COLORS.red,
        });

        series.setData(data as Parameters<typeof series.setData>[0]);
        chart.timeScale().fitContent();
        chartRef.current = chart;

        const handleResize = () => {
            if (containerRef.current) {
                chart.applyOptions({ width: containerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, height]);

    return <div ref={containerRef} style={{ width: '100%' }} />;
}
