'use client';

import { useState, useMemo } from 'react';
import { HoloPanel } from './HoloPanel';
import styles from './FeeCalculator.module.css';

const FEE_RATE = 0.20; // 20% performance fee
const SCENARIOS = [5, 10, 15, 20, 30, 50]; // Return % scenarios

/**
 * FeeCalculator — Interactive calculator showing performance fee impact.
 * Users input deposit amount and see net returns at various scenarios.
 */
export function FeeCalculator() {
    const [deposit, setDeposit] = useState(10000);

    const rows = useMemo(() => {
        return SCENARIOS.map((returnPct) => {
            const grossReturn = deposit * (returnPct / 100);
            const performanceFee = grossReturn * FEE_RATE;
            const netReturn = grossReturn - performanceFee;
            const netPct = (netReturn / deposit) * 100;
            return {
                returnPct,
                grossReturn,
                performanceFee,
                netReturn,
                netPct,
                netTotal: deposit + netReturn,
            };
        });
    }, [deposit]);

    return (
        <HoloPanel size="md" depth="mid" header="FEE CALCULATOR">
            <div className={styles.controls}>
                <label className={styles.label}>
                    <span className={styles.labelText}>DEPOSIT AMOUNT (USD)</span>
                    <input
                        type="number"
                        className={styles.input}
                        value={deposit}
                        onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))}
                        min={0}
                        step={1000}
                    />
                </label>
                <div className={styles.presets}>
                    {[1000, 5000, 10000, 50000, 100000].map((amt) => (
                        <button
                            key={amt}
                            className={`${styles.presetBtn} ${deposit === amt ? styles.presetBtnActive : ''}`}
                            onClick={() => setDeposit(amt)}
                        >
                            ${amt >= 1000 ? `${amt / 1000}K` : amt}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.feeInfo}>
                <span>0% deposit fee</span>
                <span>0% management fee</span>
                <span>20% performance fee (above HWM)</span>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Fund Return</th>
                            <th>Gross Profit</th>
                            <th>Perf. Fee (20%)</th>
                            <th>Your Net Return</th>
                            <th>Your Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.returnPct}>
                                <td className={styles.returnPct}>+{r.returnPct}%</td>
                                <td>${r.grossReturn.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                <td className={styles.feeCell}>-${r.performanceFee.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                <td className={styles.netCell}>
                                    +${r.netReturn.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                    <span className={styles.netPct}> ({r.netPct.toFixed(1)}%)</span>
                                </td>
                                <td className={styles.totalCell}>${r.netTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className={styles.disclaimer}>
                Performance fees are charged only on profits above the high-water mark.
                If the fund loses money, no fee is charged until previous losses are recovered.
            </p>
        </HoloPanel>
    );
}
