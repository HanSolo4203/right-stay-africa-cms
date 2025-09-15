import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[LOGIN API] Login attempt started');
  
  try {
    const { email, password } = await request.json();
    console.log('[LOGIN API] Request body received:', { email: email ? `${email.substring(0, 3)}***` : 'undefined' });

    if (!email || !password) {
      console.log('[LOGIN API] Validation failed: Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('[LOGIN API] Creating Supabase client...');
    const supabase = await createServerComponentClient();
    
    console.log('[LOGIN API] Attempting authentication with Supabase...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[LOGIN API] Authentication failed:', {
        error: error.message,
        status: error.status,
        email: `${email.substring(0, 3)}***`
      });
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    const duration = Date.now() - startTime;
    console.log('[LOGIN API] Authentication successful:', {
      userId: data.user?.id,
      email: data.user?.email,
      duration: `${duration}ms`
    });

    return NextResponse.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[LOGIN API] Unexpected error:', {
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
