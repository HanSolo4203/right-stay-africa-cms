import { NextRequest } from 'next/server';
import { inventoryItemsApi } from '@/lib/database';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';
import { createServerComponentClient } from '@/lib/supabase-server';

// Validation schema for stock take request
const stockTakeSchema = z.object({
  new_stock: z.number().min(0, 'Stock level must be 0 or greater'),
  notes: z.string().optional()
});

// POST /api/inventory/[id]/stock-take - Perform stock take
export async function POST(
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
    
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(stockTakeSchema, body);
    if (!validation.success) {
      return validation.error;
    }
    
    const { new_stock, notes } = validation.data;
    const { id: itemId } = await params;
    
    // Validate item ID format
    if (!itemId || typeof itemId !== 'string') {
      return errorResponse('Invalid item ID', 400);
    }
    
    // Perform stock take with user tracking
    const result = await inventoryItemsApi.performStockTake(itemId, new_stock, notes, user.email || user.id);
    
    return successResponse(result, 'Stock take recorded successfully');
  } catch (error) {
    return handleApiError(error, 'performing stock take');
  }
}
