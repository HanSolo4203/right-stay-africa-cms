/**
 * Owner Statement Calculation Utilities
 * 
 * This module provides utility functions for calculating owner statements
 * based on booking data and expenses, following the specified formulas:
 * 
 * GROSS REVENUE CALCULATION (What guest pays):
 * Gross Revenue = Accommodation Total 
 *               + Cleaning Fee 
 *               + Extra Guest Charges 
 *               + Extra Charges 
 *               + Discounts (can be negative)
 * 
 * TOTAL PAYOUT CALCULATION (What RightStay Africa receives from platform):
 * Total Payout = Gross Revenue 
 *              - Booking Taxes (paid to government, not kept)
 *              - Payment Processing Fee 
 *              - Commission 
 *              - Commission Tax
 * 
 * FINAL OWNER PAYOUT CALCULATION:
 * Owner Payout = Total Payout (from platform)
 *              - Cleaning Fees (RightStay expense)
 *              - Welcome Pack (RightStay expense)
 *              - Other Expenses (RightStay expenses)
 *              - RightStay Africa Commission (management fee)
 * 
 * CRITICAL NOTES:
 * - Booking Taxes: Guest pays them BUT they go to government (deducted from payout)
 * - Cleaning Fee: INCLUDED in Total Payout (guest pays it)
 * - Cleaning Fee: Then DEDUCTED as RightStay expense for owner payout
 * - Management Fee: NOT in Total Payout (calculated separately for owner statements)
 */

// Types for booking data structure
export interface Booking {
  booking_id: string;
  booking_reference: string;
  property_name: string;
  owner_name: string;
  owner_email: string;
  guest_name: string;
  guest_email: string;
  channel_name: string;
  check_in_date: string;
  check_out_date: string;
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
  total_payout: number; // What RightStay receives from platform
  booking_status: string;
  booking_date: string;
  booking_notes?: string;
}

// Types for expense data structure
export interface Expense {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount_inc_tax: number;
  booking_id?: string;
  property_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Types for grouped bookings by property
export interface PropertyGroup {
  property_name: string;
  owner_name: string;
  owner_email: string;
  bookings: Booking[];
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
    total_payout: number;
    booking_count: number;
  };
}

// Types for combined expenses by type
export interface CombinedExpense {
  description: string;
  total_quantity: number;
  total_amount: number;
  bookings: string[]; // Array of booking references for this expense type
}

/**
 * Calculate gross revenue for a single booking (what guest actually pays including all taxes)
 * Formula: Gross Revenue = Accommodation Total + Cleaning Fee + Extra Charges + Discounts + Booking Taxes
 * Note: This is the TOTAL amount the guest pays
 */
export function calculateGrossRevenue(booking: Booking): number {
  const {
    accommodation_total = 0,
    discount_amount = 0,
    extra_charges = 0,
    cleaning_fee = 0,
    upsell_total = 0,
    booking_taxes = 0,
  } = booking;

  // Gross Revenue = Everything the guest pays (including taxes)
  // discount_amount can be negative (discount) or positive (surcharge)
  return (
    accommodation_total +
    discount_amount + // This handles both positive and negative discounts
    extra_charges +
    cleaning_fee +
    upsell_total +
    booking_taxes // Taxes are part of what guest pays
  );
}

/**
 * Calculate booking payout for a single booking (What RightStay receives from platform)
 * Formula: Total Payout = Gross Revenue - Booking Taxes - Payment Processing Fee - Commission - Commission Tax
 */
export function calculateBookingPayout(booking: Booking): number {
  const grossRevenue = calculateGrossRevenue(booking);
  const {
    booking_taxes = 0,
    channel_commission = 0,
    commission_tax = 0,
    payment_processing_fee = 0
  } = booking;

  // Note: All fees and taxes are stored as positive values and subtracted from gross revenue
  // Booking taxes are collected from guest but paid to government (not kept by RightStay)
  return grossRevenue - booking_taxes - payment_processing_fee - channel_commission - commission_tax;
}

/**
 * Calculate final owner payout after expenses
 * Formula: Owner Payout = Bookings Payout - Total Expenses
 */
export function calculateOwnerPayout(bookingsPayout: number, expenses: Expense[]): number {
  const totalExpenses = expenses.reduce((sum, expense) => {
    return sum + (expense.amount_inc_tax || 0);
  }, 0);

  return bookingsPayout - totalExpenses;
}

/**
 * Group bookings by property name
 * Returns an object with property names as keys and PropertyGroup objects as values
 */
export function groupBookingsByProperty(bookings: Booking[]): Record<string, PropertyGroup> {
  const grouped = bookings.reduce((acc, booking) => {
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
          payment_processing_fee: 0,
          total_payout: 0,
          booking_count: 0
        }
      };
    }
    
    // Add booking to the group
    acc[propertyKey].bookings.push(booking);
    
    // Update totals
    const totals = acc[propertyKey].totals;
    totals.nights += booking.nights || 0;
    totals.accommodation_total += booking.accommodation_total || 0;
    totals.discount_amount += booking.discount_amount || 0;
    totals.extra_charges += booking.extra_charges || 0;
    totals.cleaning_fee += booking.cleaning_fee || 0;
    totals.upsell_total += booking.upsell_total || 0;
    totals.custom_expense_total += booking.custom_expense_total || 0;
    totals.booking_taxes += booking.booking_taxes || 0;
    totals.channel_commission += booking.channel_commission || 0;
    totals.payment_processing_fee += booking.payment_processing_fee || 0;
    totals.total_payout += booking.total_payout || 0;
    totals.booking_count += 1;
    
    return acc;
  }, {} as Record<string, PropertyGroup>);

  return grouped;
}

/**
 * Combine expenses by type/description across multiple bookings
 * Groups expenses with the same description and sums their quantities and amounts
 */
export function combineExpensesByType(expenses: Expense[]): CombinedExpense[] {
  const expenseMap = new Map<string, CombinedExpense>();

  expenses.forEach(expense => {
    const key = expense.description.toLowerCase().trim();
    
    if (expenseMap.has(key)) {
      const existing = expenseMap.get(key)!;
      existing.total_quantity += expense.quantity || 0;
      existing.total_amount += expense.amount_inc_tax || 0;
      
      // Add booking reference if not already present
      if (expense.booking_id && !existing.bookings.includes(expense.booking_id)) {
        existing.bookings.push(expense.booking_id);
      }
    } else {
      expenseMap.set(key, {
        description: expense.description,
        total_quantity: expense.quantity || 0,
        total_amount: expense.amount_inc_tax || 0,
        bookings: expense.booking_id ? [expense.booking_id] : []
      });
    }
  });

  return Array.from(expenseMap.values());
}

/**
 * Calculate total gross revenue for a property group
 */
export function calculatePropertyGrossRevenue(propertyGroup: PropertyGroup): number {
  return propertyGroup.bookings.reduce((total, booking) => {
    return total + calculateGrossRevenue(booking);
  }, 0);
}

/**
 * Calculate total booking payout for a property group
 */
export function calculatePropertyBookingPayout(propertyGroup: PropertyGroup): number {
  return propertyGroup.bookings.reduce((total, booking) => {
    return total + calculateBookingPayout(booking);
  }, 0);
}

/**
 * Calculate grand totals across all properties
 */
export function calculateGrandTotals(properties: PropertyGroup[]): PropertyGroup['totals'] {
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
    totals.payment_processing_fee += property.totals.payment_processing_fee;
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
    payment_processing_fee: 0,
    total_payout: 0,
    booking_count: 0
  });
}

/**
 * Format currency for South African Rand
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
}

/**
 * Validate booking data structure
 */
export function validateBooking(booking: unknown): booking is Booking {
  return Boolean(
    booking &&
    typeof (booking as Record<string, unknown>).booking_id === 'string' &&
    typeof (booking as Record<string, unknown>).property_name === 'string' &&
    typeof (booking as Record<string, unknown>).owner_name === 'string' &&
    typeof (booking as Record<string, unknown>).accommodation_total === 'number'
  );
}

/**
 * Validate expense data structure
 */
export function validateExpense(expense: unknown): expense is Expense {
  return Boolean(
    expense &&
    typeof (expense as Record<string, unknown>).id === 'string' &&
    typeof (expense as Record<string, unknown>).description === 'string' &&
    typeof (expense as Record<string, unknown>).quantity === 'number' &&
    typeof (expense as Record<string, unknown>).unit_price === 'number' &&
    typeof (expense as Record<string, unknown>).amount_inc_tax === 'number'
  );
}
