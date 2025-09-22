import { NextRequest } from 'next/server';
import { cleaningSessionsApi, cleanersApi, settingsApi } from '@/lib/database';
import { 
  analyticsQuerySchema
} from '@/lib/validations';
import {
  successResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';

interface RSALaundryExpense {
  id: string;
  service_date: string;
  cleaner_name: string;
  daily_payment_amount: number;
  [key: string]: unknown;
}

interface Property {
  id: string;
  property_name: string;
  owner_name: string;
  owner_email?: string;
  address?: string;
  cleaner_payout?: number;
  property_category: 'apartment' | 'internal_asset';
}

interface ApartmentData {
  id: string;
  apartment_number: string;
  owner_name: string;
  owner_email?: string;
  address?: string;
  cleaner_payout?: number;
}

interface AssetData {
  id: string;
  asset_name: string;
  owner_name: string;
  owner_email?: string;
  location?: string;
  cleaner_payout?: number;
}

// GET /api/analytics - Get analytics data for dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validation = validateRequest(analyticsQuerySchema, queryParams);
    if (!validation.success) {
      return validation.error;
    }
    
    const { month, year } = validation.data;

    // Special case: expose current welcome pack fee when requested
    if (searchParams.get('welcomePackFee') === '1') {
      const fee = await settingsApi.getWelcomePackFee();
      return successResponse({ welcome_pack_fee: fee }, 'Welcome pack fee retrieved');
    }

    // Get all data
    const [sessions, cleaners] = await Promise.all([
      cleaningSessionsApi.getAll(),
      cleanersApi.getAll()
    ]);

    // Get RSA laundry expenses and properties directly from database
    let rsaExpenses: RSALaundryExpense[] = [];
    let properties: Property[] = [];
    
    try {
      // Import the RSA laundry expenses API functions directly
      const { createServerComponentClient } = await import('@/lib/supabase-server');
      const supabase = await createServerComponentClient();
      
      // Get RSA laundry expenses
      const { data: rsaExpensesData, error: rsaError } = await supabase
        .from('rsa_laundry_expenses_detailed')
        .select('*')
        .order('service_date', { ascending: false });
      
      if (!rsaError && rsaExpensesData) {
        rsaExpenses = rsaExpensesData;
      }
      
      // Get schedulable properties (apartments + internal assets)
      const [apartmentsResult, assetsResult] = await Promise.all([
        supabase
          .from('apartments')
          .select('id, apartment_number, owner_name, owner_email, address, cleaner_payout')
          .eq('is_active', true),
        supabase
          .from('internal_assets')
          .select('id, asset_name, owner_name, owner_email, location, cleaner_payout')
          .eq('is_active', true)
      ]);
      
      const apartments: ApartmentData[] = apartmentsResult.data || [];
      const assets: AssetData[] = assetsResult.data || [];
      
      // Combine apartments and assets into properties array
      properties = [
        ...apartments.map((apt: ApartmentData) => ({ 
          id: apt.id,
          property_name: apt.apartment_number,
          owner_name: apt.owner_name,
          owner_email: apt.owner_email,
          address: apt.address,
          cleaner_payout: apt.cleaner_payout,
          property_category: 'apartment' as const 
        })),
        ...assets.map((asset: AssetData) => ({ 
          id: asset.id,
          property_name: asset.asset_name,
          owner_name: asset.owner_name,
          owner_email: asset.owner_email,
          address: asset.location,
          cleaner_payout: asset.cleaner_payout,
          property_category: 'internal_asset' as const 
        }))
      ];
      
    } catch (error) {
      console.warn('Failed to fetch RSA laundry expenses or properties:', error);
    }

    // Filter sessions by month/year if provided
    let filteredSessions = sessions;
    if (month) {
      filteredSessions = sessions.filter(session => 
        session.cleaning_date.startsWith(month)
      );
    } else if (year) {
      filteredSessions = sessions.filter(session => 
        session.cleaning_date.startsWith(year)
      );
    }

    // Filter RSA expenses by month/year if provided
    let filteredRsaExpenses = rsaExpenses;
    if (month) {
      filteredRsaExpenses = rsaExpenses.filter((expense: { service_date: string }) => 
        expense.service_date.startsWith(month)
      );
    } else if (year) {
      filteredRsaExpenses = rsaExpenses.filter((expense: { service_date: string }) => 
        expense.service_date.startsWith(year)
      );
    }

    // Calculate summary metrics
    const totalCleanings = filteredSessions.length;
    const activeApartments = properties.length;
    const activeCleaners = cleaners.length;
    const averageCleaningsPerApartment = activeApartments > 0 ? (totalCleanings / activeApartments).toFixed(1) : '0';

    // Cleanings by property
    const cleaningsByApartment = properties.map((property: { id: string; property_name: string; owner_name: string }) => {
      const propertyCleanings = filteredSessions.filter(session => 
        session.apartment_number === property.property_name
      );
      return {
        apartment_number: property.property_name,
        owner_name: property.owner_name,
        cleaning_count: propertyCleanings.length,
        apartment_id: property.id
      };
    }).sort((a: { cleaning_count: number }, b: { cleaning_count: number }) => b.cleaning_count - a.cleaning_count);

    // Cleaner workload distribution - include both cleaners from multi-cleaner sessions
    // Get all unique cleaner names from sessions (both primary and secondary)
    const allCleanerNames = new Set<string>();
    filteredSessions.forEach(session => {
      if (session.cleaner_name) allCleanerNames.add(session.cleaner_name);
      if (session.cleaner_2_name) allCleanerNames.add(session.cleaner_2_name);
    });

    const cleanerWorkload = Array.from(allCleanerNames).map(cleanerName => {
      // Count sessions where this cleaner is the primary cleaner
      const primarySessions = filteredSessions.filter(session => 
        session.cleaner_name === cleanerName
      );
      
      // Count sessions where this cleaner is the secondary cleaner
      const secondarySessions = filteredSessions.filter(session => 
        session.cleaner_2_name === cleanerName
      );
      
      const totalSessions = primarySessions.length + secondarySessions.length;
      
      // Try to find the cleaner ID from the cleaners table, fallback to null
      const cleaner = cleaners.find(c => c.name === cleanerName);
      
      return {
        cleaner_name: cleanerName,
        session_count: totalSessions,
        cleaner_id: cleaner?.id || null,
        primary_sessions: primarySessions.length,
        secondary_sessions: secondarySessions.length
      };
    }).filter(cleaner => cleaner.session_count > 0);

    // Cleaner earnings calculation (based on per-property cleaner_payout) - include both cleaners from multi-cleaner sessions
    const cleanerEarnings = Array.from(allCleanerNames).map(cleanerName => {
      // Count sessions where this cleaner is the primary cleaner
      const primarySessions = filteredSessions.filter(session => 
        session.cleaner_name === cleanerName
      );
      
      // Count sessions where this cleaner is the secondary cleaner
      const secondarySessions = filteredSessions.filter(session => 
        session.cleaner_2_name === cleanerName
      );
      
      // Count RSA laundry expenses for this cleaner
      const rsaLaundrySessions = filteredRsaExpenses.filter((expense: { cleaner_name: string }) => 
        expense.cleaner_name === cleanerName
      );
      
      const totalSessions = primarySessions.length + secondarySessions.length + rsaLaundrySessions.length;
      
      // Calculate total earnings from actual fee fields in sessions
      const primaryEarnings = primarySessions.reduce((sum, session) => {
        // Use cleaner_1_fee if available, otherwise fallback to property cleaner_payout
        if (session.cleaner_1_fee != null) {
          return sum + Number(session.cleaner_1_fee);
        }
        const property = properties.find((p: { property_name: string; cleaner_payout?: number }) => p.property_name === session.apartment_number);
        const payout = property && property.cleaner_payout != null ? Number(property.cleaner_payout) : 0;
        return sum + payout;
      }, 0);
      
      const secondaryEarnings = secondarySessions.reduce((sum, session) => {
        // Use cleaner_2_fee if available, otherwise fallback to property cleaner_payout
        if (session.cleaner_2_fee != null) {
          return sum + Number(session.cleaner_2_fee);
        }
        const property = properties.find((p: { property_name: string; cleaner_payout?: number }) => p.property_name === session.apartment_number);
        const payout = property && property.cleaner_payout != null ? Number(property.cleaner_payout) : 0;
        return sum + payout;
      }, 0);
      
      // Calculate RSA laundry earnings
      const rsaLaundryEarnings = rsaLaundrySessions.reduce((sum: number, expense: { daily_payment_amount: number }) => {
        return sum + Number(expense.daily_payment_amount);
      }, 0);
      
      const totalEarnings = primaryEarnings + secondaryEarnings + rsaLaundryEarnings;
      
      // Try to find the cleaner ID from the cleaners table, fallback to null
      const cleaner = cleaners.find(c => c.name === cleanerName);
      
      return {
        cleaner_name: cleanerName,
        cleaner_id: cleaner?.id || null,
        session_count: totalSessions,
        total_earnings: totalEarnings,
        average_earnings_per_session: totalSessions > 0 ? totalEarnings / totalSessions : 0,
        primary_sessions: primarySessions.length,
        secondary_sessions: secondarySessions.length,
        cleaning_earnings: primaryEarnings + secondaryEarnings,
        rsa_laundry_earnings: rsaLaundryEarnings,
        rsa_laundry_sessions: rsaLaundrySessions.length
      };
    }).filter(cleaner => cleaner.session_count > 0).sort((a, b) => b.total_earnings - a.total_earnings);

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStr = date.toISOString().slice(0, 7); // YYYY-MM format
      
      const monthSessions = sessions.filter(session => 
        session.cleaning_date.startsWith(monthStr)
      );
      
      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        month_key: monthStr,
        cleaning_count: monthSessions.length,
        unique_apartments: new Set(monthSessions.map(s => s.apartment_number)).size,
        unique_cleaners: new Set(monthSessions.map(s => s.cleaner_name)).size
      });
    }

    // Most/least active apartments
    const mostActiveApartment = cleaningsByApartment[0] || null;
    const leastActiveApartment = cleaningsByApartment.filter((apt: { cleaning_count: number }) => apt.cleaning_count > 0).slice(-1)[0] || null;

    // Top performing cleaner
    const topCleaner = cleanerWorkload.sort((a, b) => b.session_count - a.session_count)[0] || null;

    // Invoicing data - calculate actual revenue from cleaning sessions
    const invoicingData = cleaningsByApartment.map((property: { apartment_number: string; owner_name: string; cleaning_count: number; apartment_id: string }) => {
      // Get all sessions for this property in the filtered period
      const propertySessions = filteredSessions.filter(session => 
        session.apartment_number === property.apartment_number
      );
      
      // Calculate total amount from actual prices (customer-facing price only)
      const total_amount = propertySessions.reduce((sum, session) => {
        const price = session.price !== null && session.price !== undefined ? session.price : 150;
        return sum + price; // Default to R150 if no price set
      }, 0);
      
      return {
        apartment_number: property.apartment_number,
        owner_name: property.owner_name,
        cleaning_count: property.cleaning_count,
        total_amount: total_amount,
        apartment_id: property.apartment_id
      };
    });

    const totalRevenue = invoicingData.reduce((sum: number, apt: { total_amount: number }) => sum + apt.total_amount, 0);
    
    // Total cleaner payouts from cleaning sessions using actual fee fields
    const totalCleanerPayoutsFromSessions = filteredSessions.reduce((sum: number, session: { total_cleaning_fee?: number; cleaner_1_fee?: number; apartment_number: string }) => {
      let sessionPayout = 0;
      
      // Use total_cleaning_fee if available (for multi-cleaner sessions)
      if (session.total_cleaning_fee != null) {
        sessionPayout = Number(session.total_cleaning_fee);
      } else if (session.cleaner_1_fee != null) {
        // Use cleaner_1_fee for single cleaner sessions
        sessionPayout = Number(session.cleaner_1_fee);
      } else {
        // Fallback to property cleaner_payout
        const property = properties.find((p: { property_name: string; cleaner_payout?: number }) => p.property_name === session.apartment_number);
        const payout = property && property.cleaner_payout != null ? Number(property.cleaner_payout) : 0;
        sessionPayout = payout;
      }
      
      return sum + sessionPayout;
    }, 0);
    
    // Total cleaner payouts from RSA laundry expenses
    const totalCleanerPayoutsFromRSA = filteredRsaExpenses.reduce((sum: number, expense: { daily_payment_amount: number }) => {
      return sum + Number(expense.daily_payment_amount);
    }, 0);
    
    // Total cleaner payouts (cleaning sessions + RSA laundry services)
    const totalCleanerPayouts = totalCleanerPayoutsFromSessions + totalCleanerPayoutsFromRSA;
    const netRevenue = totalRevenue - totalCleanerPayouts;

    return successResponse({
      summary: {
        total_cleanings: totalCleanings,
        active_apartments: activeApartments,
        active_cleaners: activeCleaners,
        average_cleanings_per_apartment: averageCleaningsPerApartment,
        total_revenue: totalRevenue,
        net_revenue: netRevenue
      } as {
        total_cleanings: number;
        active_apartments: number;
        active_cleaners: number;
        average_cleanings_per_apartment: string;
        total_revenue: number;
        net_revenue: number;
      },
      cleanings_by_apartment: cleaningsByApartment,
      cleaner_workload: cleanerWorkload,
      cleaner_earnings: cleanerEarnings,
      monthly_trends: monthlyTrends,
      insights: {
        most_active_apartment: mostActiveApartment,
        least_active_apartment: leastActiveApartment,
        top_cleaner: topCleaner
      },
      invoicing_data: invoicingData,
      date_range: {
        month,
        year,
        total_sessions: sessions.length
      }
    }, 'Analytics data retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'fetching analytics data');
  }
}
