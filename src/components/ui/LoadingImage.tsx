'use client';

import Image from 'next/image';

interface LoadingImageProps {
  size?: number;
  fullScreen?: boolean;
  alt?: string;
}

export default function LoadingImage({ size = 200, fullScreen = true, alt = 'Loading' }: LoadingImageProps) {
  return (
    <div
      className={fullScreen ? 'fixed inset-0 flex items-center justify-center z-50 bg-transparent' : 'flex items-center justify-center w-full'}
      style={fullScreen ? undefined : { minHeight: '50vh' }}
    >
      <Image
        src="/why-are-you-gae.png"
        alt={alt}
        width={size}
        height={size}
        priority
      />
    </div>
  );
}


