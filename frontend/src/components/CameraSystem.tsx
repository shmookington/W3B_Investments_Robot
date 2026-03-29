'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springSmooth, springHeavy } from '@/lib/motion';
import styles from './CameraSystem.module.css';

/* ═══════════════════════════════════════════════════
   VIEW PRESETS
   ═══════════════════════════════════════════════════ */

export type ViewPreset = 'ops' | 'risk' | 'alpha';

interface PanelLayout {
    id: string;
    col: string; // grid-column
    row: string; // grid-row
    visible: boolean;
}

/** Each preset defines which panels are visible and where */
const VIEW_LAYOUTS: Record<ViewPreset, PanelLayout[]> = {
    ops: [
        { id: 'equity-chart', col: '1 / 3', row: '1 / 2', visible: true },
        { id: 'positions', col: '3 / 4', row: '1 / 2', visible: true },
        { id: 'executions', col: '1 / 2', row: '2 / 3', visible: true },
        { id: 'order-book', col: '2 / 3', row: '2 / 3', visible: true },
        { id: 'system-health', col: '3 / 4', row: '2 / 3', visible: true },
        { id: 'risk-matrix', col: '1 / 4', row: '1 / 3', visible: false },
        { id: 'alpha-signals', col: '1 / 4', row: '1 / 3', visible: false },
    ],
    risk: [
        { id: 'risk-matrix', col: '1 / 3', row: '1 / 3', visible: true },
        { id: 'positions', col: '3 / 4', row: '1 / 2', visible: true },
        { id: 'equity-chart', col: '3 / 4', row: '2 / 3', visible: true },
        { id: 'executions', col: '1 / 4', row: '1 / 3', visible: false },
        { id: 'order-book', col: '1 / 4', row: '1 / 3', visible: false },
        { id: 'system-health', col: '1 / 4', row: '1 / 3', visible: false },
        { id: 'alpha-signals', col: '1 / 4', row: '1 / 3', visible: false },
    ],
    alpha: [
        { id: 'alpha-signals', col: '1 / 3', row: '1 / 2', visible: true },
        { id: 'equity-chart', col: '3 / 4', row: '1 / 2', visible: true },
        { id: 'executions', col: '1 / 2', row: '2 / 3', visible: true },
        { id: 'positions', col: '2 / 4', row: '2 / 3', visible: true },
        { id: 'risk-matrix', col: '1 / 4', row: '1 / 3', visible: false },
        { id: 'order-book', col: '1 / 4', row: '1 / 3', visible: false },
        { id: 'system-health', col: '1 / 4', row: '1 / 3', visible: false },
    ],
};

/* ═══════════════════════════════════════════════════
   CAMERA CONTEXT
   ═══════════════════════════════════════════════════ */

interface CameraState {
    preset: ViewPreset;
    focusedPanel: string | null;
    parallaxOffset: { x: number; y: number };
}

interface CameraActions {
    setPreset: (preset: ViewPreset) => void;
    focusPanel: (id: string) => void;
    unfocusPanel: () => void;
    getLayout: (panelId: string) => PanelLayout | undefined;
}

type CameraCtx = CameraState & CameraActions;

const CameraContext = createContext<CameraCtx | null>(null);

export function useCameraSystem() {
    const ctx = useContext(CameraContext);
    if (!ctx) throw new Error('useCameraSystem must be used within CameraProvider');
    return ctx;
}

/* ═══════════════════════════════════════════════════
   CAMERA PROVIDER
   ═══════════════════════════════════════════════════ */

export function CameraProvider({ children }: { children: ReactNode }) {
    const [preset, setPresetState] = useState<ViewPreset>('ops');
    const [focusedPanel, setFocusedPanel] = useState<string | null>(null);
    const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

    const setPreset = useCallback((p: ViewPreset) => {
        setPresetState(p);
        setFocusedPanel(null);
    }, []);

    const focusPanel = useCallback((id: string) => setFocusedPanel(id), []);
    const unfocusPanel = useCallback(() => setFocusedPanel(null), []);

    const getLayout = useCallback(
        (panelId: string) => VIEW_LAYOUTS[preset].find((l) => l.id === panelId),
        [preset]
    );

    // Dashboard parallax — mouse follow
    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            const x = ((e.clientX / window.innerWidth) - 0.5) * 2; // -1 to 1
            const y = ((e.clientY / window.innerHeight) - 0.5) * 2;
            setParallaxOffset({ x: x * 4, y: y * 3 }); // Max 4px/3px offset
        };
        window.addEventListener('mousemove', handleMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    // ESC to unfocus
    useEffect(() => {
        if (!focusedPanel) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') unfocusPanel();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [focusedPanel, unfocusPanel]);

    return (
        <CameraContext.Provider
            value={{ preset, focusedPanel, parallaxOffset, setPreset, focusPanel, unfocusPanel, getLayout }}
        >
            {children}
        </CameraContext.Provider>
    );
}

/* ═══════════════════════════════════════════════════
   CAMERA PANEL — Wraps individual dashboard panels
   ═══════════════════════════════════════════════════ */

interface CameraPanelProps {
    id: string;
    children: ReactNode;
    /** Depth layer for parallax (1=near, 2=far) */
    depthLayer?: 1 | 2;
    className?: string;
}

export function CameraPanel({ id, children, depthLayer = 1, className }: CameraPanelProps) {
    const { focusedPanel, parallaxOffset, getLayout, focusPanel, unfocusPanel } = useCameraSystem();
    const layout = getLayout(id);

    const isFocused = focusedPanel === id;
    const anotherFocused = focusedPanel !== null && !isFocused;

    // Parallax shift by depth layer
    const parallaxMultiplier = depthLayer === 1 ? 0.5 : 1;
    const px = parallaxOffset.x * parallaxMultiplier;
    const py = parallaxOffset.y * parallaxMultiplier;

    const handleDoubleClick = useCallback(() => {
        if (isFocused) unfocusPanel();
        else focusPanel(id);
    }, [id, isFocused, focusPanel, unfocusPanel]);

    // Hidden in current preset
    if (layout && !layout.visible && !isFocused) return null;

    return (
        <motion.div
            layout
            className={`${styles.cameraPanel} ${isFocused ? styles.focused : ''} ${anotherFocused ? styles.dimmed : ''} ${className || ''}`}
            style={{
                gridColumn: isFocused ? '1 / -1' : layout?.col,
                gridRow: isFocused ? '1 / -1' : layout?.row,
                x: isFocused ? 0 : px,
                y: isFocused ? 0 : py,
            } as React.CSSProperties}
            initial={false}
            animate={{
                opacity: anotherFocused ? 0.2 : 1,
                filter: anotherFocused ? 'blur(8px) brightness(0.3)' : 'blur(0px) brightness(1)',
                scale: isFocused ? 1 : 1,
            }}
            transition={isFocused ? springHeavy : springSmooth}
            onDoubleClick={handleDoubleClick}
        >
            {children}
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════
   VIEW PRESET SWITCHER
   ═══════════════════════════════════════════════════ */

export function ViewPresetSwitcher() {
    const { preset, setPreset } = useCameraSystem();
    const presets: ViewPreset[] = ['ops', 'risk', 'alpha'];

    return (
        <div className={styles.switcher}>
            {presets.map((p) => (
                <button
                    key={p}
                    className={`${styles.presetBtn} ${preset === p ? styles.active : ''}`}
                    onClick={() => setPreset(p)}
                >
                    {p.toUpperCase()} FOCUS
                </button>
            ))}
        </div>
    );
}
