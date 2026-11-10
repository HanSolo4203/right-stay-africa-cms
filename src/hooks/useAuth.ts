'use client';

import { useState, useEffect } from 'react';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClientComponentClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const SESSION_TIMEOUT_MS = 8000;

async function getSessionWithTimeout(
  supabase: ReturnType<typeof createClientComponentClient>,
  timeoutMs: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('getSession timed out')),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const getInitialSession = async () => {
      const maxAttempts = 3;
      let attempt = 0;
      let lastError: unknown = null;

      while (attempt < maxAttempts && !cancelled) {
        try {
          const { data: { session }, error } = await getSessionWithTimeout(
            supabase,
            SESSION_TIMEOUT_MS
          );

          if (error) {
            const isRetryable =
              error.name === 'AuthRetryableFetchError' ||
              /Retryable|Load failed|network/i.test(error.message);

            console.error(
              `[AUTH HOOK] Error getting initial session (attempt ${attempt + 1}/${maxAttempts}):`,
              error
            );

            if (isRetryable && attempt < maxAttempts - 1) {
              const backoffMs = 300 * Math.pow(2, attempt);
              await new Promise((res) => setTimeout(res, backoffMs));
              attempt++;
              continue;
            }
          }

          if (!cancelled) {
            setUser(session?.user ?? null);
            setLoading(false);
          }
          return;
        } catch (e) {
          lastError = e;
          console.error(
            `[AUTH HOOK] Unexpected error getting initial session (attempt ${attempt + 1}/${maxAttempts}):`,
            e
          );
          if (attempt < maxAttempts - 1) {
            const backoffMs = 300 * Math.pow(2, attempt);
            await new Promise((res) => setTimeout(res, backoffMs));
            attempt++;
            continue;
          }
        }
        break;
      }

      if (!cancelled) {
        setUser(null);
        setLoading(false);
        if (lastError) {
          console.error(
            '[AUTH HOOK] All attempts to get initial session failed:',
            lastError
          );
        }
      }
    };

    getInitialSession();

    // Keep this callback synchronous — async handlers can deadlock with getSession().
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (cancelled) return;

        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- singleton client; avoid re-subscribing
  }, [router]);

  const signOut = async () => {
    try {
      const resp = await fetch('/api/auth/logout', { method: 'POST' });
      if (!resp.ok) {
        console.warn(
          '[AUTH HOOK] /api/auth/logout returned non-200:',
          resp.status
        );
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AUTH HOOK] Error signing out:', error);
      }

      router.replace('/login');
    } catch (error) {
      console.error('[AUTH HOOK] Unexpected error during sign out:', error);
      router.replace('/login');
    }
  };

  return {
    user,
    loading,
    signOut,
  };
}
