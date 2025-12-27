import { invoicesApi } from '@/lib/database';
import { successResponse, serverErrorResponse } from '@/lib/api-utils';

// GET /api/invoices/stats - Get invoice statistics
export async function GET() {
  try {
    const stats = await invoicesApi.getStats();
    return successResponse(stats);
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    return serverErrorResponse('Failed to fetch invoice statistics');
  }
}
