# CSV Import Error Fix - Guest Creation Issue

## Problem
CSV import was failing with error: `Failed to create guest` when processing rows.

## Root Cause
The API was using the Supabase client with the **anon key** which respects Row Level Security (RLS) policies. The `guests` table had RLS policies that only allowed:
- **SELECT** for authenticated users
- **ALL** operations for service role

But there was **no INSERT policy for authenticated users**, so guest creation was being blocked by RLS.

## Solution
Updated the import API to use the **service role client** which bypasses RLS policies, allowing full database access for admin operations like CSV imports.

### Changes Made

#### 1. Added Service Role Client (`src/lib/supabase-server.ts`)
```typescript
// New function to create admin client with service role key
export const createServiceRoleClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
```

#### 2. Updated Import Route (`src/app/api/bookings/import/route.ts`)
Changed from:
```typescript
const supabase = await createServerComponentClient(); // Uses anon key
```

To:
```typescript
const supabase = createServiceRoleClient(); // Uses service role key
```

#### 3. Improved Error Handling
Updated `getOrCreateGuest()` function to:
- Show detailed error messages with error codes
- Handle "not found" errors properly (PGRST116)
- Set NULL values explicitly for optional fields
- Log detailed error information

#### 4. Added Service Role Key to Environment
Added to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## How to Apply the Fix

### Step 1: Restart Your Development Server
The service role key was added to `.env.local`, so you need to restart:

```bash
# Stop your current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 2: Test the Import
1. Go to **Finance > Owner Statements**
2. Click **"Import CSV"**
3. Upload your CSV file
4. It should now successfully create guests and import bookings

## Why Service Role Key is Safe

The service role key is only used:
- **Server-side** in API routes (not exposed to browser)
- **For admin operations** like CSV imports
- **In controlled contexts** where you need to bypass RLS

It's stored in:
- `.env.local` (not committed to git - in .gitignore)
- Server environment only

## Alternative Solution (If Needed)

If you prefer not to use the service role key, you can add INSERT/UPDATE policies for authenticated users:

```sql
-- Run in Supabase SQL Editor
CREATE POLICY "Allow authenticated users to insert guests" 
ON guests FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert bookings" 
ON bookings FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert booking_channels" 
ON booking_channels FOR INSERT 
TO authenticated 
WITH CHECK (true);
```

However, using the service role key is the recommended approach for admin operations.

## Testing Checklist

After restarting the dev server, verify:
- [ ] CSV file is analyzed correctly
- [ ] Column mappings are detected
- [ ] Import proceeds without "Failed to create guest" errors
- [ ] Guests are created in the database
- [ ] Bookings are created successfully
- [ ] Owner statements page shows imported data

## Error Messages to Look For

### Before Fix:
```
Error processing row 2: Error: Failed to create guest
Failed to create guest: No data returned
```

### After Fix:
```
Successfully imported X bookings
CSV analyzed: X rows detected
```

## Security Notes

⚠️ **Important:**
- Never commit `.env.local` to git
- Service role key has full database access
- Only use in trusted server-side API routes
- Never expose service role key to the browser/client

## Summary

✅ **Service role key added to environment**
✅ **Import API updated to use service role client**
✅ **Better error handling with detailed messages**
✅ **RLS bypass for admin operations**

**Action Required:** Restart your development server to load the new environment variable!

