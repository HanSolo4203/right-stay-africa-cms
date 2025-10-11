/**
 * CSV Column Mapping Configuration
 * 
 * Customize these mappings to match your CSV file format.
 * Add all possible column names that your CSV might use for each field.
 * The system will try each variant until it finds a match (case-insensitive).
 */

export const CSV_COLUMN_MAPPINGS = {
  // Property identifier - the uplisting_id from cached_properties
  property_id: [
    'property_id',
    'uplisting_id',
    'property id',
    'propertyid',
    'listing_id',
    'listingid',
    'listing id',
    'property',
    'unit_id',
    'unit id',
    // Add your CSV column name here:
    // 'your_property_column_name',
  ],

  // Unique booking reference number
  booking_reference: [
    'confirmation code',
    'confirmation_code',
    'confirmationcode',
    'booking_reference',
    'reference',
    'booking ref',
    'booking_ref',
    'bookingref',
    'confirmation_number',
    'confirmation number',
    'confirmation',
    'booking_number',
    'booking number',
    'reservation_id',
    'reservation id',
    'reservation',
    // Add your CSV column name here:
    // 'your_booking_ref_column_name',
  ],

  // Guest name
  guest_name: [
    'guest_name',
    'guest name',
    'guestname',
    'guest',
    'name',
    'customer_name',
    'customer name',
    'customer',
    'client_name',
    'client name',
    'client',
    // Add your CSV column name here:
    // 'your_guest_name_column',
  ],

  // Guest email
  guest_email: [
    'guest_email',
    'guest email',
    'guestemail',
    'email',
    'customer_email',
    'customer email',
    'contact_email',
    'contact email',
    // Add your CSV column name here:
    // 'your_guest_email_column',
  ],

  // Guest phone
  guest_phone: [
    'guest_phone',
    'guest phone',
    'guestphone',
    'phone',
    'telephone',
    'mobile',
    'contact_phone',
    'contact phone',
    'customer_phone',
    'customer phone',
    // Add your CSV column name here:
    // 'your_guest_phone_column',
  ],

  // Check-in date
  check_in_date: [
    'check_in_date',
    'check_in',
    'checkin_date',
    'checkin',
    'check in date',
    'check in',
    'arrival_date',
    'arrival date',
    'arrival',
    'start_date',
    'start date',
    'from_date',
    'from date',
    'from',
    // Add your CSV column name here:
    // 'your_checkin_column',
  ],

  // Check-out date
  check_out_date: [
    'check_out_date',
    'check_out',
    'checkout_date',
    'checkout',
    'check out date',
    'check out',
    'departure_date',
    'departure date',
    'departure',
    'end_date',
    'end date',
    'to_date',
    'to date',
    'to',
    // Add your CSV column name here:
    // 'your_checkout_column',
  ],

  // Total accommodation amount
  accommodation_total: [
    'accommodation_total',
    'accommodation total',
    'accommodation',
    'total',
    'amount',
    'total_amount',
    'total amount',
    'subtotal',
    'sub_total',
    'sub total',
    'revenue',
    'booking_total',
    'booking total',
    'base_price',
    'base price',
    'nightly_rate',
    'nightly rate',
    'room_rate',
    'room rate',
    // Add your CSV column name here:
    // 'your_accommodation_column',
  ],

  // Discount amount
  discount_amount: [
    'discount_amount',
    'discount amount',
    'discount',
    'discounts',
    'promotion',
    'promo',
    'coupon',
    'deduction',
    // Add your CSV column name here:
    // 'your_discount_column',
  ],

  // Extra charges
  extra_charges: [
    'extra_charges',
    'extra charges',
    'extras',
    'additional_charges',
    'additional charges',
    'add_ons',
    'add ons',
    'surcharges',
    'surcharge',
    // Add your CSV column name here:
    // 'your_extras_column',
  ],

  // Cleaning fee
  cleaning_fee: [
    'cleaning_fee',
    'cleaning fee',
    'cleaning',
    'cleaning_charge',
    'cleaning charge',
    'housekeeping',
    'housekeeping_fee',
    'housekeeping fee',
    // Add your CSV column name here:
    // 'your_cleaning_column',
  ],

  // Booking taxes
  booking_taxes: [
    'booking_taxes',
    'booking taxes',
    'taxes',
    'tax',
    'vat',
    'sales_tax',
    'sales tax',
    'tourism_tax',
    'tourism tax',
    'occupancy_tax',
    'occupancy tax',
    // Add your CSV column name here:
    // 'your_tax_column',
  ],

  // Channel commission
  channel_commission: [
    'channel_commission',
    'channel commission',
    'commission',
    'platform_commission',
    'platform commission',
    'platform_fee',
    'platform fee',
    'service_fee',
    'service fee',
    'host_service_fee',
    'host service fee',
    // Add your CSV column name here:
    // 'your_commission_column',
  ],

  // Commission tax (VAT on commission)
  commission_tax: [
    'commission_tax',
    'commission tax',
    'commissiontax',
    'tax_on_commission',
    'tax on commission',
    'commission_vat',
    'commission vat',
    'vat_on_commission',
    'vat on commission',
    // Add your CSV column name here:
    // 'your_commission_tax_column',
  ],

  // Payment processing fee
  payment_processing_fee: [
    'payment_processing_fee',
    'payment processing fee',
    'processing_fee',
    'processing fee',
    'transaction_fee',
    'transaction fee',
    'payment_fee',
    'payment fee',
    'gateway_fee',
    'gateway fee',
    // Add your CSV column name here:
    // 'your_processing_fee_column',
  ],

  // Booking channel/source
  channel_name: [
    'channel_name',
    'channel name',
    'channel',
    'source',
    'platform',
    'booking_source',
    'booking source',
    'booking_channel',
    'booking channel',
    'listing_site',
    'listing site',
    'ota',
    'origin',
    'uplisting',
    // Add your CSV column name here:
    // 'your_channel_column',
  ],

  // Booking status
  booking_status: [
    'booking_status',
    'booking status',
    'status',
    'state',
    'reservation_status',
    'reservation status',
    // Add your CSV column name here:
    // 'your_status_column',
  ],

  // Additional notes
  notes: [
    'notes',
    'note',
    'comments',
    'comment',
    'description',
    'remarks',
    'remark',
    'memo',
    'message',
    // Add your CSV column name here:
    // 'your_notes_column',
  ],
};

/**
 * Find the actual column name in a CSV row that matches one of the expected names
 */
export function findColumn(row: { [key: string]: string }, possibleNames: string[]): string | null {
  const rowKeys = Object.keys(row).map(k => k.toLowerCase().trim());
  
  for (const possibleName of possibleNames) {
    const normalizedName = possibleName.toLowerCase().trim();
    const found = rowKeys.find(key => key === normalizedName);
    if (found) {
      // Return the original key from the row (preserving case)
      return Object.keys(row).find(k => k.toLowerCase().trim() === found) || null;
    }
  }
  
  return null;
}

/**
 * Get value from row using column mappings
 */
export function getColumnValue(row: { [key: string]: string }, field: keyof typeof CSV_COLUMN_MAPPINGS): string {
  const possibleColumns = CSV_COLUMN_MAPPINGS[field];
  const columnName = findColumn(row, possibleColumns);
  return columnName ? row[columnName]?.trim() || '' : '';
}

/**
 * Auto-detect column mappings from CSV headers
 * Returns a mapping of our field names to actual CSV column names
 */
export function detectColumnMappings(headers: string[]): { [key: string]: string | null } {
  const detected: { [key: string]: string | null } = {};
  
  for (const [field, possibleNames] of Object.entries(CSV_COLUMN_MAPPINGS)) {
    detected[field] = findColumn(
      Object.fromEntries(headers.map(h => [h, ''])),
      possibleNames
    );
  }
  
  return detected;
}

