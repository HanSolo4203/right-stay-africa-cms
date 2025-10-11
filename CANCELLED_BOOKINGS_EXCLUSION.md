# Cancelled Bookings Exclusion from Owner Statements

## Overview

Cancelled bookings are now excluded from owner statements while still being stored in the database. This prevents showing unpaid accommodation values from channels like Booking.com where cancelled bookings may still have accommodation totals.

## How It Works

### 1. Database Storage
- **Cancelled bookings ARE stored** in the `bookings` table
- All booking data is preserved for record-keeping
- Status is normalized to `'cancelled'` during CSV import

### 2. Owner Statements View
- **Cancelled bookings are EXCLUDED** from `owner_statements_view`
- View filters out `WHERE booking_status != 'cancelled'`
- Only active bookings appear in financial statements

### 3. CSV Import
- Cancelled bookings are imported normally
- Status mapping handles various formats:
  - `'cancelled'` → `'cancelled'`
  - `'canceled'` → `'cancelled'`
  - Other statuses remain unchanged

## Benefits

✅ **Accurate Financial Statements**: No unpaid accommodation values from cancelled bookings
✅ **Complete Data Retention**: All booking records preserved in database
✅ **Channel-Specific Handling**: Especially important for Booking.com cancellations
✅ **Audit Trail**: Full booking history maintained

## Implementation Details

### Database View Update
```sql
-- Updated owner_statements_view excludes cancelled bookings
WHERE b.booking_status != 'cancelled'
```

### CSV Import Status Mapping
```typescript
const statusMap = {
  'cancelled': 'cancelled',
  'canceled': 'cancelled',
  // ... other mappings
};
```

## Testing

Run the test script to verify functionality:
```sql
-- Run test-cancelled-bookings-exclusion.sql
```

Expected results:
- Cancelled bookings exist in `bookings` table
- Cancelled bookings do NOT appear in `owner_statements_view`
- Owner statements show only active bookings

## Files Modified

1. **`update-owner-statements-view-exclude-cancelled.sql`** - Updated view definition
2. **`test-cancelled-bookings-exclusion.sql`** - Test script
3. **CSV import logic** - Already handled cancelled status correctly

## Usage

### For Users
- Import CSV files normally - cancelled bookings will be stored
- View owner statements - cancelled bookings won't appear
- Check database directly if you need to see cancelled bookings

### For Developers
- Use `bookings` table for complete booking history
- Use `owner_statements_view` for financial statements only
- Filter by `booking_status != 'cancelled'` for active bookings

## Example Scenarios

### Scenario 1: Booking.com Cancellation
1. Guest books accommodation: R 2,500
2. Booking is cancelled (never paid)
3. CSV import stores booking with `status = 'cancelled'`
4. Owner statement shows R 0 (booking excluded)
5. Database retains full record for audit

### Scenario 2: Airbnb Cancellation
1. Guest books accommodation: R 1,800
2. Booking is cancelled (refunded)
3. CSV import stores booking with `status = 'cancelled'`
4. Owner statement shows R 0 (booking excluded)
5. Database retains full record for audit

## Migration Steps

1. **Run the updated view**:
   ```sql
   -- Execute update-owner-statements-view-exclude-cancelled.sql
   ```

2. **Test the changes**:
   ```sql
   -- Execute test-cancelled-bookings-exclusion.sql
   ```

3. **Verify owner statements**:
   - Check that cancelled bookings don't appear
   - Verify financial totals are correct
   - Confirm data integrity

## Rollback

If needed, the original view can be restored by removing the `WHERE` clause:
```sql
-- Remove the WHERE clause to include cancelled bookings again
DROP VIEW IF EXISTS owner_statements_view;
-- Recreate without the WHERE filter
```
