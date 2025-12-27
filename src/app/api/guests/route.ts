import { createServerComponentClient } from '@/lib/supabase-server';
import { successResponse, serverErrorResponse } from '@/lib/api-utils';

// GET /api/guests - Get all guests
export async function GET() {
  try {
    const supabase = await createServerComponentClient();
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return successResponse(data || []);
  } catch (error) {
    console.error('Error fetching guests:', error);
    return serverErrorResponse('Failed to fetch guests');
  }
}
