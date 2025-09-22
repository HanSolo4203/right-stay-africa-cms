import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    // Build date filter
    // let dateFilter = '';
    // if (month) {
    //   const startDate = `${month}-01`;
    //   const endDate = `${month}-31`;
    //   dateFilter = `AND service_date >= '${startDate}' AND service_date <= '${endDate}'`;
    // }

    // Get monthly expense totals
    const { data: monthlyExpenses, error: monthlyError } = await supabase
      .from('rsa_laundry_expenses_detailed')
      .select('*')
      .order('service_date', { ascending: true });

    if (monthlyError) {
      console.error('Error fetching monthly expenses:', monthlyError);
      return NextResponse.json({ success: false, error: 'Failed to fetch monthly expenses', details: monthlyError }, { status: 500 });
    }

    // Calculate statistics
    const stats = calculateRSAStats(monthlyExpenses || [], month);

    // Debug logging
    console.log('RSA Laundry Stats API Debug:');
    console.log('Month filter:', month);
    console.log('Total expenses found:', monthlyExpenses?.length || 0);
    console.log('Filtered expenses for month:', stats.currentMonth.totalDays);
    console.log('Sample expenses:', monthlyExpenses?.slice(0, 3));

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in RSA laundry stats API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

function calculateRSAStats(expenses: unknown[], monthFilter?: string | null) {
  // Filter by month if provided
  let filteredExpenses = expenses;
  if (monthFilter) {
    const startDate = new Date(`${monthFilter}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    filteredExpenses = expenses.filter((expense: unknown) => {
      const exp = expense as { service_date: string };
      const expenseDate = new Date(exp.service_date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }

  // Calculate basic stats
  const totalExpenses = filteredExpenses.reduce((sum: number, expense: unknown) => sum + ((expense as { daily_payment_amount?: number }).daily_payment_amount || 0), 0);
  const totalDays = filteredExpenses.length;
  const averageDailyPayment = totalDays > 0 ? totalExpenses / totalDays : 0;

  // Group by month for monthly breakdown
  const monthlyBreakdown = expenses.reduce((acc: Record<string, unknown>, expense: unknown) => {
    const exp = expense as { service_date: string; daily_payment_amount?: number };
    const date = new Date(exp.service_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        totalExpenses: 0,
        totalDays: 0,
        averagePayment: 0,
        expenses: []
      };
    }

    const monthData = acc[monthKey] as { totalExpenses: number; totalDays: number; expenses: unknown[] };
    monthData.totalExpenses += exp.daily_payment_amount || 0;
    monthData.totalDays += 1;
    monthData.expenses.push(expense);
    
    return acc;
  }, {} as Record<string, unknown>);

  // Calculate averages for each month
  Object.values(monthlyBreakdown).forEach((month: unknown) => {
    const m = month as { totalDays: number; totalExpenses: number; averagePayment: number };
    m.averagePayment = m.totalDays > 0 ? m.totalExpenses / m.totalDays : 0;
  });

  // Cleaner performance metrics
  const cleanerStats = filteredExpenses.reduce((acc: Record<string, unknown>, expense: unknown) => {
    const exp = expense as { cleaner_id: string; daily_payment_amount?: number };
    const cleanerId = exp.cleaner_id;
    const cleanerName = (expense as { cleaner_name: string }).cleaner_name;
    
    if (!acc[cleanerId]) {
      acc[cleanerId] = {
        cleaner_id: cleanerId,
        cleaner_name: cleanerName,
        totalDays: 0,
        totalPayments: 0,
        averagePayment: 0
      };
    }
    
    const cleanerData = acc[cleanerId] as { totalDays: number; totalPayments: number };
    cleanerData.totalDays += 1;
    cleanerData.totalPayments += exp.daily_payment_amount || 0;
    
    return acc;
  }, {} as Record<string, unknown>);

  // Calculate averages for each cleaner
  Object.values(cleanerStats).forEach((cleaner: unknown) => {
    const c = cleaner as { totalDays: number; totalPayments: number; averagePayment: number };
    c.averagePayment = c.totalDays > 0 ? c.totalPayments / c.totalDays : 0;
  });

  // Year-to-date totals (current year)
  const currentYear = new Date().getFullYear();
  const yearToDateExpenses = expenses.filter((expense: unknown) => {
    const exp = expense as { service_date: string };
    const expenseDate = new Date(exp.service_date);
    return expenseDate.getFullYear() === currentYear;
  });

  const yearToDateTotal = yearToDateExpenses.reduce((sum: number, expense: unknown) => sum + ((expense as { daily_payment_amount?: number }).daily_payment_amount || 0), 0);
  const yearToDateDays = yearToDateExpenses.length;

  return {
    currentMonth: {
      totalExpenses,
      totalDays,
      averageDailyPayment
    },
    monthlyBreakdown: Object.values(monthlyBreakdown).sort((a: unknown, b: unknown) => {
      const monthA = a as { month: string };
      const monthB = b as { month: string };
      return monthA.month.localeCompare(monthB.month);
    }),
    cleanerPerformance: Object.values(cleanerStats).sort((a: unknown, b: unknown) => {
      const cleanerA = a as { totalPayments: number };
      const cleanerB = b as { totalPayments: number };
      return cleanerB.totalPayments - cleanerA.totalPayments;
    }),
    yearToDate: {
      totalExpenses: yearToDateTotal,
      totalDays: yearToDateDays,
      averageDailyPayment: yearToDateDays > 0 ? yearToDateTotal / yearToDateDays : 0
    }
  };
}
