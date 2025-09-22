import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  logger.debug('[LOGIN API] Login attempt started');
  
  try {
    const { email, password } = await request.json();
    logger.debug('[LOGIN API] Request body received:', { email: email ? `${email.substring(0, 3)}***` : 'undefined' });

    if (!email || !password) {
      logger.debug('[LOGIN API] Validation failed: Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    logger.debug('[LOGIN API] Creating Supabase client...');
    const supabase = await createServerComponentClient();
    
    logger.debug('[LOGIN API] Attempting authentication with Supabase...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('[LOGIN API] Authentication failed:', {
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
    logger.debug('[LOGIN API] Authentication successful:', {
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
    logger.error('[LOGIN API] Unexpected error:', {
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
