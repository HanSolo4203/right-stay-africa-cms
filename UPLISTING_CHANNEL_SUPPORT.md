# Uplisting Channel Support

## Overview
Added support for "Uplisting" as a recognized booking channel with proper tax handling.

## What Changed

### 1. CSV Column Recognition
Added "uplisting" to the channel_name column mappings in `src/lib/csv-column-mappings.ts`.

Your CSV can now use:
- `uplisting`
- `Uplisting`
- `UPLISTING`
- Or any case variation

### 2. Tax Handling Logic
Uplisting is treated like Booking.com and Direct bookings:
- ✅ Booking taxes are **NOT deducted** from net revenue
- ✅ You keep the taxes to remit to government yourself
- ✅ Similar to how you handle Direct bookings

### 3. Channel Groups

**Group A: Platform Handles Taxes** (Taxes DEDUCTED)
- Airbnb (airbnb_official)
- VRBO
- Expedia
- Other OTAs

**Group B: You Handle Taxes** (Taxes NOT DEDUCTED)
- Booking.com (booking_dot_com)
- Uplisting ← NEW!
- Direct

## How It Works

### CSV Import
```csv
property_id,booking_reference,channel_name,...
126709,ABC123,uplisting,...     ← Recognized!
129921,XYZ456,Uplisting,...     ← Also works
```

### Net Revenue Calculation
```
For Uplisting bookings:
  Gross Revenue = Accommodation + Cleaning + Extras + Discounts
  Net Revenue = Gross Revenue - Processing - Commission - Comm Tax
  (Booking taxes NOT deducted - you keep them)
```

### Database Detection
The view uses CASE logic:
```sql
WHEN LOWER(channel_name) = 'uplisting' THEN
    -- Keep booking taxes (you handle remittance)
```

## Example Uplisting Booking

```
CSV Data:
  Property: 126709
  Channel: uplisting
  Accommodation: R 5,000.00
  Cleaning: R 350.00
  Discounts: R 0.00
  Booking Taxes: R 750.00
  Commission: R 0.00 (or your platform fee)
  Processing: R 0.00

Calculation:
  Gross Revenue = 5,000 + 350 = R 5,350.00
  Net Revenue = 5,350 - 0 - 0 - 0 = R 5,350.00
  
  ✅ Full R 5,350 received (including the R 750 taxes)
  ✅ You then remit R 750 to government separately
  ✅ Owner gets payout from R 5,350 minus your expenses/commission
```

## Supported Channel Names

After migration, the system recognizes these channels:

| Channel | Tax Handling | Typical Use |
|---------|--------------|-------------|
| airbnb_official | Deducted | Airbnb bookings |
| booking_dot_com | NOT Deducted | Booking.com |
| uplisting | NOT Deducted | Your direct booking site |
| direct | NOT Deducted | Phone/email bookings |
| vrbo | Deducted | VRBO/HomeAway |
| expedia | Deducted | Expedia bookings |

## Testing

### Test Uplisting Import
1. Create CSV with channel_name = "uplisting"
2. Include booking_taxes amount
3. Import via Owner Statements page
4. Verify net_revenue = gross - fees (NOT deducting booking_taxes)

### Verification Query
```sql
SELECT 
    booking_reference,
    channel_name,
    gross_revenue,
    booking_taxes,
    net_revenue,
    CASE 
        WHEN LOWER(channel_name) = 'uplisting' THEN 'Taxes kept ✓'
        ELSE 'Taxes deducted'
    END as tax_treatment
FROM owner_statements_view
WHERE LOWER(channel_name) = 'uplisting'
ORDER BY check_in_date DESC;
```

## Benefits

✅ **Uplisting bookings fully supported**
✅ **Correct tax handling** (taxes not deducted)
✅ **Automatic detection** from CSV
✅ **Consistent with Direct/Booking.com** logic
✅ **No special CSV formatting** needed

## Migration Notes

When you run `update-bookings-schema-complete.sql`, Uplisting will be automatically included in the channel detection logic. No additional steps needed!

## Summary

- ✅ Added "uplisting" to CSV column mappings
- ✅ Added Uplisting to tax-keeping channels (like Booking.com)
- ✅ Updated database view with Uplisting detection
- ✅ Updated documentation

Uplisting bookings will now appear correctly on owner statements with proper tax handling! 🎉

