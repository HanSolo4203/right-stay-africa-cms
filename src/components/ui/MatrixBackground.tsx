'use client';

import { useEffect, useRef } from 'react';

export default function MatrixBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Matrix characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Create columns
    const createColumn = () => {
      const column = document.createElement('div');
      column.className = 'matrix-column';
      column.style.left = Math.random() * 100 + '%';
      column.style.animationDuration = (Math.random() * 2 + 1) + 's';
      column.style.animationDelay = Math.random() * 1 + 's';
      
      // Generate random characters for this column
      let text = '';
      for (let i = 0; i < 50; i++) {
        text += chars[Math.floor(Math.random() * chars.length)] + '\n';
      }
      column.textContent = text;
      
      container.appendChild(column);
      
      // Remove column after animation completes
      setTimeout(() => {
        if (column.parentNode) {
          column.parentNode.removeChild(column);
        }
      }, 3000);
    };

    // Create initial columns - more columns for prominence
    for (let i = 0; i < 40; i++) {
      setTimeout(createColumn, i * 100);
    }

    // Continue creating new columns - faster generation
    const interval = setInterval(createColumn, 150);

    return () => {
      clearInterval(interval);
      // Clean up any remaining columns
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return <div ref={containerRef} className="matrix-bg" />;
}
