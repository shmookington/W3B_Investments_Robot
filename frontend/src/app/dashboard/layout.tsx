'use client';

import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: '80px 40px 40px 40px',
      position: 'relative',
      zIndex: 1, // Ensures it sits above the -1 WebGL canvas
    }}>
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '1600px',
        margin: '0 auto',
        overflow: 'hidden'
      }}>
        {children}
      </div>
    </div>
  );
}
