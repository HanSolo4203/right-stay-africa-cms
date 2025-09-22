-- Quick Fix for Database Issues
-- Run this in your Supabase SQL Editor to fix the immediate problems

-- 1. Fix Row-Level Security policies for cleaners table
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON cleaners;
DROP POLICY IF EXISTS "Enable read access for all users" ON cleaners;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON cleaners;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON cleaners;

CREATE POLICY "Enable all operations for authenticated users" ON cleaners
    FOR ALL USING (auth.role() = 'authenticated');

-- 2. Fix Row-Level Security policies for apartments table
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON apartments;
DROP POLICY IF EXISTS "Enable read access for all users" ON apartments;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON apartments;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON apartments;

CREATE POLICY "Enable all operations for authenticated users" ON apartments
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Fix Row-Level Security policies for cleaning_sessions table
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON cleaning_sessions;
DROP POLICY IF EXISTS "Enable read access for all users" ON cleaning_sessions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON cleaning_sessions;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON cleaning_sessions;

CREATE POLICY "Enable all operations for authenticated users" ON cleaning_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Create internal_assets table
CREATE TABLE IF NOT EXISTS internal_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_name TEXT NOT NULL UNIQUE,
    asset_type TEXT DEFAULT 'LAUNDRY_SERVICE' CHECK (asset_type IN ('LAUNDRY_SERVICE', 'MAINTENANCE_SERVICE', 'OTHER_SERVICE')),
    owner_name TEXT NOT NULL DEFAULT 'Right Stay Africa',
    owner_email TEXT DEFAULT 'admin@rightstayafrica.com',
    location TEXT,
    daily_payment_rate DECIMAL(10,2) NOT NULL,
    service_description TEXT,
    cleaner_payout DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Set up RLS for internal_assets
ALTER TABLE internal_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for authenticated users" ON internal_assets
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. Insert RSA Laundry Room
INSERT INTO internal_assets (
    asset_name,
    asset_type,
    owner_name,
    owner_email,
    location,
    daily_payment_rate,
    service_description,
    cleaner_payout,
    is_active
) VALUES (
    'RSA Laundry Room',
    'LAUNDRY_SERVICE',
    'Right Stay Africa',
    'admin@rightstayafrica.com',
    'Internal Business Space',
    200.00,
    'Internal laundry service for Right Stay Africa properties',
    200.00,
    true
) ON CONFLICT (asset_name) DO UPDATE SET
    is_active = true,
    daily_payment_rate = 200.00,
    cleaner_payout = 200.00,
    updated_at = NOW();

-- 7. Add columns to cleaning_sessions if they don't exist
DO $$ 
BEGIN
    -- Add property_category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cleaning_sessions' 
                   AND column_name = 'property_category') THEN
        ALTER TABLE cleaning_sessions 
        ADD COLUMN property_category TEXT DEFAULT 'apartment';
        
        -- Add the check constraint separately
        ALTER TABLE cleaning_sessions 
        ADD CONSTRAINT cleaning_sessions_property_category_check 
        CHECK (property_category IN ('apartment', 'internal_asset'));
    ELSE
        -- If column exists but constraint might be different, drop and recreate it
        ALTER TABLE cleaning_sessions 
        DROP CONSTRAINT IF EXISTS cleaning_sessions_property_category_check;
        
        ALTER TABLE cleaning_sessions 
        ADD CONSTRAINT cleaning_sessions_property_category_check 
        CHECK (property_category IN ('apartment', 'internal_asset'));
    END IF;

    -- Add property_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cleaning_sessions' 
                   AND column_name = 'property_id') THEN
        ALTER TABLE cleaning_sessions 
        ADD COLUMN property_id UUID;
    END IF;

    -- Add welcome_pack_fee column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cleaning_sessions' 
                   AND column_name = 'welcome_pack_fee') THEN
        ALTER TABLE cleaning_sessions 
        ADD COLUMN welcome_pack_fee DECIMAL(10,2);
    END IF;
END $$;

-- 8. Update existing cleaning_sessions to populate property_id and property_category
UPDATE cleaning_sessions 
SET 
    property_id = apartment_id,
    property_category = 'apartment'
WHERE property_id IS NULL;

-- 9. Make property_id NOT NULL after populating
ALTER TABLE cleaning_sessions 
ALTER COLUMN property_id SET NOT NULL;

-- 10. Create unified schedulable properties view
DROP VIEW IF EXISTS all_schedulable_properties CASCADE;

CREATE VIEW all_schedulable_properties AS
SELECT 
    'apartment' as property_category,
    id,
    apartment_number as property_name,
    owner_name,
    owner_email,
    address as location,
    cleaner_payout,
    NULL as asset_type,
    NULL as service_description,
    NULL as daily_payment_rate,
    true as is_active
FROM apartments
WHERE apartment_number IS NOT NULL

UNION ALL

SELECT 
    'internal_asset' as property_category,
    id,
    asset_name as property_name,
    owner_name,
    owner_email,
    location,
    cleaner_payout,
    asset_type,
    service_description,
    daily_payment_rate,
    COALESCE(is_active, true) as is_active
FROM internal_assets
WHERE asset_name IS NOT NULL;

-- 11. Create sample cleaners if none exist
INSERT INTO cleaners (name, phone, email) 
SELECT 'Wowo', '+27 82 123 4567', 'wowo@email.com'
WHERE NOT EXISTS (SELECT 1 FROM cleaners WHERE name = 'Wowo');

INSERT INTO cleaners (name, phone, email) 
SELECT 'Sylvia', '+27 82 987 6543', 'sylvia@email.com'
WHERE NOT EXISTS (SELECT 1 FROM cleaners WHERE name = 'Sylvia');

-- 12. Grant permissions
GRANT ALL ON internal_assets TO authenticated;
GRANT SELECT ON all_schedulable_properties TO authenticated;

-- 13. Verification
SELECT 'Database fix complete!' as status;
SELECT COUNT(*) as total_cleaners FROM cleaners;
SELECT COUNT(*) as total_internal_assets FROM internal_assets;
SELECT COUNT(*) as total_schedulable_properties FROM all_schedulable_properties;
SELECT * FROM internal_assets WHERE asset_name = 'RSA Laundry Room';
