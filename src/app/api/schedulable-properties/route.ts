import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerComponentClient();

    // Query the unified view that combines apartments and RSA assets
    const { data: properties, error } = await supabase
      .from('all_schedulable_properties')
      .select('*')
      .order('property_category', { ascending: true })
      .order('property_name', { ascending: true });

    if (error) {
      console.error('Error fetching schedulable properties:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch schedulable properties' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: properties || []
    });

  } catch (error) {
    console.error('Error in schedulable properties API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
