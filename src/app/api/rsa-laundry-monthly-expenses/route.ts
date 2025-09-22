import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

// Simple in-memory cache (in production, use Redis or similar)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface MonthlyExpenseParams {
  startDate?: string;
  endDate?: string;
  cleanerId?: string;
  includeDetails?: boolean;
  format?: 'json' | 'csv';
}

interface Expense {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  daily_payment_amount: number;
  is_paid: boolean;
  payment_date?: string;
  service_description?: string;
  notes?: string;
  service_date: string;
}

interface MonthlyExpense {
  month_year: string;
  total_expenses: number;
  total_days: number;
  average_daily_payment: number;
  cleaner_count: number;
  expenses?: Expense[];
}

interface MonthlyExpenseData {
  monthlyExpenses: MonthlyExpense[];
  params: MonthlyExpenseParams;
  runningTotals?: unknown;
  cleanerPerformance?: unknown;
  summary?: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: MonthlyExpenseParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      cleanerId: searchParams.get('cleanerId') || undefined,
      includeDetails: searchParams.get('includeDetails') === 'true',
      format: (searchParams.get('format') as 'json' | 'csv') || 'json'
    };

    // Create cache key
    const cacheKey = `monthly-expenses-${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ 
        success: true, 
        data: cached.data,
        cached: true 
      });
    }

    const supabase = await createServerComponentClient();

    // Get monthly expenses - try database function first, fallback to direct query
    let monthlyExpenses = null;
    let monthlyError = null;

    try {
      const { data, error } = await supabase
        .rpc('get_monthly_rsa_expenses', {
          p_start_date: params.startDate || null,
          p_end_date: params.endDate || null,
          p_cleaner_id: params.cleanerId || null
        });
      
      monthlyExpenses = data;
      monthlyError = error;
    } catch (error) {
      console.log('Database function not available, using fallback query');
      monthlyError = error;
    }

    // Fallback: Use direct query if function doesn't exist
    if (monthlyError && (monthlyError as { code?: string }).code === 'PGRST202') {
      console.log('Using fallback query for monthly expenses');
      
      let query = supabase
        .from('rsa_laundry_expenses_detailed')
        .select('*')
        .order('service_date', { ascending: true });

      if (params.startDate) {
        query = query.gte('service_date', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('service_date', params.endDate);
      }
      if (params.cleanerId) {
        query = query.eq('cleaner_id', params.cleanerId);
      }

      const { data: expenses, error: expensesError } = await query;

      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch monthly expenses',
          details: expensesError 
        }, { status: 500 });
      }

      // Calculate monthly breakdown manually
      monthlyExpenses = calculateMonthlyBreakdown(expenses || []);
    } else if (monthlyError) {
      console.error('Error fetching monthly expenses:', monthlyError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch monthly expenses',
        details: monthlyError 
      }, { status: 500 });
    }

    // Get running totals if no specific date range
    let runningTotals = null;
    if (!params.startDate && !params.endDate) {
      const currentYear = new Date().getFullYear();
      
      try {
        const { data: totals, error: totalsError } = await supabase
          .rpc('get_rsa_expense_totals', { p_year: currentYear });

        if (!totalsError) {
          runningTotals = totals;
        }
      } catch {
        console.log('Running totals function not available, calculating manually');
        // Calculate running totals manually
        runningTotals = calculateRunningTotals(monthlyExpenses || []);
      }
    }

    // Get cleaner performance
    let cleanerPerformance = null;
    try {
      const { data, error } = await supabase
        .rpc('get_cleaner_monthly_performance', {
          p_start_date: params.startDate || null,
          p_end_date: params.endDate || null
        });

      if (!error) {
        cleanerPerformance = data;
      } else {
        console.log('Cleaner performance function not available, calculating manually');
        cleanerPerformance = calculateCleanerPerformance(monthlyExpenses || []);
      }
    } catch {
      console.log('Cleaner performance function not available, calculating manually');
      cleanerPerformance = calculateCleanerPerformance(monthlyExpenses || []);
    }

    // Get summary if date range is provided
    let summary = null;
    if (params.startDate && params.endDate) {
      try {
        const { data: summaryData, error: summaryError } = await supabase
          .rpc('get_expense_summary', {
            p_start_date: params.startDate,
            p_end_date: params.endDate
          });

        if (!summaryError && summaryData && summaryData.length > 0) {
          summary = summaryData[0];
        }
      } catch {
        console.log('Summary function not available, calculating manually');
        summary = calculateExpenseSummary(monthlyExpenses || []);
      }
    }

    const result = {
      monthlyExpenses: monthlyExpenses || [],
      runningTotals: runningTotals || [],
      cleanerPerformance: cleanerPerformance || [],
      summary: summary,
      params: params,
      generatedAt: new Date().toISOString()
    };

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    // Handle CSV export
    if (params.format === 'csv') {
      const csvData = generateCSV(result);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="rsa-laundry-expenses-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: result,
      cached: false 
    });

  } catch (error) {
    console.error('Error in monthly expenses API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

function generateCSV(data: MonthlyExpenseData): string {
  const headers = [
    'Month/Year',
    'Total Expenses (R)',
    'Total Days',
    'Average Daily Payment (R)',
    'Cleaner Count',
    'Cleaner Name',
    'Service Date',
    'Daily Payment (R)',
    'Is Paid',
    'Payment Date',
    'Notes'
  ];

  const rows: string[] = [headers.join(',')];

  data.monthlyExpenses.forEach((month: MonthlyExpense) => {
    if (data.params.includeDetails && month.expenses) {
      month.expenses.forEach((expense: Expense) => {
        const row = [
          month.month_year,
          month.total_expenses,
          month.total_days,
          month.average_daily_payment,
          month.cleaner_count,
          `"${expense.cleaner_name}"`,
          expense.service_date,
          expense.daily_payment_amount,
          expense.is_paid ? 'Yes' : 'No',
          expense.payment_date || '',
          `"${expense.notes || ''}"`
        ];
        rows.push(row.join(','));
      });
    } else {
      const row = [
        month.month_year,
        month.total_expenses,
        month.total_days,
        month.average_daily_payment,
        month.cleaner_count,
        '',
        '',
        '',
        '',
        '',
        ''
      ];
      rows.push(row.join(','));
    }
  });

  return rows.join('\n');
}

// Helper functions for fallback calculations
function calculateMonthlyBreakdown(expenses: Expense[]) {
  const monthlyData: Record<string, MonthlyExpense> = {};

  expenses.forEach(expense => {
    const monthYear = expense.service_date.slice(0, 7); // YYYY-MM format
    
    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = {
        month_year: monthYear,
        total_expenses: 0,
        total_days: 0,
        average_daily_payment: 0,
        cleaner_count: 0,
        expenses: []
      };
    }

    const monthData = monthlyData[monthYear];
    if (monthData) {
      monthData.total_expenses += expense.daily_payment_amount || 0;
      monthData.total_days += 1;
      monthData.expenses?.push({
        id: expense.id,
        service_date: expense.service_date,
        daily_payment_amount: expense.daily_payment_amount,
        cleaner_name: expense.cleaner_name,
        cleaner_id: expense.cleaner_id,
        is_paid: expense.is_paid,
        payment_date: expense.payment_date,
        service_description: expense.service_description,
        notes: expense.notes
      });
    }
  });

  // Calculate averages and cleaner counts
  Object.values(monthlyData).forEach((month: MonthlyExpense) => {
    month.average_daily_payment = month.total_days > 0 ? month.total_expenses / month.total_days : 0;
    month.cleaner_count = new Set(month.expenses?.map((e: Expense) => e.cleaner_name) || []).size;
  });

  return Object.values(monthlyData).sort((a: MonthlyExpense, b: MonthlyExpense) => b.month_year.localeCompare(a.month_year));
}

function calculateRunningTotals(monthlyExpenses: MonthlyExpense[]) {
  const monthlyTotals = monthlyExpenses.map((month: MonthlyExpense) => ({
    month_year: month.month_year,
    monthly_total: month.total_expenses,
    monthly_days: month.total_days
  }));

  let runningTotal = 0;
  const yearToDateTotal = monthlyTotals.reduce((sum, month) => sum + month.monthly_total, 0);
  const yearToDateDays = monthlyTotals.reduce((sum, month) => sum + month.monthly_days, 0);

  return monthlyTotals.map((month) => {
    runningTotal += month.monthly_total;
    return {
      month_year: month.month_year,
      monthly_total: month.monthly_total,
      running_total: runningTotal,
      year_to_date_total: yearToDateTotal,
      monthly_average: month.monthly_days > 0 ? month.monthly_total / month.monthly_days : 0,
      year_to_date_average: yearToDateDays > 0 ? yearToDateTotal / yearToDateDays : 0
    };
  });
}

function calculateCleanerPerformance(monthlyExpenses: MonthlyExpense[]) {
  const performance: Record<string, unknown> = {};

  monthlyExpenses.forEach((month: MonthlyExpense) => {
    month.expenses?.forEach((expense: Expense) => {
      const key = `${expense.cleaner_id}-${month.month_year}`;
      
      if (!performance[key]) {
        performance[key] = {
          cleaner_id: expense.cleaner_id,
          cleaner_name: expense.cleaner_name,
          month_year: month.month_year,
          total_payments: 0,
          total_days: 0,
          average_daily_payment: 0,
          is_paid_count: 0,
          unpaid_count: 0
        };
      }

      const perf = performance[key] as { total_payments: number; total_days: number; is_paid_count: number; unpaid_count: number };
      perf.total_payments += expense.daily_payment_amount || 0;
      perf.total_days += 1;
      
      if (expense.is_paid) {
        perf.is_paid_count += 1;
      } else {
        perf.unpaid_count += 1;
      }
    });
  });

  // Calculate averages
  Object.values(performance).forEach((perf: unknown) => {
    const p = perf as { total_days: number; total_payments: number; average_daily_payment: number };
    p.average_daily_payment = p.total_days > 0 ? p.total_payments / p.total_days : 0;
  });

  return Object.values(performance).sort((a: unknown, b: unknown) => {
    const perfA = a as { month_year: string; total_payments: number };
    const perfB = b as { month_year: string; total_payments: number };
    if (perfA.month_year !== perfB.month_year) {
      return perfB.month_year.localeCompare(perfA.month_year);
    }
    return perfB.total_payments - perfA.total_payments;
  });
}

function calculateExpenseSummary(monthlyExpenses: MonthlyExpense[]) {
  let totalExpenses = 0;
  let totalDays = 0;
  const uniqueCleaners = new Set<string>();
  let paidExpenses = 0;
  let unpaidExpenses = 0;
  let paidDays = 0;
  let unpaidDays = 0;

  monthlyExpenses.forEach((month: MonthlyExpense) => {
    month.expenses?.forEach((expense: Expense) => {
      totalExpenses += expense.daily_payment_amount || 0;
      totalDays += 1;
      uniqueCleaners.add(expense.cleaner_id);

      if (expense.is_paid) {
        paidExpenses += expense.daily_payment_amount || 0;
        paidDays += 1;
      } else {
        unpaidExpenses += expense.daily_payment_amount || 0;
        unpaidDays += 1;
      }
    });
  });

  return {
    total_expenses: totalExpenses,
    total_days: totalDays,
    average_daily_payment: totalDays > 0 ? totalExpenses / totalDays : 0,
    unique_cleaners: uniqueCleaners.size,
    paid_expenses: paidExpenses,
    unpaid_expenses: unpaidExpenses,
    paid_days: paidDays,
    unpaid_days: unpaidDays
  };
}

// Clear cache endpoint (for admin use)
export async function DELETE() {
  try {
    cache.clear();
    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to clear cache' 
    }, { status: 500 });
  }
}
