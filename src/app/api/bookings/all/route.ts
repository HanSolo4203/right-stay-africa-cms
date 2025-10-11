import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const propertyId = searchParams.get('property_id');
    const channelId = searchParams.get('channel_id');
    const status = searchParams.get('status');

    // Build the query
    let query = supabase
      .from('owner_statements_view')
      .select('*')
      .order('check_in_date', { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte('check_in_date', startDate);
    }
    if (endDate) {
      query = query.lte('check_out_date', endDate);
    }
    if (propertyId) {
      query = query.eq('property_name', propertyId);
    }
    if (channelId) {
      query = query.eq('channel_name', channelId);
    }
    if (status) {
      query = query.eq('booking_status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    console.log(`Fetched ${data?.length || 0} bookings`);
    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error in bookings GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
