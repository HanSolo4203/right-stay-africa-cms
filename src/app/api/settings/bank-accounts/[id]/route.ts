import { NextRequest } from 'next/server';
import { bankAccountDetailsApi } from '@/lib/database';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-utils';

// GET /api/settings/bank-accounts/[id] - Get bank account detail by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bankAccount = await bankAccountDetailsApi.getById(id);
    
    if (!bankAccount) {
      return errorResponse('Bank account detail not found', 404);
    }
    
    return successResponse(bankAccount);
  } catch (error) {
    console.error('Error fetching bank account detail:', error);
    return serverErrorResponse('Failed to fetch bank account detail');
  }
}

// PUT /api/settings/bank-accounts/[id] - Update bank account detail
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const bankAccount = await bankAccountDetailsApi.update(id, body);
    return successResponse(bankAccount, 'Bank account detail updated successfully');
  } catch (error) {
    console.error('Error updating bank account detail:', error);
    return serverErrorResponse('Failed to update bank account detail');
  }
}

// DELETE /api/settings/bank-accounts/[id] - Delete bank account detail
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await bankAccountDetailsApi.delete(id);
    return successResponse(null, 'Bank account detail deleted successfully');
  } catch (error) {
    console.error('Error deleting bank account detail:', error);
    return serverErrorResponse('Failed to delete bank account detail');
  }
}

