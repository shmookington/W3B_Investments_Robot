'use client';

import React, { useState, useEffect } from 'react';

type Order = { price: number; volume: number };

export function OrderBook() {
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);

  useEffect(() => {
    const generateOrders = () => {
      const basePrice = 0.50;
      const newBids = Array.from({ length: 30 }, (_, i) => ({
        price: basePrice - (i * 0.01) - (Math.random() * 0.005),
        volume: Math.floor(Math.random() * 1000) + 100
      })).sort((a, b) => b.price - a.price);
      
      const newAsks = Array.from({ length: 30 }, (_, i) => ({
        price: basePrice + 0.01 + (i * 0.01) + (Math.random() * 0.005),
        volume: Math.floor(Math.random() * 1000) + 100
      })).sort((a, b) => a.price - b.price);

      setBids(newBids);
      setAsks(newAsks);
    };

    generateOrders();
    const interval = setInterval(generateOrders, 1000);
    return () => clearInterval(interval);
  }, []);

  const renderRow = (order: Order, type: 'bid' | 'ask') => {
    const isBid = type === 'bid';
    const finalColor = isBid ? 'rgba(0, 229, 255, 0.8)' : 'rgba(212, 175, 55, 0.8)';
    const maxVol = 2000;
    const widthPct = Math.min((order.volume / maxVol) * 100, 100);

    return (
      <div key={order.price} style={{ display: 'flex', position: 'relative', padding: '4px 24px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
        {/* Depth Bar */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, [isBid ? 'right' : 'left']: 0,
          width: `${widthPct}%`, background: finalColor, opacity: 0.15, zIndex: 0
        }} />
        
        <div style={{ flex: 1, zIndex: 1, color: 'rgba(244,244,245,0.7)', textAlign: isBid ? 'left' : 'right' }}>
            {isBid ? order.volume : `$${order.price.toFixed(3)}`}
        </div>
        <div style={{ flex: 1, zIndex: 1, color: finalColor, textAlign: isBid ? 'right' : 'left' }}>
            {isBid ? `$${order.price.toFixed(3)}` : order.volume}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', padding: '16px 24px', borderBottom: '1px solid rgba(244,244,245,0.05)', fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        <div style={{ flex: 1, textAlign: 'left' }}>BID SIZE</div>
        <div style={{ flex: 1, textAlign: 'right' }}>PRICE</div>
        <div style={{ flex: 1, textAlign: 'left', paddingLeft: '24px' }}>PRICE</div>
        <div style={{ flex: 1, textAlign: 'right' }}>ASK SIZE</div>
      </div>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Bids */}
        <div style={{ flex: 1, borderRight: '1px solid rgba(244,244,245,0.05)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {bids.map(b => renderRow(b, 'bid'))}
        </div>
        {/* Asks */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {asks.map(a => renderRow(a, 'ask'))}
        </div>
      </div>
      
      <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(244,244,245,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(0, 229, 255, 0.8)' }} />
        <span style={{ fontSize: '10px', color: 'rgba(244,244,245,0.4)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>LIVE MATCHING ENGINE</span>
      </div>
    </div>
  );
}
