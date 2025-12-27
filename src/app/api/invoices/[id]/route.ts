import { NextRequest } from 'next/server';
import { invoicesApi } from '@/lib/database';
import { successResponse, serverErrorResponse, notFoundResponse } from '@/lib/api-utils';

// GET /api/invoices/[id] - Get invoice by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await invoicesApi.getById(id);
    
    if (!invoice) {
      return notFoundResponse('Invoice');
    }
    
    return successResponse(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return serverErrorResponse('Failed to fetch invoice');
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const invoice = await invoicesApi.update({
      id,
      ...body,
    });
    
    return successResponse(invoice, 'Invoice updated successfully');
  } catch (error) {
    console.error('Error updating invoice:', error);
    
    // Extract error message from Supabase error or generic Error
    let errorMessage = 'Failed to update invoice';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    }
    
    return serverErrorResponse(errorMessage);
  }
}

// DELETE /api/invoices/[id] - Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await invoicesApi.delete(id);
    return successResponse(null, 'Invoice deleted successfully');
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return serverErrorResponse('Failed to delete invoice');
  }
}
