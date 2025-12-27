import { NextRequest } from 'next/server';
import { invoicesApi } from '@/lib/database';
import { successResponse, serverErrorResponse, errorResponse } from '@/lib/api-utils';

// GET /api/invoices - Get all invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let invoices;
    if (status) {
      invoices = await invoicesApi.getByStatus(status);
    } else {
      invoices = await invoicesApi.getAll();
    }
    
    return successResponse(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return serverErrorResponse('Failed to fetch invoices');
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.guest_id || !body.apartment_id || !body.client_name) {
      return errorResponse('Missing required fields', 400);
    }
    
    const invoice = await invoicesApi.create(body);
    return successResponse(invoice, 'Invoice created successfully', 201);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return serverErrorResponse('Failed to create invoice');
  }
}
