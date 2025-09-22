'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import LoadingImage from '@/components/ui/LoadingImage';

interface LoginLoadingAnimationProps {
  onComplete: () => void;
  userEmail?: string;
}

export default function LoginLoadingAnimation({ onComplete, userEmail }: LoginLoadingAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [loadingComplete, setLoadingComplete] = useState(false);

  useEffect(() => {
    const loadingSteps = [
      { text: 'Initializing...', duration: 500 },
      { text: 'Authenticating...', duration: 800 },
      { text: 'Loading Dashboard...', duration: 1000 },
      { text: 'Almost Ready...', duration: 700 }
    ];

    let currentStep = 0;
    let totalTime = 0;

    // Start immediately with no delay
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setLoadingText(loadingSteps[currentStep].text);
        totalTime += loadingSteps[currentStep].duration;
        setProgress((totalTime / 3000) * 100);
        currentStep++;
      } else {
        setProgress(100);
        setLoadingText('Welcome to Right Stay Africa!');
        setLoadingComplete(true);
        clearInterval(interval);
      }
    }, 0); // Start immediately

    return () => clearInterval(interval);
  }, [onComplete]);

  // Special loading screen for travel@rightstayafrica.com
  if (userEmail === 'travel@rightstayafrica.com') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          {/* Special image for travel email */}
          <div className="mb-8">
            <div className="relative inline-block">
              <Image
                src="/why-are-you-gae.png"
                alt="Special loading image"
                width={400}
                height={400}
                className="w-auto h-auto max-w-md mx-auto"
                priority
              />
            </div>
          </div>
          
          {/* Loading text */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {loadingText}
            </h2>
            <p className="text-white text-sm">
              Please wait while we prepare your dashboard...
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-80 mx-auto mb-4">
            <div className="bg-gray-700 border border-white rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-white to-gray-300 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Progress Percentage */}
          <div className="text-white text-sm font-mono">
            {Math.round(progress)}%
          </div>

          {/* Enter Dashboard Button - only show when loading is complete */}
          {loadingComplete && (
            <div className="mt-8">
              <button
                onClick={onComplete}
                className="px-8 py-3 bg-white text-black font-bold text-lg rounded-lg hover:bg-gray-200 transition-colors duration-200 shadow-lg"
              >
                Enter Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular loading screen for other users using the specified image
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="relative z-10 text-center">
        <div className="mb-8">
          <LoadingImage size={260} fullScreen={false} alt="Loading" />
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {loadingText}
          </h2>
          <p className="text-white text-sm">
            Please wait while we prepare your dashboard...
          </p>
        </div>

        <div className="w-80 mx-auto mb-4">
          <div className="bg-gray-700 border border-white rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-white to-gray-300 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="text-white text-sm font-mono">
          {Math.round(progress)}%
        </div>

        {loadingComplete && (
          <div className="mt-8">
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-white text-black font-bold text-lg rounded-lg hover:bg-gray-200 transition-colors duration-200 shadow-lg"
            >
              Enter Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
