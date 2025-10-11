import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('booking_channels')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching booking channels:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch booking channels' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error in booking channels GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
