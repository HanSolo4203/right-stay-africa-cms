-- Alternative Solution: Create a dedicated internal assets table
-- This approach creates a separate table for internal business assets
-- Run this in your Supabase SQL Editor

-- 1. Create internal_assets table
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

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_internal_assets_asset_name ON internal_assets(asset_name);
CREATE INDEX IF NOT EXISTS idx_internal_assets_asset_type ON internal_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_internal_assets_is_active ON internal_assets(is_active);

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_internal_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_internal_assets_updated_at ON internal_assets;
CREATE TRIGGER update_internal_assets_updated_at
    BEFORE UPDATE ON internal_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_internal_assets_updated_at();

-- 4. Insert RSA Laundry Room
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

-- 5. Create unified schedulable properties view
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

-- 6. Update cleaning_sessions table to support internal assets
DO $$ 
BEGIN
    -- Add property_category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cleaning_sessions' 
                   AND column_name = 'property_category') THEN
        ALTER TABLE cleaning_sessions 
        ADD COLUMN property_category TEXT DEFAULT 'apartment' 
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

-- 7. Update existing cleaning_sessions
UPDATE cleaning_sessions 
SET 
    property_id = apartment_id,
    property_category = 'apartment'
WHERE property_id IS NULL;

-- 8. Make property_id NOT NULL after populating
ALTER TABLE cleaning_sessions 
ALTER COLUMN property_id SET NOT NULL;

-- 9. Create indexes
CREATE INDEX IF NOT EXISTS idx_cleaning_sessions_property_category ON cleaning_sessions(property_category);
CREATE INDEX IF NOT EXISTS idx_cleaning_sessions_property_id ON cleaning_sessions(property_id);

-- 10. Set up Row-Level Security
ALTER TABLE internal_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON internal_assets;

-- Create new RLS policy
CREATE POLICY "Enable all operations for authenticated users" ON internal_assets
    FOR ALL USING (auth.role() = 'authenticated');

-- 11. Grant permissions
GRANT ALL ON internal_assets TO authenticated;
GRANT SELECT ON all_schedulable_properties TO authenticated;

-- 12. Create helper functions
CREATE OR REPLACE FUNCTION get_internal_asset_id(asset_name_param TEXT)
RETURNS UUID AS $$
DECLARE
    asset_id UUID;
BEGIN
    SELECT id INTO asset_id 
    FROM internal_assets 
    WHERE asset_name = asset_name_param 
    AND COALESCE(is_active, true) = true
    LIMIT 1;
    
    RETURN asset_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_internal_asset_exists(asset_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM internal_assets WHERE id = asset_id);
END;
$$ LANGUAGE plpgsql;

-- 13. Add comments
COMMENT ON TABLE internal_assets IS 'Internal business assets for Right Stay Africa (laundry services, maintenance, etc.)';
COMMENT ON FUNCTION get_internal_asset_id(TEXT) IS 'Returns the UUID of an internal asset by name';
COMMENT ON FUNCTION validate_internal_asset_exists(UUID) IS 'Validates that an internal asset exists';

-- 14. Create sample cleaners if none exist
INSERT INTO cleaners (name, phone, email) 
SELECT 'Wowo', '+27 82 123 4567', 'wowo@email.com'
WHERE NOT EXISTS (SELECT 1 FROM cleaners WHERE name = 'Wowo');

INSERT INTO cleaners (name, phone, email) 
SELECT 'Sylvia', '+27 82 987 6543', 'sylvia@email.com'
WHERE NOT EXISTS (SELECT 1 FROM cleaners WHERE name = 'Sylvia');

-- 15. Update existing cleaning sessions to have proper cleaner_id references
-- Note: This assumes existing sessions have cleaner_id already set or will be set manually
-- If you have existing sessions without cleaner_id, you'll need to update them manually

-- 16. Verification
SELECT 'Internal assets setup complete!' as status;
SELECT COUNT(*) as total_internal_assets FROM internal_assets;
SELECT COUNT(*) as total_schedulable_properties FROM all_schedulable_properties;
SELECT * FROM internal_assets WHERE asset_name = 'RSA Laundry Room';
