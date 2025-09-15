'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[AUTH WRAPPER] Auth state changed:', {
      loading,
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      timestamp: new Date().toISOString()
    });

    if (!loading && !user) {
      console.log('[AUTH WRAPPER] No authenticated user found, redirecting to login...');
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('[AUTH WRAPPER] Showing loading spinner while checking authentication...');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render children if user is not authenticated
  if (!user) {
    console.log('[AUTH WRAPPER] No user found, not rendering protected content');
    return null;
  }

  // User is authenticated, render the protected content
  console.log('[AUTH WRAPPER] User authenticated, rendering protected content');
  return <>{children}</>;
}
