import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for updating RSA laundry expenses
const updateRsaLaundryExpenseSchema = z.object({
  cleaner_id: z.string().uuid('Invalid cleaner ID').optional(),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  daily_payment_amount: z.number().min(0, 'Payment amount must be positive').optional(),
  service_description: z.string().optional(),
  notes: z.string().optional(),
  is_paid: z.boolean().optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

// Helper function to create error response
function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// Helper function to create success response
function successResponse(data: unknown, message: string = 'Success', status: number = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

// Helper function to handle API errors
function handleApiError(error: unknown, operation: string) {
  console.error(`Error ${operation}:`, error);
  return errorResponse(`Internal server error while ${operation}`, 500);
}

// GET /api/rsa-laundry-expenses/[id] - Get specific RSA laundry expense
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerComponentClient();
    const { id } = await params;

    const { data: expense, error } = await supabase
      .from('rsa_laundry_expenses_detailed')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('RSA laundry expense not found', 404);
      }
      console.error('Error fetching RSA laundry expense:', error);
      return errorResponse('Failed to fetch RSA laundry expense', 500);
    }

    return successResponse(expense);
  } catch (error) {
    return handleApiError(error, 'fetching RSA laundry expense');
  }
}

// PUT /api/rsa-laundry-expenses/[id] - Update RSA laundry expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    
    // Validate request body
    const validation = updateRsaLaundryExpenseSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`);
    }
    
    const updateData = validation.data;
    const supabase = await createServerComponentClient();

    // Check if expense exists
    const { data: existingExpense, error: fetchError } = await supabase
      .from('rsa_laundry_expenses')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingExpense) {
      return errorResponse('RSA laundry expense not found', 404);
    }

    // If cleaner_id is being updated, verify cleaner exists
    if (updateData.cleaner_id) {
      const { data: cleaner, error: cleanerError } = await supabase
        .from('cleaners')
        .select('id')
        .eq('id', updateData.cleaner_id)
        .single();

      if (cleanerError || !cleaner) {
        return errorResponse('Cleaner not found', 404);
      }
    }

    // Update the expense
    const { data: updatedExpense, error: updateError } = await supabase
      .from('rsa_laundry_expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating RSA laundry expense:', updateError);
      return errorResponse('Failed to update RSA laundry expense', 500);
    }

    return successResponse(updatedExpense, 'RSA laundry expense updated successfully');
  } catch (error) {
    return handleApiError(error, 'updating RSA laundry expense');
  }
}

// DELETE /api/rsa-laundry-expenses/[id] - Delete RSA laundry expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerComponentClient();

    // Check if expense exists
    const { data: existingExpense, error: fetchError } = await supabase
      .from('rsa_laundry_expenses')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingExpense) {
      return errorResponse('RSA laundry expense not found', 404);
    }

    // Delete the expense
    const { error: deleteError } = await supabase
      .from('rsa_laundry_expenses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting RSA laundry expense:', deleteError);
      return errorResponse('Failed to delete RSA laundry expense', 500);
    }

    return successResponse(null, 'RSA laundry expense deleted successfully');
  } catch (error) {
    return handleApiError(error, 'deleting RSA laundry expense');
  }
}
