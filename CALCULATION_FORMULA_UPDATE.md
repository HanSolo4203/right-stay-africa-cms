# Total Payout Formula Update

## Overview
The database `total_payout` formula has been updated to match the business logic documented in `src/lib/calculations.ts`.

## The Issue

### Old Database Formula (INCORRECT)
```sql
total_payout = accommodation_total 
             - discount_amount          ← WRONG: was subtracting
             + extra_charges 
             + cleaning_fee 
             + booking_taxes 
             - channel_commission 
             - payment_processing_fee
```

### Correct Formula (from calculations.ts)
```typescript
// Step 1: Calculate Gross Revenue
Gross Revenue = accommodation_total 
              + discount_amount          ← CORRECT: adds discount (can be negative)
              + extra_charges 
              + cleaning_fee 
              + booking_taxes

// Step 2: Calculate Booking Payout
Booking Payout = Gross Revenue 
               - channel_commission 
               - payment_processing_fee
```

## Why This Matters

### Discount Handling
The `discount_amount` field can be:
- **Negative**: Represents an actual discount (reduces revenue)
  - Example: `discount_amount = -50` means R50 off
- **Positive**: Represents a price adjustment or surcharge (increases revenue)
  - Example: `discount_amount = 25` means R25 added

The old formula **subtracted** the discount, which means:
- If discount was -50, it would subtract (-50) = add 50 ✅ Correct by accident
- If discount was +25, it would subtract 25 ✗ Wrong!

The new formula **adds** the discount, which means:
- If discount is -50, it adds -50 = subtracts 50 ✅ Correct
- If discount is +25, it adds 25 ✅ Correct

### Consistency with Business Logic
The `calculations.ts` file documents the correct formulas used throughout the application. The database should match this logic.

## Changes Made

### SQL Migration: `update-total-payout-formula.sql`

```sql
-- Drop old column
ALTER TABLE bookings DROP COLUMN total_payout;

-- Add new column with correct formula
ALTER TABLE bookings 
ADD COLUMN total_payout NUMERIC GENERATED ALWAYS AS (
    (accommodation_total + discount_amount + extra_charges + cleaning_fee + booking_taxes)
    - channel_commission 
    - payment_processing_fee
) STORED;
```

## Important Notes

### About Upsells
The `calculations.ts` includes `upsell_total` in the gross revenue calculation, but:
- Upsells are stored in a separate `booking_upsells` table
- The `total_payout` column only calculates booking-level payout
- Upsells are added at the **view level** (`owner_statements_view`) via:
  ```sql
  COALESCE(upsell_totals.upsell_total, 0)
  ```

This is correct because:
1. A booking can have multiple upsells (one-to-many relationship)
2. The booking table shouldn't calculate totals from related tables
3. The view handles aggregation of upsells per booking

### Formula Components

| Component | Purpose | Sign |
|-----------|---------|------|
| `accommodation_total` | Base nightly rate × nights | Positive |
| `discount_amount` | Discount or adjustment | Negative (discount) or Positive (surcharge) |
| `extra_charges` | Additional guest charges, etc. | Positive |
| `cleaning_fee` | One-time cleaning fee | Positive |
| `booking_taxes` | Tourism tax, VAT, etc. | Positive |
| `channel_commission` | Platform commission (Airbnb, Booking.com) | Positive (subtracted) |
| `payment_processing_fee` | Payment gateway fees | Positive (subtracted) |

### Example Calculation

```
Booking Details:
- Accommodation: R 1,500
- Discount: R -100 (R100 off)
- Extra Charges: R 50
- Cleaning Fee: R 250
- Booking Taxes: R 200
- Channel Commission: R 180
- Processing Fee: R 40

Calculation:
Gross Revenue = 1500 + (-100) + 50 + 250 + 200 = R 1,900
Total Payout = 1900 - 180 - 40 = R 1,680
```

## How to Apply

### Step 1: Run the Migration
In **Supabase SQL Editor**, run:
```sql
-- Copy and paste the contents of update-total-payout-formula.sql
```

### Step 2: Verify the Update
The migration includes a verification query that shows:
- Current values
- Manually calculated values
- Whether they match

All existing bookings will be automatically recalculated with the new formula.

### Step 3: Re-import CSV (if needed)
If you want the corrected calculations for existing bookings:
1. Delete existing bookings (optional)
2. Re-import your CSV
3. New bookings will use the correct formula

Or just let the database recalculate existing bookings automatically (happens instantly).

## Impact Analysis

### Affected Data
- All records in `bookings` table
- All queries using `owner_statements_view`
- Any calculations displayed on Owner Statements page

### Who Needs to Know
- Finance team reviewing statements
- Owners receiving payout reports
- Anyone analyzing booking revenue

### Testing Checklist
- [ ] Run migration SQL in Supabase
- [ ] Verify existing bookings recalculated correctly
- [ ] Import new CSV and check calculations
- [ ] Compare totals with manual calculations
- [ ] Check Owner Statements page displays correct amounts
- [ ] Verify exports show correct values

## Rollback Plan

If you need to revert to the old formula:

```sql
ALTER TABLE bookings DROP COLUMN total_payout;

ALTER TABLE bookings 
ADD COLUMN total_payout NUMERIC GENERATED ALWAYS AS (
    ((((((accommodation_total - discount_amount) + extra_charges) 
    + cleaning_fee) + booking_taxes) - channel_commission) 
    - payment_processing_fee)
) STORED;
```

## Documentation Updated

The following files document the correct formula:
- ✅ `src/lib/calculations.ts` - Business logic (already correct)
- ✅ Database `bookings.total_payout` - Now matches calculations.ts
- ✅ `owner_statements_view` - Uses the corrected booking.total_payout

## Summary

### Before
- ❌ Database formula didn't match business logic
- ❌ Discount handling was inverted
- ❌ Inconsistent calculations

### After
- ✅ Database formula matches calculations.ts
- ✅ Discount handled correctly (adds discount, which can be negative)
- ✅ Consistent calculations across application
- ✅ Future CSV imports will use correct formula
- ✅ Existing data automatically recalculated

## Next Steps

1. **Run the migration SQL** in Supabase SQL Editor
2. **Verify** calculations are correct using the verification query
3. **Test** with a few bookings to ensure totals match expectations
4. **Monitor** owner statements to ensure accuracy

The change is **backwards compatible** - existing bookings will be automatically recalculated, and the owner statements page will immediately show the corrected values.

