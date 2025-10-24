import { NextRequest } from 'next/server';
import { inventoryItemsApi } from '@/lib/database';
import { 
  createInventoryItemSchema, 
  inventoryQuerySchema
} from '@/lib/validations';
import {
  successResponse,
  successPaginatedResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';

// GET /api/inventory - Get all inventory items with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validation = validateRequest(inventoryQuerySchema, queryParams);
    if (!validation.success) {
      return validation.error;
    }
    
    const { type, search, limit = 50, offset = 0 } = validation.data;
    
    // Get inventory items
    let items;
    if (type) {
      items = await inventoryItemsApi.getByType(type);
    } else {
      items = await inventoryItemsApi.getAll();
    }
    
    // Apply search filter if provided
    let filteredItems = items;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.notes && item.notes.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply pagination
    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(offset, offset + limit);
    const hasMore = offset + limit < total;
    
    return successPaginatedResponse(
      paginatedItems,
      { total, limit, offset, hasMore },
      'Inventory items retrieved successfully'
    );
  } catch (error) {
    return handleApiError(error, 'fetching inventory items');
  }
}

// POST /api/inventory - Create new inventory item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(createInventoryItemSchema, body);
    if (!validation.success) {
      return validation.error;
    }
    
    const itemData = validation.data;
    
    const newItem = await inventoryItemsApi.create({
      ...itemData,
      min_stock_level: itemData.min_stock_level ?? undefined,
      notes: itemData.notes ?? undefined
    });
    
    return successResponse(newItem, 'Inventory item created successfully', 201);
  } catch (error) {
    return handleApiError(error, 'creating inventory item');
  }
}
