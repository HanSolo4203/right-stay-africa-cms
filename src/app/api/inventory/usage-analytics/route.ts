import { NextRequest } from 'next/server';
import { stockTakesApi } from '@/lib/database';
import { z } from 'zod';
import {
  successResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';

// Validation schema for usage analytics query
const usageAnalyticsSchema = z.object({
  item_id: z.string(),
  start_date: z.string(),
  end_date: z.string()
});

// GET /api/inventory/usage-analytics - Get usage analytics for an item
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validation = validateRequest(usageAnalyticsSchema, queryParams);
    if (!validation.success) {
      return validation.error;
    }
    
    const { item_id, start_date, end_date } = validation.data;
    
    // Get usage analytics
    const analytics = await stockTakesApi.getUsageAnalytics(
      item_id,
      start_date,
      end_date
    );
    
    return successResponse(analytics, 'Usage analytics retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'fetching usage analytics');
  }
}
