import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[LOGOUT API] Logout attempt started');
  
  try {
    console.log('[LOGOUT API] Creating Supabase client...');
    const supabase = await createServerComponentClient();
    
    // Get current session info before logout
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[LOGOUT API] Current session info:', {
      userId: session?.user?.id,
      email: session?.user?.email,
      expiresAt: session?.expires_at
    });
    
    console.log('[LOGOUT API] Attempting logout...');
    const { error } = await supabase.auth.signOut();

    if (error) {
      const duration = Date.now() - startTime;
      console.error('[LOGOUT API] Logout failed:', {
        error: error.message,
        duration: `${duration}ms`
      });
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log('[LOGOUT API] Logout successful:', {
      duration: `${duration}ms`
    });

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[LOGOUT API] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
