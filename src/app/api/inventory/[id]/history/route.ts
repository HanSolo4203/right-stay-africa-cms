import { NextRequest } from 'next/server';
import { stockTakesApi } from '@/lib/database';
import {
  successResponse,
  errorResponse,
  handleApiError
} from '@/lib/api-utils';
import { createServerComponentClient } from '@/lib/supabase-server';

// GET /api/inventory/[id]/history - Get comprehensive history for an inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const supabase = await createServerComponentClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }
    
    const { id: itemId } = await params;
    
    // Validate item ID format
    if (!itemId || typeof itemId !== 'string') {
      return errorResponse('Invalid item ID', 400);
    }
    
    // Get stock take history for this item
    const stockTakes = await stockTakesApi.getHistory(itemId);
    
    // Transform the data to include more detailed information
    const history = stockTakes.map(take => ({
      id: take.id,
      type: take.adjustment_amount > 0 ? 'addition' : 'usage',
      date: take.take_date,
      previousStock: take.previous_stock,
      newStock: take.new_stock,
      adjustment: take.adjustment_amount,
      notes: take.notes,
      createdBy: take.created_by,
      createdAt: take.created_at,
      // Calculate cost impact
      costPerUnit: take.notes?.includes('R') ? 
        parseFloat(take.notes.match(/R(\d+\.?\d*)/)?.[1] || '0') / Math.abs(take.adjustment_amount) : null,
      totalCost: take.notes?.includes('R') ? 
        parseFloat(take.notes.match(/R(\d+\.?\d*)/)?.[1] || '0') : null
    }));
    
    // Sort by date (most recent first)
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return successResponse(history, 'Item history retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'fetching item history');
  }
}
