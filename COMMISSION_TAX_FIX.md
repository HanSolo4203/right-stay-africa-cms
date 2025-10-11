# Commission Tax Field - Missing Values Fix

## Issue
Some CSV records don't have a `commission_tax` value, causing import to fail or use incorrect values.

## Solution
The system now handles missing commission_tax gracefully:

### 1. Database Level
- Column has `DEFAULT 0.00` value
- Column is `NOT NULL` (always has a value)
- Existing records are updated to 0 if NULL

### 2. Import Level
- If CSV doesn't have `commission_tax` column → defaults to 0
- If CSV has column but value is empty → defaults to 0
- If CSV has value → uses that value

### 3. Formula Level
- Uses `COALESCE(commission_tax, 0)` to handle any NULL values
- Formula still works even if commission_tax is missing

## How It Works

### CSV with commission_tax
```csv
property_id,booking_reference,...,commission_tax,...
126709,AIR-001,...,6.75,...  ← Uses 6.75
129921,BOOK-002,...,,...      ← Empty, uses 0
```

### CSV without commission_tax column
```csv
property_id,booking_reference,...,channel_commission,...
126709,AIR-001,...,45.00,...  ← commission_tax defaults to 0
```

## What Gets Calculated

### Scenario 1: CSV has commission_tax
```
Gross Revenue: R 1,900.00
- Processing:  R    37.50
- Commission:  R    45.00
- Comm. Tax:   R     6.75  ← From CSV
= Total Payout: R 1,810.75
```

### Scenario 2: CSV doesn't have commission_tax
```
Gross Revenue: R 1,900.00
- Processing:  R    37.50
- Commission:  R    45.00
- Comm. Tax:   R     0.00  ← Defaults to 0
= Total Payout: R 1,817.50
```

## Migration Changes

The updated migration (`update-bookings-schema-complete.sql`) now:

1. ✅ Checks if column exists before adding
2. ✅ Sets NOT NULL with DEFAULT 0.00
3. ✅ Updates existing records to ensure no NULLs
4. ✅ Uses COALESCE in formula for safety

## CSV Import Behavior

### Column Mapping
The system looks for these column names (case-insensitive):
- `commission_tax`
- `commission tax`
- `tax_on_commission`
- `commission_vat`
- `vat_on_commission`

### Default Value Handling
```typescript
commission_tax: parseFloat(getColumnValue(row, 'commission_tax') || '0')
```

If the column or value is missing, it uses `0`.

## Best Practices

### If You Have Commission Tax Data
Include it in your CSV:
```csv
...,channel_commission,commission_tax,...
...,45.00,6.75,...
```

### If You Don't Have Commission Tax Data
Just omit the column entirely - it will default to 0:
```csv
...,channel_commission,payment_processing_fee,...
...,45.00,37.50,...
```

### If Some Rows Have It, Some Don't
Include the column but leave cells empty for rows without it:
```csv
...,commission_tax,...
...,6.75,...        ← Has value
...,...             ← Empty, will be 0
...,0.00,...        ← Explicit 0
```

## Verification

After running the migration, verify:

```sql
-- Check all bookings have a commission_tax value (no NULLs)
SELECT COUNT(*) 
FROM bookings 
WHERE commission_tax IS NULL;
-- Should return 0

-- Check default value works
SELECT 
    booking_reference,
    channel_commission,
    commission_tax,
    total_payout
FROM bookings
LIMIT 10;
```

## Troubleshooting

### Import Still Failing
1. Verify migration ran successfully
2. Check `commission_tax` column exists: `\d bookings` in Supabase
3. Restart dev server after migration
4. Check browser console for specific errors

### Total Payout Seems Wrong
1. Verify commission_tax values in database
2. Check if commission_tax was previously included in channel_commission
3. You may need to adjust data if commission and commission_tax were combined

### Some Bookings Have Wrong Values
If commission_tax was previously included in channel_commission field:
```sql
-- Example: If commission_tax is 15% of commission
UPDATE bookings
SET commission_tax = channel_commission * 0.15;

-- Then reduce commission accordingly
UPDATE bookings
SET channel_commission = channel_commission - commission_tax;
```

## Summary

✅ **Database column defaults to 0**
✅ **CSV import handles missing values**
✅ **Formula uses COALESCE for safety**
✅ **Works with or without commission_tax in CSV**
✅ **All existing bookings set to 0 (can be updated later)**

Your CSV import will now work whether commission_tax is present or not!

