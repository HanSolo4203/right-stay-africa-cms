import { NextRequest } from 'next/server';
import { invoicesApi } from '@/lib/database';
import { successResponse, serverErrorResponse } from '@/lib/api-utils';

// POST /api/invoices/[id]/mark-sent - Mark invoice as sent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await invoicesApi.markAsSent(id);
    return successResponse(invoice, 'Invoice marked as sent');
  } catch (error) {
    console.error('Error marking invoice as sent:', error);
    return serverErrorResponse('Failed to mark invoice as sent');
  }
}
