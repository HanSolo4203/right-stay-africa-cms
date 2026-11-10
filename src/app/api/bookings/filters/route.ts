import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerComponentClient();

    // Fetch apartments
    const { data: apartments, error: apartmentsError } = await supabase
      .from('apartments')
      .select('id, apartment_number, owner_name')
      .eq('is_active', true)
      .order('apartment_number');

    if (apartmentsError) {
      console.error('Error fetching apartments:', apartmentsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch apartments' },
        { status: 500 }
      );
    }

    // Fetch booking channels
    const { data: channels, error: channelsError } = await supabase
      .from('booking_channels')
      .select('id, name, commission_rate, payment_processing_fee')
      .order('name');

    if (channelsError) {
      console.error('Error fetching channels:', channelsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch channels' },
        { status: 500 }
      );
    }

    // Booking status options
    const statusOptions = [
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ];

    return NextResponse.json({
      success: true,
      data: {
        apartments: apartments || [],
        channels: channels || [],
        statusOptions
      }
    });

  } catch (error) {
    console.error('Error in filters API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
