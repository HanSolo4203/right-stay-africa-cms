import { NextRequest } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';
import { z } from 'zod';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// Validation schema for creating RSA laundry expenses
const createRsaLaundryExpenseSchema = z.object({
  cleaner_id: z.string().uuid('Invalid cleaner ID'),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  daily_payment_amount: z.number().min(0, 'Payment amount must be positive'),
  service_description: z.string().optional(),
  notes: z.string().optional(),
});

// const updateRsaLaundryExpenseSchema = createRsaLaundryExpenseSchema.partial().extend({
//   is_paid: z.boolean().optional(),
//   payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
// });

// Use shared helpers from '@/lib/api-utils' and central logger

// GET /api/rsa-laundry-expenses - Get all RSA laundry expenses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const { searchParams } = new URL(request.url);
    
    // Optional filters
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const cleanerId = searchParams.get('cleaner_id');
    const isPaid = searchParams.get('is_paid');

    let query = supabase
      .from('rsa_laundry_expenses_detailed')
      .select('*')
      .order('service_date', { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte('service_date', startDate);
    }
    if (endDate) {
      query = query.lte('service_date', endDate);
    }
    if (cleanerId) {
      query = query.eq('cleaner_id', cleanerId);
    }
    if (isPaid !== null) {
      query = query.eq('is_paid', isPaid === 'true');
    }

    const { data: expenses, error } = await query;

    if (error) {
      logger.error('Error fetching RSA laundry expenses:', error);
      return errorResponse('Failed to fetch RSA laundry expenses', 500);
    }

    return successResponse(expenses || []);
  } catch (error) {
    return handleApiError(error, 'fetching RSA laundry expenses');
  }
}

// POST /api/rsa-laundry-expenses - Create new RSA laundry expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = createRsaLaundryExpenseSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`);
    }
    
    const expenseData = validation.data;
    const supabase = await createServerComponentClient();

    // Check if cleaner exists
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, name')
      .eq('id', expenseData.cleaner_id)
      .single();

    if (cleanerError || !cleaner) {
      return errorResponse('Cleaner not found', 404);
    }

    // Get RSA Laundry Room asset ID
    const { data: laundryAsset, error: assetError } = await supabase
      .from('internal_assets')
      .select('id, asset_name')
      .eq('asset_name', 'RSA Laundry Room')
      .eq('is_active', true)
      .single();

    if (assetError || !laundryAsset) {
      return errorResponse('RSA Laundry Room asset not found', 404);
    }

    // Check for existing expense on the same date with the same cleaner
    const { data: existingExpense } = await supabase
      .from('rsa_laundry_expenses')
      .select('id')
      .eq('asset_id', laundryAsset.id)
      .eq('cleaner_id', expenseData.cleaner_id)
      .eq('service_date', expenseData.service_date)
      .single();

    if (existingExpense) {
      return errorResponse('Expense record already exists for this cleaner on this date', 409);
    }

    // Create the expense record
    const { data: newExpense, error: createError } = await supabase
      .from('rsa_laundry_expenses')
      .insert({
        asset_id: laundryAsset.id,
        cleaner_id: expenseData.cleaner_id,
        service_date: expenseData.service_date,
        daily_payment_amount: expenseData.daily_payment_amount,
        service_description: expenseData.service_description,
        notes: expenseData.notes,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating RSA laundry expense:', createError);
      return errorResponse('Failed to create RSA laundry expense', 500);
    }

    return successResponse(newExpense, 'RSA laundry expense created successfully', 201);
  } catch (error) {
    return handleApiError(error, 'creating RSA laundry expense');
  }
}
