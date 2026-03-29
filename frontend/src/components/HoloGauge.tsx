'use client';

/* ─── HoloGauge — Holographic Circular SVG Gauge ─── */
interface HoloGaugeProps {
    /** Current value (0–100) */
    value: number;
    /** Label shown below the value */
    label?: string;
    /** Size in px */
    size?: number;
    /** Thickness of the arc stroke */
    thickness?: number;
}

function getGaugeColor(value: number): string {
    if (value >= 70) return '#00e676';    // Green — healthy
    if (value >= 40) return '#ffb300';    // Amber — warning
    return '#ff3b3b';                     // Red — danger
}

function getGaugeGlow(value: number): string {
    if (value >= 70) return 'drop-shadow(0 0 6px rgba(0, 230, 118, 0.4))';
    if (value >= 40) return 'drop-shadow(0 0 6px rgba(255, 179, 0, 0.4))';
    return 'drop-shadow(0 0 6px rgba(255, 59, 59, 0.4))';
}

export function HoloGauge({
    value,
    label,
    size = 120,
    thickness = 6,
}: HoloGaugeProps) {
    const clamped = Math.max(0, Math.min(100, value));
    const radius = (size - thickness * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const arcLength = (clamped / 100) * circumference * 0.75; // 270° arc
    const dashOffset = circumference * 0.75 - arcLength;
    const color = getGaugeColor(clamped);
    const glow = getGaugeGlow(clamped);

    // Tick marks (every 10%)
    const ticks = Array.from({ length: 11 }, (_, i) => {
        const angle = -225 + (i / 10) * 270; // from -225° to 45° (270° sweep)
        const rad = (angle * Math.PI) / 180;
        const outerR = radius + thickness + 2;
        const innerR = radius + thickness + 6;
        const cx = size / 2;
        const cy = size / 2;
        return {
            x1: cx + outerR * Math.cos(rad),
            y1: cy + outerR * Math.sin(rad),
            x2: cx + innerR * Math.cos(rad),
            y2: cy + innerR * Math.sin(rad),
        };
    });

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ filter: glow }}
            >
                {/* Background arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(0, 240, 255, 0.08)"
                    strokeWidth={thickness}
                    strokeDasharray={`${circumference * 0.75} ${circumference}`}
                    strokeDashoffset={0}
                    transform={`rotate(-225 ${size / 2} ${size / 2})`}
                    strokeLinecap="round"
                />

                {/* Grid pattern behind arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius - thickness}
                    fill="none"
                    stroke="rgba(0, 240, 255, 0.03)"
                    strokeWidth={radius - thickness * 2}
                />

                {/* Value arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={thickness}
                    strokeDasharray={`${circumference * 0.75} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(-225 ${size / 2} ${size / 2})`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.6s ease' }}
                />

                {/* Tick marks */}
                {ticks.map((tick, i) => (
                    <line
                        key={i}
                        x1={tick.x1}
                        y1={tick.y1}
                        x2={tick.x2}
                        y2={tick.y2}
                        stroke="rgba(0, 240, 255, 0.2)"
                        strokeWidth={1}
                    />
                ))}

                {/* Outer ring (slow rotation) */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius + thickness + 8}
                    fill="none"
                    stroke="rgba(0, 240, 255, 0.06)"
                    strokeWidth={0.5}
                    strokeDasharray="4 8"
                    style={{ animation: 'gaugeRotate 60s linear infinite' }}
                    transform={`rotate(0 ${size / 2} ${size / 2})`}
                />
            </svg>

            {/* Center readout */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingTop: size * 0.05,
                }}
            >
                <span
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: size * 0.22,
                        fontWeight: 'var(--weight-bold)',
                        color,
                        textShadow: `0 0 8px ${color}40`,
                        lineHeight: 1,
                        transition: 'color 0.6s ease',
                    }}
                >
                    {clamped}
                </span>
                {label && (
                    <span
                        style={{
                            fontFamily: 'var(--font-hud)',
                            fontSize: size * 0.07,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: 'var(--color-text-secondary)',
                            marginTop: 2,
                        }}
                    >
                        {label}
                    </span>
                )}
            </div>

            {/* Rotation keyframe */}
            <style>{`
        @keyframes gaugeRotate {
          0% { transform: rotate(0deg); transform-origin: ${size / 2}px ${size / 2}px; }
          100% { transform: rotate(360deg); transform-origin: ${size / 2}px ${size / 2}px; }
        }
      `}</style>
        </div>
    );
}
