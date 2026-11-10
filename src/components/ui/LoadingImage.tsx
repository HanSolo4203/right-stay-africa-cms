'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingImageProps {
  size?: number;
  fullScreen?: boolean;
  alt?: string;
  className?: string;
}

export default function LoadingImage({
  size = 40,
  fullScreen = true,
  alt = 'Loading',
  className,
}: LoadingImageProps) {
  return (
    <div
      className={cn(
        fullScreen
          ? 'fixed inset-0 z-50 flex items-center justify-center bg-background/60'
          : 'flex w-full items-center justify-center',
        className
      )}
      style={fullScreen ? undefined : { minHeight: '50vh' }}
      role="status"
      aria-label={alt}
    >
      <Loader2
        className="animate-spin text-muted-foreground"
        style={{ width: size, height: size }}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="sr-only">{alt}</span>
    </div>
  );
}
