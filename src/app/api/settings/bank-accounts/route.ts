import { NextRequest } from 'next/server';
import { bankAccountDetailsApi } from '@/lib/database';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-utils';

// GET /api/settings/bank-accounts - Get all bank account details
export async function GET() {
  try {
    const bankAccounts = await bankAccountDetailsApi.getAll();
    return successResponse(bankAccounts);
  } catch (error) {
    console.error('Error fetching bank account details:', error);
    return serverErrorResponse('Failed to fetch bank account details');
  }
}

// POST /api/settings/bank-accounts - Create new bank account detail
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.account_name || !body.beneficiary_name || !body.account_number || !body.branch_code || !body.bank_name) {
      return errorResponse('Missing required fields', 400);
    }
    
    const bankAccount = await bankAccountDetailsApi.create(body);
    return successResponse(bankAccount, 'Bank account detail created successfully', 201);
  } catch (error) {
    console.error('Error creating bank account detail:', error);
    return serverErrorResponse('Failed to create bank account detail');
  }
}

