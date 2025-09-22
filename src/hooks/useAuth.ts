'use client';

import { useState, useEffect } from 'react';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClientComponentClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    console.log('[AUTH HOOK] Initializing authentication hook');
    
    // Get initial session
    const getInitialSession = async () => {
      console.log('[AUTH HOOK] Getting initial session...');
      const maxAttempts = 3;
      let attempt = 0;
      let lastError: unknown = null;

      while (attempt < maxAttempts) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            // For retryable errors, try again with backoff
            const isRetryable = error.name === 'AuthRetryableFetchError' ||
              /Retryable|Load failed|network/i.test(error.message);

            console.error(`[AUTH HOOK] Error getting initial session (attempt ${attempt + 1}/${maxAttempts}):`, error);

            if (isRetryable && attempt < maxAttempts - 1) {
              const backoffMs = 300 * Math.pow(2, attempt);
              await new Promise((res) => setTimeout(res, backoffMs));
              attempt++;
              continue;
            }
          } else {
            console.log('[AUTH HOOK] Initial session retrieved:', {
              hasSession: !!session,
              userId: session?.user?.id,
              email: session?.user?.email,
              expiresAt: session?.expires_at
            });
          }

          setUser(session?.user ?? null);
          setLoading(false);
          return;
        } catch (e) {
          lastError = e;
          console.error(`[AUTH HOOK] Unexpected error getting initial session (attempt ${attempt + 1}/${maxAttempts}):`, e);
          if (attempt < maxAttempts - 1) {
            const backoffMs = 300 * Math.pow(2, attempt);
            await new Promise((res) => setTimeout(res, backoffMs));
            attempt++;
            continue;
          }
        }
        break;
      }

      // If we reach here, all attempts failed
      setUser(null);
      setLoading(false);
      if (lastError) {
        console.error('[AUTH HOOK] All attempts to get initial session failed:', lastError);
      }
    };

    getInitialSession();

    // Listen for auth changes
    console.log('[AUTH HOOK] Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('[AUTH HOOK] Auth state changed:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          timestamp: new Date().toISOString()
        });
        
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          console.log('[AUTH HOOK] User signed out, redirecting to login...');
          router.push('/login');
        } else if (event === 'SIGNED_IN') {
          console.log('[AUTH HOOK] User signed in successfully');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[AUTH HOOK] Token refreshed');
        }
      }
    );

    return () => {
      console.log('[AUTH HOOK] Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }, [supabase.auth, router]);

  const signOut = async () => {
    console.log('[AUTH HOOK] Sign out initiated');
    try {
      // Call server route to clear auth cookies
      const resp = await fetch('/api/auth/logout', { method: 'POST' });
      if (!resp.ok) {
        console.warn('[AUTH HOOK] /api/auth/logout returned non-200:', resp.status);
      }

      // Also sign out client-side to clear any local session state
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AUTH HOOK] Error signing out:', error);
      } else {
        console.log('[AUTH HOOK] Sign out successful');
      }

      // Navigate to login explicitly in case onAuthStateChange is delayed
      router.replace('/login');
    } catch (error) {
      console.error('[AUTH HOOK] Unexpected error during sign out:', error);
      // Fallback navigation
      router.replace('/login');
    }
  };

  return {
    user,
    loading,
    signOut,
  };
}
