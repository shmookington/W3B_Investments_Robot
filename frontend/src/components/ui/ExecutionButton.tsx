'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface Props extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
}

export function ExecutionButton({ children, className = '', ...props }: Props) {
  return (
    <motion.button
      className={`execution-button ${className}`}
      whileHover={{
        scale: 1.02,
        borderColor: 'rgba(212, 175, 55, 0.8)',
        color: '#d4af37',
        backgroundColor: 'rgba(23, 23, 25, 0.8)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
