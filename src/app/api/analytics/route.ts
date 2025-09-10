import { NextRequest } from 'next/server';
import { cleaningSessionsApi, apartmentsApi, cleanersApi } from '@/lib/database';
import { 
  analyticsQuerySchema
} from '@/lib/validations';
import {
  successResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';

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

    // Get all data
    const [sessions, apartments, cleaners] = await Promise.all([
      cleaningSessionsApi.getAll(),
      apartmentsApi.getAll(),
      cleanersApi.getAll()
    ]);

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

    // Calculate summary metrics
    const totalCleanings = filteredSessions.length;
    const activeApartments = apartments.length;
    const activeCleaners = cleaners.length;
    const averageCleaningsPerApartment = activeApartments > 0 ? (totalCleanings / activeApartments).toFixed(1) : '0';

    // Cleanings by apartment
    const cleaningsByApartment = apartments.map(apartment => {
      const apartmentCleanings = filteredSessions.filter(session => 
        session.apartment_number === apartment.apartment_number
      );
      return {
        apartment_number: apartment.apartment_number,
        owner_name: apartment.owner_name,
        cleaning_count: apartmentCleanings.length,
        apartment_id: apartment.id
      };
    }).sort((a, b) => b.cleaning_count - a.cleaning_count);

    // Cleaner workload distribution
    const cleanerWorkload = cleaners.map(cleaner => {
      const cleanerSessions = filteredSessions.filter(session => 
        session.cleaner_name === cleaner.name
      );
      return {
        cleaner_name: cleaner.name,
        session_count: cleanerSessions.length,
        cleaner_id: cleaner.id
      };
    }).filter(cleaner => cleaner.session_count > 0);

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
    const leastActiveApartment = cleaningsByApartment.filter(apt => apt.cleaning_count > 0).slice(-1)[0] || null;

    // Top performing cleaner
    const topCleaner = cleanerWorkload.sort((a, b) => b.session_count - a.session_count)[0] || null;

    // Invoicing data - calculate actual revenue from cleaning sessions
    const invoicingData = cleaningsByApartment.map(apartment => {
      // Get all sessions for this apartment in the filtered period
      const apartmentSessions = filteredSessions.filter(session => 
        session.apartment_number === apartment.apartment_number
      );
      
      // Calculate total amount from actual prices
      const total_amount = apartmentSessions.reduce((sum, session) => {
        const price = session.price !== null && session.price !== undefined ? session.price : 150;
        return sum + price; // Default to R150 if no price set
      }, 0);
      
      return {
        apartment_number: apartment.apartment_number,
        owner_name: apartment.owner_name,
        cleaning_count: apartment.cleaning_count,
        total_amount: total_amount,
        apartment_id: apartment.apartment_id
      };
    });

    const totalRevenue = invoicingData.reduce((sum, apt) => sum + apt.total_amount, 0);

    return successResponse({
      summary: {
        total_cleanings: totalCleanings,
        active_apartments: activeApartments,
        active_cleaners: activeCleaners,
        average_cleanings_per_apartment: averageCleaningsPerApartment,
        total_revenue: totalRevenue
      } as {
        total_cleanings: number;
        active_apartments: number;
        active_cleaners: number;
        average_cleanings_per_apartment: string;
        total_revenue: number;
      },
      cleanings_by_apartment: cleaningsByApartment,
      cleaner_workload: cleanerWorkload,
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
