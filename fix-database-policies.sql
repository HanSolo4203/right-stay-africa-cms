-- Fix Database Policies and Constraints for RSA Laundry Room Support
-- Run this in your Supabase SQL Editor

-- 1. Fix Row-Level Security policies for cleaners table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON cleaners;
DROP POLICY IF EXISTS "Enable read access for all users" ON cleaners;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON cleaners;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON cleaners;

-- Create new RLS policies for cleaners table
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

-- 4. Fix Row-Level Security policies for rsa_laundry_assets table
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON rsa_laundry_assets;

CREATE POLICY "Enable all operations for authenticated users" ON rsa_laundry_assets
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Update the cleaning_sessions table to handle RSA assets properly
-- First, let's check if the new columns exist and add them if they don't
DO $$ 
BEGIN
    -- Add property_category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cleaning_sessions' 
                   AND column_name = 'property_category') THEN
        ALTER TABLE cleaning_sessions 
        ADD COLUMN property_category TEXT DEFAULT 'apartment' 
        CHECK (property_category IN ('apartment', 'rsa_asset'));
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

-- 6. Update existing cleaning_sessions to populate property_id and property_category
UPDATE cleaning_sessions 
SET 
    property_id = apartment_id,
    property_category = 'apartment'
WHERE property_id IS NULL;

-- 7. Make property_id NOT NULL after populating
ALTER TABLE cleaning_sessions 
ALTER COLUMN property_id SET NOT NULL;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cleaning_sessions_property_category ON cleaning_sessions(property_category);
CREATE INDEX IF NOT EXISTS idx_cleaning_sessions_property_id ON cleaning_sessions(property_id);

-- 9. Update the foreign key constraint to be more flexible
-- First, drop the existing foreign key constraint
ALTER TABLE cleaning_sessions 
DROP CONSTRAINT IF EXISTS cleaning_sessions_apartment_id_fkey;

-- Create a new constraint that allows NULL apartment_id for RSA assets
ALTER TABLE cleaning_sessions 
ADD CONSTRAINT cleaning_sessions_apartment_id_fkey 
FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE;

-- 10. Ensure RSA Laundry Room asset exists and is active
INSERT INTO rsa_laundry_assets (
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

-- 11. Create or update the unified view for schedulable properties
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
    'rsa_asset' as property_category,
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
FROM rsa_laundry_assets
WHERE asset_name IS NOT NULL;

-- 12. Grant necessary permissions
GRANT SELECT ON all_schedulable_properties TO authenticated;
GRANT ALL ON cleaners TO authenticated;
GRANT ALL ON apartments TO authenticated;
GRANT ALL ON cleaning_sessions TO authenticated;
GRANT ALL ON rsa_laundry_assets TO authenticated;

-- 13. Create a function to get RSA Laundry Room ID
CREATE OR REPLACE FUNCTION get_rsa_laundry_room_id()
RETURNS UUID AS $$
DECLARE
    asset_id UUID;
BEGIN
    SELECT id INTO asset_id 
    FROM rsa_laundry_assets 
    WHERE asset_name = 'RSA Laundry Room' 
    AND COALESCE(is_active, true) = true
    LIMIT 1;
    
    RETURN asset_id;
END;
$$ LANGUAGE plpgsql;

-- 14. Create a function to validate property exists
CREATE OR REPLACE FUNCTION validate_property_exists(property_id UUID, property_category TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF property_category = 'apartment' THEN
        RETURN EXISTS(SELECT 1 FROM apartments WHERE id = property_id);
    ELSIF property_category = 'rsa_asset' THEN
        RETURN EXISTS(SELECT 1 FROM rsa_laundry_assets WHERE id = property_id);
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 15. Add comments for documentation
COMMENT ON FUNCTION get_rsa_laundry_room_id() IS 'Returns the UUID of the RSA Laundry Room asset';
COMMENT ON FUNCTION validate_property_exists(UUID, TEXT) IS 'Validates that a property exists in the appropriate table based on category';
COMMENT ON VIEW all_schedulable_properties IS 'Unified view of all properties that can be scheduled for cleaning (apartments and RSA assets)';

-- 16. Create a sample cleaner if none exist
INSERT INTO cleaners (name, phone, email) 
SELECT 'Wowo', '+27 82 123 4567', 'wowo@email.com'
WHERE NOT EXISTS (SELECT 1 FROM cleaners WHERE name = 'Wowo');

INSERT INTO cleaners (name, phone, email) 
SELECT 'Sylvia', '+27 82 987 6543', 'sylvia@email.com'
WHERE NOT EXISTS (SELECT 1 FROM cleaners WHERE name = 'Sylvia');

-- 17. Update existing cleaning sessions to have proper cleaner_id references
-- Note: This assumes existing sessions have cleaner_id already set or will be set manually
-- If you have existing sessions without cleaner_id, you'll need to update them manually

-- 18. Create a trigger to automatically set property_id when apartment_id is set
CREATE OR REPLACE FUNCTION set_property_id_from_apartment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.apartment_id IS NOT NULL AND NEW.property_id IS NULL THEN
        NEW.property_id := NEW.apartment_id;
        NEW.property_category := 'apartment';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_property_id ON cleaning_sessions;
CREATE TRIGGER trigger_set_property_id
    BEFORE INSERT OR UPDATE ON cleaning_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_property_id_from_apartment();

-- 19. Final verification queries
SELECT 'Database setup complete!' as status;
SELECT COUNT(*) as total_cleaners FROM cleaners;
SELECT COUNT(*) as total_apartments FROM apartments;
SELECT COUNT(*) as total_rsa_assets FROM rsa_laundry_assets;
SELECT COUNT(*) as total_schedulable_properties FROM all_schedulable_properties;
