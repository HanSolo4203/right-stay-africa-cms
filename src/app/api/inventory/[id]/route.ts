import { NextRequest } from 'next/server';
import { inventoryItemsApi } from '@/lib/database';
import { updateInventoryItemSchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  handleApiError,
  validateRequest,
  notFoundResponse
} from '@/lib/api-utils';
import { createServerComponentClient } from '@/lib/supabase-server';

// GET /api/inventory/[id] - Get single inventory item
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
    
    const { id } = await params;
    const item = await inventoryItemsApi.getById(id);
    
    if (!item) {
      return notFoundResponse('Inventory item');
    }
    
    return successResponse(item, 'Inventory item retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'fetching inventory item');
  }
}

// PUT /api/inventory/[id] - Update inventory item
export async function PUT(
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
    
    const { id } = await params;
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(updateInventoryItemSchema, {
      ...body,
      id: id
    });
    if (!validation.success) {
      return validation.error;
    }
    
    const itemData = validation.data;
    
    // Check if item exists
    const existingItem = await inventoryItemsApi.getById(id);
    if (!existingItem) {
      return notFoundResponse('Inventory item');
    }
    
    const updatedItem = await inventoryItemsApi.update({
      ...itemData,
      min_stock_level: itemData.min_stock_level ?? undefined,
      notes: itemData.notes ?? undefined
    });
    
    return successResponse(updatedItem, 'Inventory item updated successfully');
  } catch (error) {
    return handleApiError(error, 'updating inventory item');
  }
}

// DELETE /api/inventory/[id] - Delete inventory item (soft delete)
export async function DELETE(
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
    
    const { id } = await params;
    
    // Check if item exists
    const existingItem = await inventoryItemsApi.getById(id);
    if (!existingItem) {
      return notFoundResponse('Inventory item');
    }
    
    await inventoryItemsApi.delete(id);
    
    return successResponse(null, 'Inventory item deleted successfully');
  } catch (error) {
    return handleApiError(error, 'deleting inventory item');
  }
}
