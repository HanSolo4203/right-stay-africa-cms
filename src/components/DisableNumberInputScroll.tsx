'use client';

import { useEffect } from 'react';

export default function DisableNumberInputScroll() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        e.preventDefault();
      }
    };

    // Add event listener to document
    document.addEventListener('wheel', handleWheel, { passive: false });

    // Cleanup function
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return null; // This component doesn't render anything
}
