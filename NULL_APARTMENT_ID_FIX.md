# NULL Apartment ID Issue - Loading Animation Fix

## Problem
After CSV upload, the owner statements page shows a loading animation indefinitely and displays "0 bookings" even though bookings were created in the database.

## Root Cause
The bookings were created with `apartment_id = NULL`. The `owner_statements_view` uses an `INNER JOIN` with the apartments table, so bookings without an apartment ID don't appear in the view.

## Why apartment_id was NULL
The import code had a logical flaw - it was creating apartments successfully, but due to the query structure (`.single()` on potentially multiple results), it might have been throwing errors that weren't properly caught, causing the apartment ID to not be assigned to bookings.

## Solution

### 1. Fixed Import Code (`src/app/api/bookings/import/route.ts`)
Added better error handling and logging:
- ✅ Verify apartment ID exists before creating booking
- ✅ Log apartment creation/finding for debugging
- ✅ Better error messages for apartment creation failures  
- ✅ Log booking creation with apartment_id for verification
- ✅ Return booking data to confirm creation

### 2. Clean Up Existing Bad Data
The test bookings with `apartment_id = NULL` need to be deleted before re-importing.

**Run this SQL in Supabase SQL Editor:**
```sql
DELETE FROM bookings WHERE apartment_id IS NULL;
```

This will delete the 3 test bookings that were created without proper apartment linkage.

### 3. Re-import Your CSV
After deleting the bad bookings and restarting your dev server:
1. Go to **Finance > Owner Statements**
2. Click **"Import CSV"**
3. Upload your CSV file
4. Check the browser console for detailed logs
5. After import completes, the page should show your bookings

## What to Expect After Fix

### Console Logs (Check Browser Dev Tools)
You should see logs like:
```
Row 2: Found existing apartment [uuid] for property 126709
Row 2: Creating booking with apartment_id=[uuid], guest_id=[uuid]
Row 2: Successfully created booking [uuid]
```

### Owner Statements Page
- Should show correct booking counts
- Should display properties with bookings
- Should show financial totals
- No more infinite loading animation

### Database Verification
```sql
-- All bookings should have apartment_id
SELECT COUNT(*) FROM bookings WHERE apartment_id IS NULL;  -- Should be 0

-- View should now return data
SELECT COUNT(*) FROM owner_statements_view;  -- Should match booking count

-- Check specific bookings
SELECT 
    b.booking_reference,
    a.apartment_number,
    a.owner_name,
    g.name as guest_name
FROM bookings b
JOIN apartments a ON b.apartment_id = a.id
JOIN guests g ON b.guest_id = g.id;
```

## Steps to Fix

### Step 1: Delete Bad Bookings
```sql
DELETE FROM bookings WHERE apartment_id IS NULL;
```

### Step 2: Restart Dev Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 3: Re-import CSV
1. Upload CSV via Import modal
2. Watch console logs for errors
3. Verify bookings appear on owner statements page

## Technical Details

### Why .single() Was Problematic
The original code used:
```typescript
const { data: existingApt } = await supabase
  .from('apartments')
  .select('id')
  .ilike('apartment_number', `%${bookingData.property_id}%`)
  .limit(1)
  .single();
```

The `.single()` method throws an error if:
- No results found (expected behavior)
- Multiple results found (unexpected)

If an error occurred, it wasn't being caught properly, so `existingApt` would be undefined, and the apartment creation logic might have created the apartment but the error handling caused the flow to continue with `apartmentId = null`.

### Improved Error Handling
Now we:
1. Check if `existingApt` has data (apartment found)
2. If not, create new apartment with proper error handling
3. Verify `apartmentId` is set before proceeding
4. Log every step for debugging
5. Return booking data to verify creation

### Why Apartments Were Created But Not Linked
The apartments with IDs "126709" and "129921" exist in the database, proving the apartment creation logic worked. However, the booking inserts still ended up with `apartment_id = NULL`, suggesting either:
- An error occurred between apartment creation and booking insert
- The apartment ID variable wasn't properly passed to the insert
- A silent failure in the booking insert that we're now catching

## Prevention

Going forward, the improved logging will show:
- When apartments are found vs created
- Exact apartment IDs being used
- When bookings are successfully created
- Any errors at each step

## Testing Checklist

After implementing the fix:
- [ ] Delete bad bookings from database
- [ ] Restart dev server
- [ ] Upload CSV file
- [ ] Check browser console for logs
- [ ] Verify import success message
- [ ] Check owner statements page loads with data
- [ ] Verify booking counts are correct
- [ ] Check that property names and owners appear
- [ ] Confirm financial totals calculate correctly

## Troubleshooting

### Still Seeing Loading Animation
- Check browser console for errors
- Verify bookings have apartment_id: `SELECT COUNT(*) FROM bookings WHERE apartment_id IS NULL;`
- Check view has data: `SELECT * FROM owner_statements_view LIMIT 5;`

### Import Says "Success" But No Data
- Check logs for actual import count
- Verify service role key is loaded (restart server)
- Check for errors in console logs
- Verify property IDs in CSV exist in cached_properties

### Bookings Created But Still NULL apartment_id
- This shouldn't happen with the new code
- Check console logs for apartment creation messages
- Verify apartments table has entries matching your property IDs
- Check for RLS policy errors (shouldn't occur with service role key)

## Summary

✅ **Improved error handling and logging**
✅ **Verify apartment_id before booking creation**
✅ **Better console output for debugging**
✅ **Instructions to clean up bad data**

**Next Steps:**
1. Delete NULL apartment_id bookings
2. Restart dev server  
3. Re-import CSV with better error handling

