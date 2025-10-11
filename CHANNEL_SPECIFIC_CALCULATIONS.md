# Channel-Specific Net Revenue Calculations

## Overview
Different booking channels (Airbnb vs Booking.com) handle booking taxes differently, requiring channel-specific payout calculations.

## The Business Logic

### Airbnb (and most OTAs)
**Tax Handling:** Airbnb collects and remits taxes to the government on your behalf.

**Net Revenue Calculation:**
```
Gross Revenue = Accommodation + Cleaning + Extras + Discounts
Net Revenue = Gross Revenue 
            - Booking Taxes (Airbnb handles these)
            - Processing Fee
            - Commission
            - Commission Tax
```

**Example:**
```
Guest pays: R 2,000 (incl. R 200 taxes)
Airbnb collects taxes and pays government
You receive: R 1,800 - fees - commission
```

### Booking.com
**Tax Handling:** You collect taxes from guest and remit them yourself to the government.

**Net Revenue Calculation:**
```
Gross Revenue = Accommodation + Cleaning + Extras + Discounts
Net Revenue = Gross Revenue 
            - Processing Fee
            - Commission
            - Commission Tax
            (NO DEDUCTION for booking taxes - you keep them to pay government)
```

**Example:**
```
Guest pays: R 2,000 (incl. R 200 taxes)
You receive: R 2,000 - fees - commission (full amount)
You then pay R 200 taxes to government yourself
```

## Database Implementation

### View with Channel Detection
The `owner_statements_view` uses a CASE statement to detect the channel:

```sql
net_revenue = CASE 
    WHEN LOWER(channel_name) LIKE '%booking%' OR channel_name = 'booking_dot_com' THEN
        -- Booking.com: Keep booking taxes
        Gross Revenue - Processing - Commission - Comm Tax
    ELSE
        -- Airbnb and others: Deduct booking taxes
        Gross Revenue - Booking Taxes - Processing - Commission - Comm Tax
END
```

### Channel Name Matching
The system detects Booking.com by:
- Channel name contains "booking" (case-insensitive)
- Channel name exactly matches "booking_dot_com"

**Recognized as Booking.com:**
- `Booking.com`
- `BOOKING.COM`
- `booking_dot_com`
- `Booking` (any variation)

**Recognized as Airbnb/Other:**
- `Airbnb`
- `airbnb_official`
- `VRBO`
- `Direct`
- `Expedia`
- Any channel NOT containing "booking"

## CSV Import

### Channel Name Column
Your CSV should have a channel_name column that indicates the booking source:

```csv
property_id,booking_reference,...,channel_name,...
126709,ABC123,...,airbnb_official,...    ← Taxes deducted
129921,XYZ456,...,booking_dot_com,...    ← Taxes NOT deducted
```

### Automatic Calculation
The database automatically calculates the correct net_revenue based on the channel name. You don't need to do anything special - just ensure the channel name is correct in your CSV.

## Owner Statement Display

### What You See
The owner statements page now shows **Net Revenue** instead of Total Payout:

**Summary Cards:**
- Total Bookings
- Total Revenue (accommodation only)
- **Net Revenue** ← New! (Channel-specific calculation)
- Properties

**Property Details:**
Each property shows Net Revenue in the header.

**Booking Details Table:**
Includes a new column: **Net Revenue** showing the channel-specific payout amount.

## Calculation Examples

### Example 1: Airbnb Booking
```
CSV Data:
  Property: 126709
  Channel: airbnb_official
  Accommodation: R 6,167.72
  Cleaning: R 350.00
  Extras: R 0.00
  Discounts: R 0.00
  Booking Taxes: R 863.48
  Commission: R 1,107.18
  Comm Tax: R 0.00
  Processing: R 155.01

Calculation:
  Gross Revenue = 6,167.72 + 350.00 + 0 + 0 = R 6,517.72
  Net Revenue = 6,517.72 - 863.48 - 155.01 - 1,107.18 - 0 = R 4,392.05
  
  (Taxes DEDUCTED because Airbnb handles tax remittance)
```

### Example 2: Booking.com Booking
```
CSV Data:
  Property: 129921
  Channel: booking_dot_com
  Accommodation: R 8,456.00
  Cleaning: R 350.00
  Extras: R 0.00
  Discounts: R -2,536.80
  Booking Taxes: R 0.00
  Commission: R 940.38
  Comm Tax: R 0.00
  Processing: R 0.00

Calculation:
  Gross Revenue = 8,456.00 + 350.00 + 0 + (-2,536.80) = R 6,269.20
  Net Revenue = 6,269.20 - 0 - 940.38 - 0 = R 5,328.82
  
  (Taxes NOT DEDUCTED because you handle tax remittance)
```

## Technical Details

### Database Schema Changes

**Added:**
- `commission_tax` column to `bookings` table
- `net_revenue` calculated column to `owner_statements_view`
- `gross_revenue` calculated column to `owner_statements_view`

**Modified:**
- `total_payout` formula (simplified, legacy)
- `owner_statements_view` with CASE logic for channel detection

### Code Changes

**Updated Files:**
1. `src/app/finance/owner-statements/page.tsx`
   - Interface updated with `net_revenue` and `commission_tax`
   - Display changed to show Net Revenue
   - Added commission_tax column to table

2. `src/app/api/bookings/route.ts`
   - Grouping function includes net_revenue
   - Grand totals calculation includes net_revenue

3. `src/lib/calculations.ts`
   - Updated documentation
   - Added commission_tax to interface
   - Updated formulas to match business logic

4. `src/lib/csv-column-mappings.ts`
   - Added commission_tax column mappings

5. `src/app/api/bookings/import/route.ts`
   - Handles commission_tax from CSV
   - Safe float parsing prevents NaN

## Migration Checklist

- [ ] Run `update-bookings-schema-complete.sql` in Supabase
- [ ] Verify commission_tax column exists
- [ ] Verify net_revenue appears in owner_statements_view
- [ ] Restart dev server
- [ ] Test with Airbnb booking CSV (should deduct taxes)
- [ ] Test with Booking.com CSV (should NOT deduct taxes)
- [ ] Verify calculations are correct for both channel types
- [ ] Update existing bookings if needed (set channel names correctly)

## Verification Queries

### Check Channel Detection
```sql
SELECT 
    booking_reference,
    channel_name,
    CASE 
        WHEN LOWER(channel_name) LIKE '%booking%' THEN 'Booking.com (taxes kept)'
        ELSE 'Airbnb/Other (taxes deducted)'
    END as detected_type,
    booking_taxes,
    net_revenue
FROM owner_statements_view
ORDER BY check_in_date DESC;
```

### Compare Airbnb vs Booking.com
```sql
SELECT 
    channel_name,
    COUNT(*) as booking_count,
    SUM(booking_taxes) as total_taxes,
    SUM(net_revenue) as total_net_revenue,
    AVG(booking_taxes) as avg_taxes_per_booking
FROM owner_statements_view
GROUP BY channel_name
ORDER BY booking_count DESC;
```

### Verify Formula Works Both Ways
```sql
-- Should show different net_revenue for same gross but different channels
SELECT 
    'Airbnb' as channel,
    6517.72 as gross_revenue,
    863.48 as booking_taxes,
    6517.72 - 863.48 - 155.01 - 1107.18 as calculated_net_revenue
UNION ALL
SELECT 
    'Booking.com' as channel,
    6517.72 as gross_revenue,
    863.48 as booking_taxes,
    6517.72 - 155.01 - 1107.18 as calculated_net_revenue;
```

## Troubleshooting

### Wrong Net Revenue for Booking.com
**Issue:** Booking.com bookings show taxes deducted

**Fix:** Check channel name in database
```sql
UPDATE booking_channels 
SET name = 'booking_dot_com' 
WHERE name LIKE '%booking%';
```

### Wrong Net Revenue for Airbnb
**Issue:** Airbnb bookings show taxes NOT deducted

**Fix:** Ensure channel name doesn't contain "booking"
```sql
SELECT id, name FROM booking_channels WHERE name LIKE '%airbnb%';
-- Should show: airbnb_official, Airbnb, etc. (not containing "booking")
```

### Net Revenue vs Total Payout Confusion
- **total_payout**: Legacy field (always deducts taxes)
- **net_revenue**: Correct field (channel-specific tax handling)
- Always use **net_revenue** on owner statements!

## Best Practices

### 1. Consistent Channel Naming
Use standard names in your CSV:
- `airbnb_official` for Airbnb
- `booking_dot_com` for Booking.com
- `vrbo` for VRBO
- `direct` for direct bookings

### 2. Verify Channel Names
After CSV import, check:
```sql
SELECT DISTINCT channel_name FROM owner_statements_view;
```

Ensure names match expected patterns.

### 3. Update Old Data
If you have existing bookings with incorrect channel names:
```sql
UPDATE booking_channels 
SET name = 'airbnb_official' 
WHERE name IN ('Airbnb', 'AIRBNB', 'airbnb');

UPDATE booking_channels 
SET name = 'booking_dot_com' 
WHERE name IN ('Booking.com', 'BOOKING.COM', 'Booking');
```

## Summary

✅ **Channel-specific tax handling** (Airbnb deducts, Booking.com doesn't)
✅ **Net Revenue** replaces Total Payout on statements
✅ **Automatic detection** based on channel name
✅ **Commission Tax** field added
✅ **Backward compatible** (legacy total_payout still available)

The system now accurately reflects how different booking platforms handle taxes!

