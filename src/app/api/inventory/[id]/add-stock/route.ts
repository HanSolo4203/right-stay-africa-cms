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

// Validation schema for add stock request
const addStockSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price must be 0 or greater')
});

// POST /api/inventory/[id]/add-stock - Add stock to existing inventory item
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
    const validation = validateRequest(addStockSchema, body);
    if (!validation.success) {
      return validation.error;
    }
    
    const { quantity, price } = validation.data;
    const { id: itemId } = await params;
    
    // Validate item ID format
    if (!itemId || typeof itemId !== 'string') {
      return errorResponse('Invalid item ID', 400);
    }
    
    // Add stock to the inventory item with user tracking
    const updatedItem = await inventoryItemsApi.addStock(itemId, {
      quantity,
      price
    }, user.email || user.id);
    
    return successResponse(updatedItem, 'Stock added successfully');
  } catch (error) {
    return handleApiError(error, 'adding stock to inventory item');
  }
}
