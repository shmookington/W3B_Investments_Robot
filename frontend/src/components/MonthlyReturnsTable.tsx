'use client';

import { useMemo, useState } from 'react';
import { HoloPanel } from './HoloPanel';
import styles from './MonthlyReturnsTable.module.css';

interface MonthlyReturnsTableProps {
    /**
     * Map of year → month returns (0-indexed, Jan=0).
     * e.g. { 2024: [1.2, -0.5, 3.1, ...], 2025: [...] }
     */
    data: Record<number, (number | null)[]>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * MonthlyReturnsTable — standard hedge fund format monthly returns grid.
 * Green for positive, red for negative, hover shows exact values.
 */
export function MonthlyReturnsTable({ data }: MonthlyReturnsTableProps) {
    const [hoverCell, setHoverCell] = useState<{ year: number; month: number } | null>(null);

    const years = useMemo(() => Object.keys(data).map(Number).sort((a, b) => b - a), [data]);

    const annualReturn = (returns: (number | null)[]): number | null => {
        const valid = returns.filter((r): r is number => r !== null);
        if (valid.length === 0) return null;
        // Compound monthly returns
        const compound = valid.reduce((acc, r) => acc * (1 + r / 100), 1);
        return (compound - 1) * 100;
    };

    const cellColor = (val: number | null) => {
        if (val === null) return {};
        if (val > 0) return { backgroundColor: `rgba(40, 202, 65, ${Math.min(Math.abs(val) / 10, 0.3)})`, color: '#28ca41' };
        if (val < 0) return { backgroundColor: `rgba(255, 77, 106, ${Math.min(Math.abs(val) / 10, 0.3)})`, color: '#ff4d6a' };
        return { color: 'rgba(224, 224, 232, 0.4)' };
    };

    return (
        <HoloPanel size="lg" depth="mid" header="MONTHLY RETURNS (%)">
            <div className={styles.wrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.yearHeader}>Year</th>
                            {MONTHS.map((m) => (
                                <th key={m} className={styles.monthHeader}>{m}</th>
                            ))}
                            <th className={styles.annualHeader}>Annual</th>
                        </tr>
                    </thead>
                    <tbody>
                        {years.map((year) => {
                            const returns = data[year];
                            const annual = annualReturn(returns);
                            return (
                                <tr key={year}>
                                    <td className={styles.yearCell}>{year}</td>
                                    {MONTHS.map((_, mi) => {
                                        const val = returns[mi] ?? null;
                                        const isHovered = hoverCell?.year === year && hoverCell?.month === mi;
                                        return (
                                            <td
                                                key={mi}
                                                className={`${styles.cell} ${isHovered ? styles.cellHover : ''}`}
                                                style={cellColor(val)}
                                                onMouseEnter={() => setHoverCell({ year, month: mi })}
                                                onMouseLeave={() => setHoverCell(null)}
                                            >
                                                {val !== null ? val.toFixed(1) : '—'}
                                            </td>
                                        );
                                    })}
                                    <td className={styles.annualCell} style={cellColor(annual)}>
                                        {annual !== null ? annual.toFixed(1) : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </HoloPanel>
    );
}
