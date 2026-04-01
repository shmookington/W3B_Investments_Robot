import React, { ReactNode, CSSProperties } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function InstitutionalGlass({ children, className = '', style }: Props) {
  return (
    <div className={`institutional-glass ${className}`} style={style}>
      {children}
    </div>
  );
}
