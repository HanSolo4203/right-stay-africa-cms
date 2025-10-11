# Auto-Generate Booking Reference for Uplisting & Direct Bookings

## Overview
Uplisting and Direct bookings don't always have confirmation codes. The system now automatically generates unique booking references for these bookings.

## The Problem
- **Airbnb/Booking.com**: Always provide confirmation codes
- **Uplisting**: Does NOT generate confirmation codes
- **Direct**: Manual bookings, no external confirmation code
- **CSV Import**: Previously failed if confirmation code was missing

## The Solution
The import system now:
1. ✅ Detects missing confirmation codes
2. ✅ Auto-generates unique booking references
3. ✅ Uses channel-specific prefixes
4. ✅ Ensures uniqueness with date + random string

## Auto-Generated Format

### Format Pattern
```
{PREFIX}-{YYMMDD}-{RANDOM}
```

**Components:**
- **PREFIX**: Channel-based identifier
  - `UPL` = Uplisting
  - `DIR` = Direct
  - `GEN` = Other channels
- **YYMMDD**: Check-in date (e.g., 250920 = Sept 20, 2025)
- **RANDOM**: 6-character random string for uniqueness

### Examples

**Uplisting Booking:**
```
Check-in: 2025-09-20
Generated: UPL-250920-A3F9K2
```

**Direct Booking:**
```
Check-in: 2025-10-15
Generated: DIR-251015-B7H3M9
```

**Other Channel (fallback):**
```
Check-in: 2025-11-01
Generated: GEN-251101-K9P2X4
```

## CSV Import Behavior

### Before (Would Fail)
```csv
property_id,booking_reference,guest_name,channel_name,...
126709,,John Smith,uplisting,...  ← FAILED: No confirmation code
```

### After (Auto-Generates)
```csv
property_id,booking_reference,guest_name,channel_name,...
126709,,John Smith,uplisting,...  ← SUCCESS: Generates UPL-250920-A3F9K2
```

## When References Are Generated

The system generates a booking reference when:
1. CSV row has empty/missing `booking_reference` column
2. CSV doesn't have a `booking_reference` column at all
3. Any channel name (prioritizes Uplisting/Direct prefixes)

## Console Output

When a reference is auto-generated, you'll see:
```
Row 9: Auto-generated booking reference: UPL-250920-A3F9K2
Row 9: Creating booking with apartment_id=xxx, guest_id=yyy
Row 9: Successfully created booking zzz
```

## Uniqueness Guarantee

The reference is unique because:
- Date component (YYMMDD)
- Random alphanumeric string (36^6 = ~2 billion possibilities)
- Database unique constraint on booking_reference

**Collision probability:** Extremely low (~1 in 2 billion per date)

## Required CSV Fields

### Previously Required
- property_id ✓
- booking_reference ✓ (REQUIRED)
- guest_name ✓
- check_in_date ✓
- check_out_date ✓
- accommodation_total ✓

### Now Required
- property_id ✓
- ~~booking_reference~~ (Optional - auto-generated if missing)
- guest_name ✓
- check_in_date ✓
- check_out_date ✓
- accommodation_total ✓

## CSV Examples

### Uplisting Booking (No Confirmation Code)
```csv
property_id,booking_reference,guest_name,guest_email,check_in_date,check_out_date,accommodation_total,channel_name
126709,,Dylan Hayward,dylan@email.com,2025-09-05,2025-09-07,1200.00,uplisting
```

**Result:**
- ✅ Imports successfully
- ✅ Reference: `UPL-250905-K3P9M2` (auto-generated)
- ✅ Appears on owner statements

### Direct Booking (No Code)
```csv
property_id,booking_reference,guest_name,check_in_date,check_out_date,accommodation_total,channel_name
129921,,Sarah Johnson,2025-10-15,2025-10-18,1500.00,direct
```

**Result:**
- ✅ Imports successfully
- ✅ Reference: `DIR-251015-N7Q4R8` (auto-generated)
- ✅ Appears on owner statements

### Mixed CSV (Some with codes, some without)
```csv
property_id,booking_reference,guest_name,channel_name,...
126709,HMJYWQSCEA,John Smith,airbnb_official,...  ← Uses provided code
129921,,Sarah Johnson,uplisting,...                ← Auto-generates
135133,6100697478,Mike Chen,booking_dot_com,...    ← Uses provided code
```

**Result:**
- ✅ All import successfully
- ✅ Existing codes preserved
- ✅ Missing codes auto-generated

## Implementation Details

### Generation Function
```typescript
function generateBookingReference(
  propertyId: string, 
  channelName: string, 
  checkInDate: string
): string {
  const channel = channelName?.toLowerCase() || 'unknown';
  
  // Choose prefix based on channel
  const prefix = channel.includes('uplisting') ? 'UPL' : 
                 channel.includes('direct') ? 'DIR' : 'GEN';
  
  // Extract YYMMDD from check-in date
  const datePart = checkInDate.replace(/-/g, '').substring(2, 8);
  
  // Generate random string
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${PREFIX}-${datePart}-${randomPart}`;
}
```

### Validation Logic
```typescript
// Before: booking_reference was required
if (!propertyId || !bookingRef || !guestName || !checkIn || !checkOut) {
  return null; // Skip row
}

// After: booking_reference is optional
if (!propertyId || !guestName || !checkIn || !checkOut) {
  return null; // Skip row
}

if (!bookingRef) {
  bookingRef = generateBookingReference(propertyId, channelName, checkIn);
  // Continue with import
}
```

## Benefits

✅ **Uplisting bookings now import** without confirmation codes
✅ **Direct bookings supported** without manual reference creation
✅ **Unique references guaranteed** via date + random string
✅ **Channel-specific prefixes** for easy identification
✅ **Backward compatible** - existing codes still used if provided
✅ **Console logging** shows which references were generated

## Testing

### Test Case 1: Uplisting Without Code
```csv
126709,,Guest Name,uplisting,2025-09-05,2025-09-07,1200.00
```

Expected:
- ✓ Imports successfully
- ✓ Reference like `UPL-250905-A3F9K2`
- ✓ Appears on owner statements
- ✓ Channel shows as "uplisting"

### Test Case 2: Multiple Uplisting Same Date
```csv
126709,,Guest 1,uplisting,2025-09-05,2025-09-07,1200.00
129921,,Guest 2,uplisting,2025-09-05,2025-09-08,1500.00
```

Expected:
- ✓ Both import successfully
- ✓ Different references (random part differs)
- ✓ Example: `UPL-250905-A3F9K2` and `UPL-250905-K8M4P1`

### Test Case 3: Mixed With/Without Codes
```csv
126709,ABC123,Guest 1,airbnb_official,2025-09-05,2025-09-07,1200.00
129921,,Guest 2,uplisting,2025-09-05,2025-09-08,1500.00
```

Expected:
- ✓ First uses `ABC123` (provided)
- ✓ Second generates `UPL-250905-X7Y2Z9`
- ✓ Both import successfully

## Troubleshooting

### Generated References Not Unique
**Issue:** Extremely rare - random collision

**Solution:** The database has a unique constraint on booking_reference. If a collision occurs:
- Import will fail with error message
- Re-import the same row (will generate different random string)
- Collision probability: ~1 in 2 billion per date

### Can't Find Uplisting Bookings
**Issue:** Generated references don't match expected format

**Solution:** 
- All Uplisting bookings start with `UPL-`
- Search for: `SELECT * FROM bookings WHERE booking_reference LIKE 'UPL-%'`

### Want Different Prefix
**Solution:** Edit the generation function in `src/app/api/bookings/import/route.ts`:
```typescript
const prefix = channel.includes('uplisting') ? 'UPLISTING' : // Your custom prefix
               channel.includes('direct') ? 'DIRECT' : 'GEN';
```

## Migration Notes

No database migration needed - this is purely application-level logic.

Just restart your dev server after the code update:
```bash
npm run dev
```

## CSV Template Update

The template now shows that booking_reference is optional:

```csv
property_id,booking_reference,guest_name,channel_name,...
126709,ABC123,John,airbnb_official,...        ← With code
129921,,Sarah,uplisting,...                   ← Without code (will generate)
```

## Summary

✅ **Auto-generates booking references** for missing confirmation codes
✅ **Uplisting bookings now work** without external codes
✅ **Direct bookings supported** without manual reference creation
✅ **Channel-specific prefixes** (UPL, DIR, GEN)
✅ **Unique and traceable** references
✅ **Backward compatible** - provided codes still used

Your Uplisting bookings will now import successfully and appear on owner statements! 🎉

