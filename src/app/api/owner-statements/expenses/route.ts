import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

interface Expense {
  name: string;
  quantity: number;
  price: number;
}

// GET - Fetch saved expenses for properties
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const statementDate = searchParams.get('statement_date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('owner_statement_expenses')
      .select('*')
      .order('created_at', { ascending: false });

    // Support both single date and date range queries
    if (statementDate) {
      // Single date query (backward compatibility)
      query = query.eq('statement_date', statementDate);
    } else if (startDate && endDate) {
      // Date range query
      query = query
        .gte('statement_date', startDate)
        .lte('statement_date', endDate);
    } else {
      return NextResponse.json(
        { success: false, error: 'Either statement_date or start_date and end_date parameters required' },
        { status: 400 }
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch expenses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error in expenses GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save expenses for properties
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { property_expenses, commission_rates, statement_date } = body;

    if (!property_expenses || !statement_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Delete existing expenses for this statement date (to replace with new data)
    await supabase
      .from('owner_statement_expenses')
      .delete()
      .eq('statement_date', statement_date);

    // Prepare data for insertion
    const dataToInsert = Object.entries(property_expenses).map(([propertyName, expenses]) => ({
      property_name: propertyName,
      expenses: expenses as Expense[],
      commission_rate: commission_rates[propertyName] || 0,
      statement_date: statement_date
    }));

    if (dataToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expenses to save'
      });
    }

    // Insert new expenses
    const { data, error } = await supabase
      .from('owner_statement_expenses')
      .insert(dataToInsert)
      .select();

    if (error) {
      console.error('Error saving expenses:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save expenses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Expenses saved successfully'
    });

  } catch (error) {
    console.error('Error in expenses POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

