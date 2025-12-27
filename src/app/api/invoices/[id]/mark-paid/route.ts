import { NextRequest } from 'next/server';
import { invoicesApi } from '@/lib/database';
import { successResponse, serverErrorResponse } from '@/lib/api-utils';

// POST /api/invoices/[id]/mark-paid - Mark invoice as paid
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const amountPaid = body.amount_paid;
    
    const invoice = await invoicesApi.markAsPaid(id, amountPaid);
    return successResponse(invoice, 'Invoice marked as paid');
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    return serverErrorResponse('Failed to mark invoice as paid');
  }
}
