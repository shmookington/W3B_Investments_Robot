'use client';

import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';

const data = [
  { name: 'NBA-LAL-BOS', size: 14000, fill: 'rgba(212, 175, 55, 0.4)' },
  { name: 'NFL-KC-BAL', size: 22000, fill: 'rgba(244,244,245,0.1)' },
  { name: 'EPL-MCI-ARS', size: 8500, fill: 'rgba(0, 229, 255, 0.2)' },
  { name: 'MLB-NYY-BOS', size: 11000, fill: 'rgba(212, 175, 55, 0.2)' },
  { name: 'UFC-OMAL-DVAL', size: 4000, fill: 'rgba(244,244,245,0.05)' },
  { name: 'NHL-VGK-COL', size: 6000, fill: 'rgba(0, 229, 255, 0.1)' },
  { name: 'NBA-MIA-CHI', size: 9500, fill: 'rgba(244,244,245,0.2)' }
];

const CustomizedContent = (props: any) => {
  const { depth, x, y, width, height, payload, name } = props;

  // Recharts passes depth 0 for the root container, and depth 1 for the actual items.
  if (depth !== 1 || !payload) {
    return null;
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: payload.fill || 'transparent',
          stroke: 'rgba(23, 23, 25, 0.9)',
          strokeWidth: 2,
        }}
      />
      {width > 50 && height > 30 && (
        <>
            <text x={x + 12} y={y + 24} fill="rgba(244,244,245,0.8)" fontSize={11} fontFamily="var(--font-mono)" letterSpacing="0.1em">
              {name}
            </text>
            <text x={x + 12} y={y + 40} fill="rgba(244,244,245,0.4)" fontSize={10} fontFamily="var(--font-mono)">
              ${(payload.size || 0).toLocaleString()} ALLOCATED
            </text>
        </>
      )}
    </g>
  );
};

export function ExposureHeatmap() {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="#8884d8"
          content={<CustomizedContent />}
        />
      </ResponsiveContainer>
    </div>
  );
}
