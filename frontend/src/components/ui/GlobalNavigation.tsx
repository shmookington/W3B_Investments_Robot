'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';

export function GlobalNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const setHoveredNavElement = useUIStore((state) => state.setHoveredNavElement);

  const links = [
    { name: 'INDEX', href: '/' },
    { name: 'AUTHENTICATE', href: '/login' },
    { name: 'OPS COMMAND CENTER', href: '/monolith' },
    { name: 'PORTFOLIO DASHBOARD', href: '/dashboard' },
    { name: 'PORTFOLIO EXPOSURE', href: '/portfolio' },
    { name: 'EXECUTIONS TERMINAL', href: '/terminal' },
    { name: 'AUDIT LOG', href: '/track-record' },
    { name: 'RISK MANAGEMENT', href: '/risk-management' },
    { name: 'DATA INTEGRITY HUD', href: '/data-integrity' },
    { name: 'TREASURY VAULT', href: '/treasury' },
    { name: 'QUANTITATIVE ANALYTICS', href: '/analytics' },
    { name: 'EXECUTIVE MOBILE VIEW', href: '/mobile' },
  ];

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          gap: '12px'
        }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: 'rgba(23, 23, 25, 0.8)',
            border: '1px solid var(--accent-gold-primary, #d4af37)',
            padding: '8px 16px',
            color: 'var(--accent-gold-primary, #d4af37)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.2em',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
            setHoveredNavElement('omni-link');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(23, 23, 25, 0.8)';
            setHoveredNavElement(null);
          }}
        >
          {isOpen ? '[ CLOSE OMNI-LINK ]' : '[ OMNI-LINK HUB ]'}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '72px',
              right: '24px',
              zIndex: 9998,
              background: 'rgba(10, 10, 12, 0.95)',
              border: '1px solid rgba(244,244,245,0.1)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              minWidth: '240px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ fontSize: '10px', color: 'rgba(244,244,245,0.3)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
              SYSTEM DIRECTORY
            </div>
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  style={{
                    color: isActive ? 'var(--accent-gold-primary)' : 'var(--text-platinum)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => { 
                    if (!isActive) e.currentTarget.style.color = 'var(--data-positive)'; 
                    setHoveredNavElement(link.name);
                  }}
                  onMouseLeave={(e) => { 
                    if (!isActive) e.currentTarget.style.color = 'var(--text-platinum)'; 
                    setHoveredNavElement(null);
                  }}
                >
                  <div style={{ 
                    width: '4px', 
                    height: '4px', 
                    background: isActive ? 'var(--accent-gold-primary)' : 'rgba(244,244,245,0.2)',
                    borderRadius: '50%'
                  }} />
                  {link.name}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
