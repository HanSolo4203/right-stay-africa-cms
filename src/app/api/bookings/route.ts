import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const { searchParams } = new URL(request.url);
    
    // Extract filter parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const apartmentId = searchParams.get('apartmentId');
    const channelId = searchParams.get('channelId');
    const status = searchParams.get('status');
    const groupBy = searchParams.get('groupBy') || 'property'; // 'property' or 'booking'

    // Build the query
    let query = supabase
      .from('owner_statements_view')
      .select('*')
      .order('check_in_date', { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte('check_in_date', startDate);
    }
    if (endDate) {
      query = query.lte('check_out_date', endDate);
    }
    if (apartmentId) {
      query = query.eq('apartment_id', apartmentId);
    }
    if (channelId) {
      query = query.eq('channel_id', channelId);
    }
    if (status) {
      query = query.eq('booking_status', status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    // Process data based on grouping preference
    let processedData;
    if (groupBy === 'property') {
      processedData = groupBookingsByProperty(bookings || []);
    } else {
      processedData = {
        bookings: bookings || [],
        summary: calculateBookingSummary(bookings || [])
      };
    }

    return NextResponse.json({
      success: true,
      data: processedData,
      meta: {
        totalBookings: bookings?.length || 0,
        groupBy,
        filters: {
          startDate,
          endDate,
          apartmentId,
          channelId,
          status
        }
      }
    });

  } catch (error) {
    console.error('Error in bookings API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface BookingRecord {
  property_name: string;
  owner_name: string;
  owner_email: string;
  nights: number;
  accommodation_total: number;
  discount_amount: number;
  extra_charges: number;
  cleaning_fee: number;
  upsell_total: number;
  custom_expense_total: number;
  booking_taxes: number;
  channel_commission: number;
  payment_processing_fee: number;
  commission_tax: number;
  net_revenue: number;
  total_payout: number;
  [key: string]: unknown;
}

// Helper function to group bookings by property
function groupBookingsByProperty(bookings: BookingRecord[]) {
  const grouped = bookings.reduce((acc: Record<string, {
    property_name: string;
    owner_name: string;
    owner_email: string;
    bookings: BookingRecord[];
    totals: {
      nights: number;
      accommodation_total: number;
      discount_amount: number;
      extra_charges: number;
      cleaning_fee: number;
      upsell_total: number;
      custom_expense_total: number;
      booking_taxes: number;
      channel_commission: number;
      commission_tax: number;
      payment_processing_fee: number;
      net_revenue: number;
      total_payout: number;
      booking_count: number;
    };
  }>, booking) => {
    const propertyKey = booking.property_name;
    
    if (!acc[propertyKey]) {
      acc[propertyKey] = {
        property_name: booking.property_name,
        owner_name: booking.owner_name,
        owner_email: booking.owner_email,
        bookings: [],
        totals: {
          nights: 0,
          accommodation_total: 0,
          discount_amount: 0,
          extra_charges: 0,
          cleaning_fee: 0,
          upsell_total: 0,
          custom_expense_total: 0,
          booking_taxes: 0,
          channel_commission: 0,
          commission_tax: 0,
          payment_processing_fee: 0,
          net_revenue: 0,
          total_payout: 0,
          booking_count: 0
        }
      };
    }
    
    acc[propertyKey].bookings.push(booking);
    acc[propertyKey].totals.nights += booking.nights || 0;
    acc[propertyKey].totals.accommodation_total += booking.accommodation_total || 0;
    acc[propertyKey].totals.discount_amount += booking.discount_amount || 0;
    acc[propertyKey].totals.extra_charges += booking.extra_charges || 0;
    acc[propertyKey].totals.cleaning_fee += booking.cleaning_fee || 0;
    acc[propertyKey].totals.upsell_total += booking.upsell_total || 0;
    acc[propertyKey].totals.custom_expense_total += booking.custom_expense_total || 0;
    acc[propertyKey].totals.booking_taxes += booking.booking_taxes || 0;
    acc[propertyKey].totals.channel_commission += booking.channel_commission || 0;
    acc[propertyKey].totals.commission_tax += booking.commission_tax || 0;
    acc[propertyKey].totals.payment_processing_fee += booking.payment_processing_fee || 0;
    acc[propertyKey].totals.net_revenue += booking.net_revenue || 0;
    acc[propertyKey].totals.total_payout += booking.total_payout || 0;
    acc[propertyKey].totals.booking_count += 1;
    
    return acc;
  }, {});

  return {
    properties: Object.values(grouped),
    grandTotals: calculateGrandTotals(Object.values(grouped))
  };
}

interface PropertyGroup {
  totals: {
    nights: number;
    accommodation_total: number;
    discount_amount: number;
    extra_charges: number;
    cleaning_fee: number;
    upsell_total: number;
    custom_expense_total: number;
    booking_taxes: number;
    channel_commission: number;
    payment_processing_fee: number;
    commission_tax: number;
    net_revenue: number;
    total_payout: number;
    booking_count: number;
  };
}

// Helper function to calculate grand totals across all properties
function calculateGrandTotals(properties: PropertyGroup[]) {
  return properties.reduce((totals, property) => {
    totals.nights += property.totals.nights;
    totals.accommodation_total += property.totals.accommodation_total;
    totals.discount_amount += property.totals.discount_amount;
    totals.extra_charges += property.totals.extra_charges;
    totals.cleaning_fee += property.totals.cleaning_fee;
    totals.upsell_total += property.totals.upsell_total;
    totals.custom_expense_total += property.totals.custom_expense_total;
    totals.booking_taxes += property.totals.booking_taxes;
    totals.channel_commission += property.totals.channel_commission;
    totals.commission_tax += property.totals.commission_tax;
    totals.payment_processing_fee += property.totals.payment_processing_fee;
    totals.net_revenue += property.totals.net_revenue;
    totals.total_payout += property.totals.total_payout;
    totals.booking_count += property.totals.booking_count;
    return totals;
  }, {
    nights: 0,
    accommodation_total: 0,
    discount_amount: 0,
    extra_charges: 0,
    cleaning_fee: 0,
    upsell_total: 0,
    custom_expense_total: 0,
    booking_taxes: 0,
    channel_commission: 0,
    commission_tax: 0,
    payment_processing_fee: 0,
    net_revenue: 0,
    total_payout: 0,
    booking_count: 0
  });
}

// Helper function to calculate booking summary
function calculateBookingSummary(bookings: BookingRecord[]) {
  return bookings.reduce((summary, booking) => {
    summary.totalNights += booking.nights || 0;
    summary.totalRevenue += booking.accommodation_total || 0;
    summary.totalPayout += booking.total_payout || 0;
    summary.totalCommission += booking.channel_commission || 0;
    summary.totalCleaningFees += booking.cleaning_fee || 0;
    summary.totalUpsells += booking.upsell_total || 0;
    summary.totalExpenses += booking.custom_expense_total || 0;
    summary.bookingCount += 1;
    return summary;
  }, {
    totalNights: 0,
    totalRevenue: 0,
    totalPayout: 0,
    totalCommission: 0,
    totalCleaningFees: 0,
    totalUpsells: 0,
    totalExpenses: 0,
    bookingCount: 0
  });
}
