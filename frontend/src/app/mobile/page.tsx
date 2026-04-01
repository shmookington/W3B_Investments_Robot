'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExecutiveTearSheet } from '@/components/ui/ExecutiveTearSheet';
import { MobilePortfolioRibbon } from '@/components/ui/MobilePortfolioRibbon';

export default function MobileSPA() {
    const [activeTab, setActiveTab] = useState<'VAULT' | 'MARKETS' | 'AUDIT'>('VAULT');

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            overflow: 'hidden',
            backgroundColor: '#050505',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 99999, // Force over everything including desktop layouts
        }}>
            {/* Native Top Buffer mapping to the iOS Notch */}
            <div style={{ height: 'env(safe-area-inset-top)', minHeight: '44px', width: '100%', borderBottom: '1px solid rgba(244,244,245,0.02)' }} />

            {/* Header */}
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(244,244,245,0.05)' }}>
                <div style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', color: 'var(--text-platinum)' }}>
                    W3B 
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--data-positive)', animation: 'pulse 2s infinite' }} />
                    <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--data-positive)' }}>
                        LIVE SECURE
                    </div>
                </div>
            </div>

            {/* PWA Slider Viewport */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ damping: 25, stiffness: 200, type: 'spring' }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto', padding: '24px', paddingBottom: '120px' }}
                    >
                        {activeTab === 'VAULT' && <ExecutiveTearSheet />}
                        {activeTab === 'MARKETS' && (
                            <div style={{ color: 'rgba(244,244,245,0.4)', fontSize: '12px', fontFamily: 'var(--font-mono)', textAlign: 'center', marginTop: '40px' }}>
                                LIVE MARKETS<br/><br/>(Slide SPA Active)
                            </div>
                        )}
                        {activeTab === 'AUDIT' && (
                            <div style={{ color: 'rgba(244,244,245,0.4)', fontSize: '12px', fontFamily: 'var(--font-mono)', textAlign: 'center', marginTop: '40px' }}>
                                AUDIT REGISTRY<br/><br/>(Slide SPA Active)
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Fixed Glassmorphic Ribbon */}
            <MobilePortfolioRibbon active={activeTab} onChange={setActiveTab} />
        </div>
    );
}
