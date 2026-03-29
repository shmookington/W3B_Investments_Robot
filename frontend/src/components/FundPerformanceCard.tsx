'use client';

import { HoloPanel } from './HoloPanel';
import { StatCounter } from './StatCounter';
import styles from './FundPerformanceCard.module.css';

interface FundPerformanceCardProps {
    totalReturn: number;
    monthlyReturn: number;
    sharpeRatio: number;
    winRate: number;
    /** Sparkline data for the equity curve mini-chart */
    sparkline?: number[];
}

/**
 * FundPerformanceCard — Summary card showing key fund metrics.
 * Used on the landing page, dashboard, and performance page.
 */
export function FundPerformanceCard({
    totalReturn,
    monthlyReturn,
    sharpeRatio,
    winRate,
    sparkline,
}: FundPerformanceCardProps) {
    return (
        <HoloPanel size="md" depth="foreground" glow="cyan" header="FUND PERFORMANCE">
            <div className={styles.grid}>
                <StatCounter
                    label="Total Return"
                    value={totalReturn}
                    suffix="%"
                    decimals={1}
                    sparkline={sparkline}
                />
                <StatCounter
                    label="Monthly Return"
                    value={monthlyReturn}
                    suffix="%"
                    decimals={2}
                />
                <StatCounter
                    label="Sharpe Ratio"
                    value={sharpeRatio}
                    decimals={2}
                />
                <StatCounter
                    label="Win Rate"
                    value={winRate}
                    suffix="%"
                    decimals={1}
                />
            </div>
        </HoloPanel>
    );
}
