'use client';
import styles from './Slider.module.css';

interface SliderProps { value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; label?: string; showValue?: boolean; }

export function Slider({ value, min = 0, max = 100, step = 1, onChange, label, showValue }: SliderProps) {
    return (
        <div className={styles.wrapper}>
            {label && <span className={styles.label}>{label}{showValue && `: ${value}`}</span>}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={styles.slider}
                style={{ '--pct': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
            />
        </div>
    );
}
