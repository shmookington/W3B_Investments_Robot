'use client';

import React from 'react';

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: '80px 40px 40px 40px',
      position: 'relative',
      zIndex: 1, 
    }}>
      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: '1800px',
        margin: '0 auto',
        display: 'flex',
        overflow: 'hidden'
      }}>
        {children}
      </div>
    </div>
  );
}
