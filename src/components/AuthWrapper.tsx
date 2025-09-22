'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingImage from '@/components/ui/LoadingImage';

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
      <LoadingImage alt="Checking authentication..." />
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
