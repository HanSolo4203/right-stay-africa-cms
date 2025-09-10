'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface NetworkErrorHandlerProps {
  error?: Error | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export default function NetworkErrorHandler({
  error,
  onRetry,
  isRetrying = false,
  className = ''
}: NetworkErrorHandlerProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Listen for online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!error) return null;

  const isNetworkError = error.message.includes('fetch') || 
                        error.message.includes('network') || 
                        error.message.includes('Failed to fetch') ||
                        !isOnline;

  if (!isOnline) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <WifiOff className="w-5 h-5 text-yellow-600 mr-3" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">You're offline</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Please check your internet connection and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isNetworkError) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
            <p className="text-sm text-red-700 mt-1">
              Unable to connect to the server. Please check your connection and try again.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={isRetrying}
                className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Generic error
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Something went wrong</h3>
          <p className="text-sm text-red-700 mt-1">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRetrying ? (
                <>
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for handling network errors
export function useNetworkError() {
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = (err: Error) => {
    setError(err);
  };

  const retry = async (retryFn: () => Promise<void>) => {
    setIsRetrying(true);
    setError(null);
    
    try {
      await retryFn();
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsRetrying(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    error,
    isRetrying,
    handleError,
    retry,
    clearError
  };
}
