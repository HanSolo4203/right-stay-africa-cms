import { createServerComponentClient } from '@/lib/supabase-server';
import { successResponse, serverErrorResponse } from '@/lib/api-utils';

// GET /api/apartments - Get all apartments
export async function GET() {
  try {
    const supabase = await createServerComponentClient();
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .order('apartment_number');
    
    if (error) throw error;
    return successResponse(data || []);
  } catch (error) {
    console.error('Error fetching apartments:', error);
    return serverErrorResponse('Failed to fetch apartments');
  }
}