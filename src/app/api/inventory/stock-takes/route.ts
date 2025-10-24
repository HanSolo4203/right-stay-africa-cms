import { NextRequest } from 'next/server';
import { stockTakesApi } from '@/lib/database';
import { z } from 'zod';
import {
  successPaginatedResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';

// Validation schema for stock takes query
const stockTakesQuerySchema = z.object({
  item_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

// GET /api/inventory/stock-takes - Get stock take history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validation = validateRequest(stockTakesQuerySchema, queryParams);
    if (!validation.success) {
      return validation.error;
    }
    
    const { item_id, start_date, end_date, limit, offset } = validation.data;
    
    // Get stock take history
    const stockTakes = await stockTakesApi.getHistory(
      item_id,
      start_date,
      end_date,
      limit,
      offset
    );
    
    // For pagination, we need to get total count
    const totalStockTakes = await stockTakesApi.getHistory(
      item_id,
      start_date,
      end_date,
      1000, // Large limit to get total count
      0
    );
    
    const total = totalStockTakes.length;
    const hasMore = offset + limit < total;
    
    return successPaginatedResponse(
      stockTakes,
      { total, limit, offset, hasMore },
      'Stock take history retrieved successfully'
    );
  } catch (error) {
    return handleApiError(error, 'fetching stock take history');
  }
}
