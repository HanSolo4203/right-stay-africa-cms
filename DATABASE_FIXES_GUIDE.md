# Database Fixes Guide

## Issues Identified and Fixed

The dashboard was not fetching data due to several database and authentication issues:

### 1. Missing Database Column
**Problem**: The `apartments` table was missing the `cleaner_payout` column that the analytics code expected.

**Solution**: Run the SQL in `add-cleaner-payout-column.sql` to add the missing column.

### 2. Row Level Security (RLS) Policy Issues
**Problem**: The API routes were using server-side Supabase client but RLS policies only allowed `authenticated` role access, not `service_role`.

**Solution**: Updated RLS policies to include service role access for API routes.

### 3. API Authentication Issues
**Problem**: API routes were using client-side database functions instead of properly authenticated server-side client.

**Solution**: Updated all database API functions to use authenticated server-side Supabase client.

## Setup Instructions

### Step 1: Add Missing Database Column
Run this SQL in your Supabase SQL Editor:

```sql
-- Add cleaner_payout column to apartments table
ALTER TABLE apartments 
ADD COLUMN cleaner_payout DECIMAL(10,2);

-- Update existing apartments with default cleaner payout (R100)
UPDATE apartments 
SET cleaner_payout = 100.00 
WHERE cleaner_payout IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN apartments.cleaner_payout IS 'Amount paid to cleaners per cleaning session for this apartment (in ZAR)';
```

### Step 2: Update RLS Policies
Run the SQL in `updated-rls-policies.sql` in your Supabase SQL Editor. This will:

- Enable RLS on all tables
- Create policies for both `authenticated` and `service_role` access
- Allow API routes to access data while maintaining security

### Step 3: Verify Environment Variables
Ensure your `.env.local` file has the correct Supabase configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 4: Test the Dashboard
1. Start your development server: `npm run dev`
2. Navigate to `/dashboard`
3. Verify that data is loading properly

## What Was Fixed

### Database Layer (`src/lib/database.ts`)
- Added `getSupabaseClient()` helper function
- Updated all API functions to use authenticated server-side client
- Maintains fallback to client-side client if server client fails

### API Routes
- Now properly authenticate with user session
- Work correctly with RLS policies
- Can access data on behalf of authenticated users

### RLS Policies
- Allow both `authenticated` and `service_role` access
- Maintain security while enabling API functionality
- Support both direct user access and server-side operations

## Expected Results

After applying these fixes:

1. **Dashboard loads data**: Analytics, apartments, cleaners, and cleaning sessions should display
2. **Authentication works**: API routes properly authenticate with user session
3. **Security maintained**: RLS policies still protect data while allowing necessary access
4. **Cleaner payouts work**: Analytics calculations include cleaner payout data

## Troubleshooting

If data still doesn't load:

1. Check browser console for errors
2. Verify Supabase connection in Network tab
3. Ensure user is properly authenticated
4. Check Supabase logs for RLS policy violations
5. Verify all SQL scripts were run successfully

## Files Modified

- `src/lib/database.ts` - Updated to use authenticated server-side client
- `add-cleaner-payout-column.sql` - Adds missing database column
- `updated-rls-policies.sql` - Updated RLS policies with service role access

## Next Steps

1. Run the SQL scripts in your Supabase dashboard
2. Test the dashboard functionality
3. Verify all CRUD operations work correctly
4. Consider adding more specific RLS policies based on your security requirements
