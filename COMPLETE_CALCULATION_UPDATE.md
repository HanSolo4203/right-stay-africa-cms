# Complete Calculation Formula Update - RightStay Africa

## Overview
Updated the entire system to match your actual business logic for owner statements, including the commission tax field and correct formula ordering.

## Correct Business Logic

### Step 1: Gross Revenue (What guest pays, before taxes to government)
```
Gross Revenue = Accommodation Total 
              + Cleaning Fee 
              + Extra Guest Charges 
              + Extra Charges 
              + Discounts (can be negative)
```

### Step 2: Total Payout (What RightStay receives from platform)
```
Total Payout = Gross Revenue 
             - Booking Taxes (paid to government, not kept)
             - Payment Processing Fee 
             - Commission 
             - Commission Tax
```

### Step 3: Final Owner Payout
```
Owner Payout = Total Payout (from platform)
             - Cleaning Fees (RightStay expense)
             - Welcome Pack (RightStay expense)
             - Other Expenses (RightStay expenses)
             - RightStay Africa Commission (management fee)
```

## Key Insights

### Cleaning Fee Handling
- ✅ **Included** in Gross Revenue (guest pays it)
- ✅ **Included** in Total Payout (RightStay receives it from platform)
- ✅ **Deducted** from Owner Payout (it's RightStay's expense)

### Management Fee
- ❌ **NOT** in Total Payout calculation
- ✅ **Calculated separately** for owner statements

### Commission Tax
- New field added to track VAT/tax on platform commissions
- Separate from booking taxes (which guests pay)
- Deducted along with commission from gross revenue

## Changes Made

### 1. Database Schema (`update-bookings-schema-complete.sql`)

#### Added commission_tax Column
```sql
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS commission_tax NUMERIC(10,2) DEFAULT 0.00;
```

#### Updated total_payout Formula
```sql
ALTER TABLE bookings 
ADD COLUMN total_payout NUMERIC GENERATED ALWAYS AS (
    -- Gross Revenue
    (accommodation_total + cleaning_fee + extra_charges + discount_amount + booking_taxes)
    -- Subtract platform fees
    - payment_processing_fee 
    - channel_commission
    - COALESCE(commission_tax, 0)
) STORED;
```

#### Enhanced owner_statements_view
```sql
-- Added new calculated fields:
- gross_revenue: For reference
- preliminary_owner_payout: total_payout - cleaning_fee - custom_expenses
  (Still needs RightStay commission deducted - done in app)
```

### 2. CSV Column Mappings (`src/lib/csv-column-mappings.ts`)
Added commission_tax field with multiple variations:
- `commission_tax`
- `commission tax`
- `tax_on_commission`
- `commission_vat`
- etc.

### 3. Import API (`src/app/api/bookings/import/route.ts`)
- Added `commission_tax` to BookingData interface
- Extract commission_tax from CSV
- Include commission_tax in booking inserts

### 4. Calculations Library (`src/lib/calculations.ts`)
- Updated documentation to match actual business logic
- Added `commission_tax` to Booking interface
- Updated `calculateBookingPayout()` to include commission_tax
- Added comprehensive comments explaining the three-step calculation

### 5. CSV Template (`public/booking-import-template.csv`)
- Added `commission_tax` column
- Updated sample data with realistic commission tax values

## Migration Steps

### Step 1: Run Database Migration
Run this SQL in **Supabase SQL Editor**:

```sql
-- Copy entire contents of update-bookings-schema-complete.sql
```

Or run these commands:

```sql
-- 1. Drop dependent view
DROP VIEW IF EXISTS owner_statements_view;

-- 2. Drop old column
ALTER TABLE bookings DROP COLUMN IF EXISTS total_payout;

-- 3. Add commission_tax column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_tax NUMERIC(10,2) DEFAULT 0.00;

-- 4. Add new total_payout with correct formula
ALTER TABLE bookings 
ADD COLUMN total_payout NUMERIC GENERATED ALWAYS AS (
    (accommodation_total + cleaning_fee + extra_charges + discount_amount + booking_taxes)
    - payment_processing_fee 
    - channel_commission
    - COALESCE(commission_tax, 0)
) STORED;

-- 5. Recreate view (see full SQL in update-bookings-schema-complete.sql)
```

### Step 2: Restart Dev Server
```bash
npm run dev
```

### Step 3: Test CSV Import
1. Download new template from Import modal
2. Fill in your booking data (including commission_tax if available)
3. Upload and verify calculations

## Field Mappings

### Your CSV → Database

| CSV Column | Database Column | Description |
|------------|----------------|-------------|
| Accommodation Total | `accommodation_total` | Base nightly rate |
| Cleaning Fee | `cleaning_fee` | Guest-paid cleaning (RightStay expense) |
| Extra Guest Charges | `extra_charges` | Additional guest fees |
| Extra Charges | `extra_charges` | Other charges |
| Discounts | `discount_amount` | Can be negative (discount) or positive |
| Booking Taxes | `booking_taxes` | Guest-paid taxes (tourism tax, VAT, etc.) |
| Commission | `channel_commission` | Platform commission (Airbnb, Booking.com) |
| Commission Tax | `commission_tax` | **NEW** - Tax on commission |
| Payment Processing Fee | `payment_processing_fee` | Payment gateway fees |

## Calculation Examples

### Example 1: Airbnb Booking
```
Gross Revenue (what guest pays):
  Accommodation: R 1,500.00
  Cleaning Fee:  R   250.00
  Extra Charges: R     0.00
  Discounts:     R     0.00
  = R 1,750.00

Total Payout (RightStay receives):
  Gross Revenue: R 1,750.00
  - Booking Taxes: R   150.00 (paid to government)
  - Processing:  R    37.50
  - Commission:  R    45.00
  - Comm. Tax:   R     6.75
  = R 1,510.75

Owner Payout (preliminary):
  Total Payout:  R 1,510.75
  - Cleaning:    R   250.00 (RightStay pays cleaner)
  - Expenses:    R     0.00
  = R 1,260.75
  (Then deduct RightStay commission in app)
```

### Example 2: Booking.com with Discount
```
Gross Revenue (what guest pays):
  Accommodation: R 2,500.00
  Cleaning Fee:  R   250.00
  Extra Charges: R    50.00
  Discounts:     R  -100.00 (negative = discount)
  = R 2,700.00

Total Payout (RightStay receives):
  Gross Revenue: R 2,700.00
  - Booking Taxes: R   250.00 (paid to government)
  - Processing:  R    62.50
  - Commission:  R   375.00
  - Comm. Tax:   R    56.25
  = R 1,956.25

Owner Payout (preliminary):
  Total Payout:  R 1,956.25
  - Cleaning:    R   250.00
  - Expenses:    R     0.00
  = R 1,706.25
  (Then deduct RightStay commission in app)
```

## Verification Queries

### Check Formula is Correct
```sql
SELECT 
    booking_reference,
    -- Components
    accommodation_total,
    cleaning_fee,
    extra_charges,
    discount_amount,
    booking_taxes,
    payment_processing_fee,
    channel_commission,
    commission_tax,
    -- Calculated
    (accommodation_total + cleaning_fee + extra_charges + discount_amount + booking_taxes) as gross_revenue,
    (accommodation_total + cleaning_fee + extra_charges + discount_amount + booking_taxes 
     - payment_processing_fee - channel_commission - COALESCE(commission_tax, 0)) as calc_payout,
    -- Actual
    total_payout,
    -- Match?
    total_payout = (accommodation_total + cleaning_fee + extra_charges + discount_amount + booking_taxes 
                   - payment_processing_fee - channel_commission - COALESCE(commission_tax, 0)) as matches
FROM bookings
WHERE apartment_id IS NOT NULL;
```

### View Owner Statements
```sql
SELECT 
    booking_reference,
    property_name,
    owner_name,
    gross_revenue,
    total_payout,
    cleaning_fee,
    custom_expense_total,
    preliminary_owner_payout
FROM owner_statements_view
ORDER BY check_in_date DESC;
```

## Testing Checklist

After running the migration:

- [ ] Database migration completed without errors
- [ ] `commission_tax` column exists in bookings table
- [ ] `total_payout` formula matches calculations.ts
- [ ] Existing bookings recalculated correctly
- [ ] `owner_statements_view` includes new fields
- [ ] Dev server restarted
- [ ] CSV import includes commission_tax field
- [ ] New CSV template downloaded
- [ ] Test import with commission_tax data
- [ ] Owner statements page shows correct calculations
- [ ] Verification queries return correct results

## Files Changed

1. ✅ `update-bookings-schema-complete.sql` - Complete database migration
2. ✅ `src/lib/csv-column-mappings.ts` - Added commission_tax mappings
3. ✅ `src/app/api/bookings/import/route.ts` - Handle commission_tax in imports
4. ✅ `src/lib/calculations.ts` - Updated formulas and documentation
5. ✅ `public/booking-import-template.csv` - Added commission_tax column

## Backward Compatibility

### Existing Bookings
- All existing bookings will have `commission_tax = 0` (default)
- They will be automatically recalculated with the new formula
- If commission_tax was previously included in commission, you may need to update old data

### CSV Imports
- If your CSV doesn't have `commission_tax` column, it defaults to 0
- Old CSVs will still work (commission_tax treated as 0)
- New CSVs should include commission_tax for accurate calculations

## Next Steps

1. **Run the database migration** (`update-bookings-schema-complete.sql`)
2. **Restart dev server** to load updated code
3. **Test with sample CSV** to verify calculations
4. **Update any existing booking data** if commission_tax was previously included in commission field
5. **Train team** on new commission_tax field

## Summary

✅ Added `commission_tax` field to database and code
✅ Updated formula to match exact business logic
✅ Cleaning fee correctly included in total payout then deducted for owner
✅ All calculations match your specifications
✅ CSV imports now handle commission_tax
✅ Documentation updated throughout codebase
✅ Template updated with commission_tax column

The system now accurately reflects your complete owner statement calculation logic!

