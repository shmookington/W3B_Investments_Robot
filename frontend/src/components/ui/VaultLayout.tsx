'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function VaultLayout({ children, title }: { children: React.ReactNode, title: string }) {
  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-gold-primary)',
          letterSpacing: '0.3em',
          fontSize: '11px',
          marginBottom: '48px',
          textAlign: 'center'
        }}>
          {title}
        </div>
        
        {children}
      </motion.div>

      <div style={{
        position: 'absolute',
        bottom: '40px',
        width: '100%',
        textAlign: 'center',
        padding: '0 24px',
        color: 'rgba(212, 175, 55, 0.4)',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        letterSpacing: '0.05em',
        lineHeight: '1.6',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        [SECURE] Connection encrypted. All deployed capital is routed to CFTC-regulated Designated Contract Markets. Unauthorized entities will be tracked and discarded.
      </div>
    </div>
  );
}
