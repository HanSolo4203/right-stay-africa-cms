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
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AUTH HOOK] Error getting initial session:', error);
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
      } catch (error) {
        console.error('[AUTH HOOK] Unexpected error getting initial session:', error);
        setUser(null);
        setLoading(false);
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AUTH HOOK] Error signing out:', error);
      } else {
        console.log('[AUTH HOOK] Sign out successful');
      }
    } catch (error) {
      console.error('[AUTH HOOK] Unexpected error during sign out:', error);
    }
  };

  return {
    user,
    loading,
    signOut,
  };
}
