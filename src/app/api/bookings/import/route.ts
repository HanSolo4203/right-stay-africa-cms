import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getColumnValue } from '@/lib/csv-column-mappings';

interface CSVRow {
  [key: string]: string;
}

interface BookingData {
  booking_reference: string;
  property_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  accommodation_total: number;
  discount_amount?: number;
  extra_charges?: number;
  cleaning_fee?: number;
  booking_taxes?: number;
  channel_commission?: number;
  commission_tax?: number;
  payment_processing_fee?: number;
  channel_name?: string;
  booking_status?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Use service role client to bypass RLS for import operations
    const supabase = createServiceRoleClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read and parse CSV
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header row and 0-indexing

      try {
        // Extract and validate booking data
        const bookingData = extractBookingData(row, rowNumber);
        
        if (!bookingData) {
          skipped++;
          continue;
        }

        // Get property details from cached_properties using uplisting_id
        const { data: cachedProperty, error: propError } = await supabase
          .from('cached_properties')
          .select('*')
          .eq('uplisting_id', bookingData.property_id)
          .single();

        if (propError || !cachedProperty) {
          errors.push(`Row ${rowNumber}: Property ID ${bookingData.property_id} not found`);
          skipped++;
          continue;
        }

        // Extract property details from JSONB data
        const propertyName = cachedProperty.data?.attributes?.nickname || 
                            cachedProperty.data?.attributes?.name || 
                            `Property ${bookingData.property_id}`;
        
        // Since cached_properties doesn't have owner info, we'll need to find or create apartment
        // Try to match apartment by property details or create a placeholder
        let apartmentId: string | null = null;
        
        // Try to find existing apartment by nickname/name
        const { data: existingApt } = await supabase
          .from('apartments')
          .select('id')
          .ilike('apartment_number', `%${bookingData.property_id}%`)
          .limit(1)
          .single();

        if (existingApt) {
          apartmentId = existingApt.id;
          console.log(`Row ${rowNumber}: Found existing apartment ${apartmentId} for property ${bookingData.property_id}`);
        } else {
          // Create a new apartment entry for this property
          const { data: newApt, error: aptError } = await supabase
            .from('apartments')
            .insert({
              apartment_number: bookingData.property_id,
              owner_name: extractOwnerName(propertyName),
              owner_email: '',
              address: cachedProperty.data?.attributes?.name || ''
            })
            .select('id')
            .single();

          if (aptError) {
            console.error(`Row ${rowNumber}: Apartment creation error:`, aptError);
            errors.push(`Row ${rowNumber}: Failed to create apartment: ${aptError.message}`);
            skipped++;
            continue;
          }
          
          if (!newApt) {
            errors.push(`Row ${rowNumber}: Failed to create apartment for property ${bookingData.property_id}: No data returned`);
            skipped++;
            continue;
          }
          
          apartmentId = newApt.id;
          console.log(`Row ${rowNumber}: Created new apartment ${apartmentId} for property ${bookingData.property_id}`);
        }

        // Verify we have an apartment ID before proceeding
        if (!apartmentId) {
          errors.push(`Row ${rowNumber}: No apartment ID available for property ${bookingData.property_id}`);
          skipped++;
          continue;
        }

        // Check if booking reference already exists
        const { data: existingBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('booking_reference', bookingData.booking_reference)
          .single();

        if (existingBooking) {
          skipped++;
          continue; // Skip duplicate
        }

        // Get or create guest
        const guestId = await getOrCreateGuest(
          supabase,
          bookingData.guest_name,
          bookingData.guest_email,
          bookingData.guest_phone
        );

        // Get or create booking channel
        let channelId: string | null = null;
        if (bookingData.channel_name) {
          channelId = await getOrCreateChannel(supabase, bookingData.channel_name);
        }

        // Create booking
        console.log(`Row ${rowNumber}: Creating booking with apartment_id=${apartmentId}, guest_id=${guestId}`);
        const { data: newBooking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            booking_reference: bookingData.booking_reference,
            apartment_id: apartmentId,
            guest_id: guestId,
            channel_id: channelId,
            check_in_date: bookingData.check_in_date,
            check_out_date: bookingData.check_out_date,
            accommodation_total: bookingData.accommodation_total,
            discount_amount: bookingData.discount_amount || 0,
            extra_charges: bookingData.extra_charges || 0,
            cleaning_fee: bookingData.cleaning_fee || 0,
            booking_taxes: bookingData.booking_taxes || 0,
            channel_commission: bookingData.channel_commission || 0,
            commission_tax: bookingData.commission_tax || 0,
            payment_processing_fee: bookingData.payment_processing_fee || 0,
            booking_status: bookingData.booking_status || 'completed',
            notes: bookingData.notes,
          })
          .select();

        if (bookingError) {
          console.error(`Row ${rowNumber}: Booking creation error:`, bookingError);
          errors.push(`Row ${rowNumber}: ${bookingError.message}`);
          skipped++;
        } else if (!newBooking || newBooking.length === 0) {
          console.error(`Row ${rowNumber}: Booking created but no data returned`);
          errors.push(`Row ${rowNumber}: Booking creation returned no data`);
          skipped++;
        } else {
          console.log(`Row ${rowNumber}: Successfully created booking ${newBooking[0].id}`);
          imported++;
        }
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 10), // Limit to first 10 errors
      message: `Successfully imported ${imported} bookings. ${skipped} skipped.`
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}

// Helper function to parse CSV
function parseCSV(text: string): CSVRow[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

// Helper function to normalize booking status to valid values
function normalizeBookingStatus(status: string): 'pending' | 'confirmed' | 'cancelled' | 'completed' {
  const normalized = status.toLowerCase().trim();
  
  // Map various status values to valid ones
  const statusMap: { [key: string]: 'pending' | 'confirmed' | 'cancelled' | 'completed' } = {
    'pending': 'pending',
    'confirmed': 'confirmed',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'completed': 'completed',
    'complete': 'completed',
    'finished': 'completed',
    'checked_out': 'completed',
    'checked out': 'completed',
    'checkout': 'completed',
    'needs_check_out': 'confirmed', // Active booking that needs checkout
    'needs check out': 'confirmed',
    'needs_checkout': 'confirmed',
    'active': 'confirmed',
    'in_progress': 'confirmed',
    'in progress': 'confirmed',
    'current': 'confirmed',
    'upcoming': 'confirmed',
    'arriving': 'confirmed',
  };
  
  return statusMap[normalized] || 'completed'; // Default to completed if unknown
}

// Helper function to generate booking reference for channels without confirmation codes
function generateBookingReference(propertyId: string, channelName: string, checkInDate: string): string {
  const channel = channelName?.toLowerCase() || 'unknown';
  const prefix = channel.includes('uplisting') ? 'UPL' : 
                 channel.includes('direct') ? 'DIR' : 'GEN';
  const datePart = checkInDate.replace(/-/g, '').substring(2, 8); // YYMMDD
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

// Helper function to extract booking data from CSV row
function extractBookingData(row: CSVRow, rowNumber: number): BookingData | null {
  // Use flexible column mapping to get values
  const propertyId = getColumnValue(row, 'property_id');
  let bookingRef = getColumnValue(row, 'booking_reference');
  const guestName = getColumnValue(row, 'guest_name');
  const checkIn = getColumnValue(row, 'check_in_date');
  const checkOut = getColumnValue(row, 'check_out_date');
  const accommodationTotalStr = getColumnValue(row, 'accommodation_total');
  const accommodationTotal = parseFloat(accommodationTotalStr || '0');
  const channelName = getColumnValue(row, 'channel_name');

  // Validate required fields (except booking_reference which can be auto-generated)
  if (!propertyId || !guestName || !checkIn || !checkOut) {
    console.warn(`Row ${rowNumber}: Missing required fields`, {
      propertyId: !!propertyId,
      bookingRef: !!bookingRef,
      guestName: !!guestName,
      checkIn: !!checkIn,
      checkOut: !!checkOut,
    });
    return null;
  }

  // Auto-generate booking reference if missing (for Uplisting, Direct, etc.)
  if (!bookingRef) {
    bookingRef = generateBookingReference(propertyId, channelName, checkIn);
    console.log(`Row ${rowNumber}: Auto-generated booking reference: ${bookingRef}`);
  }

  // Get and normalize status
  const rawStatus = getColumnValue(row, 'booking_status');
  const normalizedStatus = rawStatus ? normalizeBookingStatus(rawStatus) : 'completed';

  // Helper function to safely parse float with default
  const parseFloatSafe = (value: string): number => {
    const parsed = parseFloat(value || '0');
    return isNaN(parsed) ? 0 : parsed;
  };

  // Parse discount and convert to negative if positive (discounts should reduce revenue)
  const discountValue = parseFloatSafe(getColumnValue(row, 'discount_amount'));
  const normalizedDiscount = discountValue > 0 ? -discountValue : discountValue;

  return {
    booking_reference: bookingRef,
    property_id: propertyId,
    guest_name: guestName,
    guest_email: getColumnValue(row, 'guest_email'),
    guest_phone: getColumnValue(row, 'guest_phone'),
    check_in_date: checkIn,
    check_out_date: checkOut,
    accommodation_total: accommodationTotal,
    discount_amount: normalizedDiscount, // Ensure discounts are negative
    extra_charges: parseFloatSafe(getColumnValue(row, 'extra_charges')),
    cleaning_fee: parseFloatSafe(getColumnValue(row, 'cleaning_fee')),
    booking_taxes: parseFloatSafe(getColumnValue(row, 'booking_taxes')),
    channel_commission: parseFloatSafe(getColumnValue(row, 'channel_commission')),
    commission_tax: parseFloatSafe(getColumnValue(row, 'commission_tax')),
    payment_processing_fee: parseFloatSafe(getColumnValue(row, 'payment_processing_fee')),
    channel_name: getColumnValue(row, 'channel_name'),
    booking_status: normalizedStatus,
    notes: getColumnValue(row, 'notes'),
  };
}

// Helper function to extract owner name from property nickname
function extractOwnerName(nickname: string): string {
  // Try to extract owner name from patterns like "Unit 408 - Dylan Hayward (Parking #12)"
  const match = nickname.match(/[-–]\s*([^(]+)/);
  if (match) {
    return match[1].trim();
  }
  return 'Owner'; // Default fallback
}

// Helper function to get or create guest
async function getOrCreateGuest(
  supabase: ReturnType<typeof createServiceRoleClient>,
  name: string,
  email?: string,
  phone?: string
): Promise<string> {
  // Try to find existing guest by email or name
  let query = supabase.from('guests').select('id');
  
  if (email) {
    query = query.eq('email', email);
  } else {
    query = query.eq('name', name);
  }

  const { data: existingGuest, error: findError } = await query.limit(1).single();

  if (existingGuest) {
    return existingGuest.id;
  }

  // If not found (and not due to error), create new guest
  if (!findError || findError.code === 'PGRST116') {
    // Create new guest
    const { data: newGuest, error } = await supabase
      .from('guests')
      .insert({ name, email: email || null, phone: phone || null })
      .select('id')
      .single();

    if (error) {
      console.error('Guest creation error:', error);
      throw new Error(`Failed to create guest: ${error.message} (Code: ${error.code})`);
    }

    if (!newGuest) {
      throw new Error('Failed to create guest: No data returned');
    }

    return newGuest.id;
  }

  // If there was an error finding the guest, throw it
  throw new Error(`Failed to find or create guest: ${findError.message}`);
}

// Helper function to get or create booking channel
async function getOrCreateChannel(supabase: ReturnType<typeof createServiceRoleClient>, channelName: string): Promise<string | null> {
  // Normalize channel name
  const normalizedName = channelName.trim();

  // Try to find existing channel
  const { data: existingChannel } = await supabase
    .from('booking_channels')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1)
    .single();

  if (existingChannel) {
    return existingChannel.id;
  }

  // Create new channel with default rates
  const { data: newChannel, error } = await supabase
    .from('booking_channels')
    .insert({
      name: normalizedName,
      commission_rate: 0,
      payment_processing_fee: 0,
    })
    .select('id')
    .single();

  if (error || !newChannel) {
    console.warn('Failed to create channel, continuing without channel_id');
    return null;
  }

  return newChannel.id;
}

