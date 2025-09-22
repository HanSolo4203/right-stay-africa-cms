-- Add multi-cleaner support fields to cleaning_sessions table
-- This migration adds fields to support storing multiple cleaners in a single session record

-- Add new columns for multi-cleaner support
ALTER TABLE cleaning_sessions 
ADD COLUMN IF NOT EXISTS cleaner_2_id UUID REFERENCES cleaners(id),
ADD COLUMN IF NOT EXISTS cleaner_1_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS cleaner_2_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS cleaner_1_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cleaner_2_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_cleaning_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS is_multi_cleaner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cleaner_count INTEGER DEFAULT 1;

-- Add comments to explain the new fields
COMMENT ON COLUMN cleaning_sessions.cleaner_2_id IS 'Second cleaner ID for multi-cleaner sessions';
COMMENT ON COLUMN cleaning_sessions.cleaner_1_name IS 'Name of the first/primary cleaner (denormalized for performance)';
COMMENT ON COLUMN cleaning_sessions.cleaner_2_name IS 'Name of the second cleaner (denormalized for performance)';
COMMENT ON COLUMN cleaning_sessions.cleaner_1_fee IS 'Individual fee for the first cleaner';
COMMENT ON COLUMN cleaning_sessions.cleaner_2_fee IS 'Individual fee for the second cleaner';
COMMENT ON COLUMN cleaning_sessions.total_cleaning_fee IS 'Total fee for all cleaners in this session';
COMMENT ON COLUMN cleaning_sessions.is_multi_cleaner IS 'Flag indicating if this session has multiple cleaners';
COMMENT ON COLUMN cleaning_sessions.cleaner_count IS 'Number of cleaners assigned to this session';

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_cleaning_sessions_cleaner_2_id ON cleaning_sessions(cleaner_2_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_sessions_is_multi_cleaner ON cleaning_sessions(is_multi_cleaner);
CREATE INDEX IF NOT EXISTS idx_cleaning_sessions_cleaner_count ON cleaning_sessions(cleaner_count);

-- Update existing records to populate the new fields
UPDATE cleaning_sessions 
SET 
    cleaner_1_name = (
        SELECT c.name 
        FROM cleaners c 
        WHERE c.id = cleaning_sessions.cleaner_id
    ),
    cleaner_1_fee = price,
    total_cleaning_fee = price,
    is_multi_cleaner = FALSE,
    cleaner_count = 1
WHERE cleaner_1_name IS NULL;

-- Update the cleaning_sessions_detailed view to include the new fields
DROP VIEW IF EXISTS cleaning_sessions_detailed;

CREATE VIEW cleaning_sessions_detailed AS
SELECT 
    cs.id,
    cs.apartment_id,
    cs.cleaner_id,
    cs.cleaner_2_id,
    cs.cleaning_date,
    cs.notes,
    cs.price,
    cs.welcome_pack_fee,
    cs.cleaner_1_name,
    cs.cleaner_2_name,
    cs.cleaner_1_fee,
    cs.cleaner_2_fee,
    cs.total_cleaning_fee,
    cs.is_multi_cleaner,
    cs.cleaner_count,
    cs.property_category,
    cs.property_id,
    cs.created_at,
    cs.updated_at,
    a.apartment_number,
    a.owner_name,
    a.owner_email,
    a.location,
    c.name AS cleaner_name,
    c.email AS cleaner_email,
    c.phone AS cleaner_phone,
    c2.name AS cleaner_2_name_view,
    c2.email AS cleaner_2_email,
    c2.phone AS cleaner_2_phone
FROM cleaning_sessions cs
LEFT JOIN apartments a ON cs.apartment_id = a.id
LEFT JOIN cleaners c ON cs.cleaner_id = c.id
LEFT JOIN cleaners c2 ON cs.cleaner_2_id = c2.id;

-- Add RLS policies for the new columns
ALTER TABLE cleaning_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view cleaning sessions" ON cleaning_sessions;
DROP POLICY IF EXISTS "Users can insert cleaning sessions" ON cleaning_sessions;
DROP POLICY IF EXISTS "Users can update cleaning sessions" ON cleaning_sessions;
DROP POLICY IF EXISTS "Users can delete cleaning sessions" ON cleaning_sessions;

CREATE POLICY "Users can view cleaning sessions" ON cleaning_sessions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert cleaning sessions" ON cleaning_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update cleaning sessions" ON cleaning_sessions
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete cleaning sessions" ON cleaning_sessions
    FOR DELETE USING (true);

-- Create a function to automatically calculate total_cleaning_fee
CREATE OR REPLACE FUNCTION calculate_total_cleaning_fee()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total fee from individual cleaner fees
    NEW.total_cleaning_fee = COALESCE(NEW.cleaner_1_fee, 0) + COALESCE(NEW.cleaner_2_fee, 0);
    
    -- Update cleaner count
    NEW.cleaner_count = CASE 
        WHEN NEW.cleaner_2_id IS NOT NULL THEN 2
        ELSE 1
    END;
    
    -- Update multi-cleaner flag
    NEW.is_multi_cleaner = (NEW.cleaner_count > 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate total fee
DROP TRIGGER IF EXISTS trigger_calculate_total_cleaning_fee ON cleaning_sessions;
CREATE TRIGGER trigger_calculate_total_cleaning_fee
    BEFORE INSERT OR UPDATE ON cleaning_sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_cleaning_fee();

-- Update the get_cleaning_sessions_detailed function to include new fields
DROP FUNCTION IF EXISTS get_cleaning_sessions_detailed();

CREATE OR REPLACE FUNCTION get_cleaning_sessions_detailed()
RETURNS TABLE (
    id UUID,
    apartment_id UUID,
    cleaner_id UUID,
    cleaner_2_id UUID,
    cleaning_date DATE,
    notes TEXT,
    price DECIMAL(10,2),
    welcome_pack_fee DECIMAL(10,2),
    cleaner_1_name VARCHAR(255),
    cleaner_2_name VARCHAR(255),
    cleaner_1_fee DECIMAL(10,2),
    cleaner_2_fee DECIMAL(10,2),
    total_cleaning_fee DECIMAL(10,2),
    is_multi_cleaner BOOLEAN,
    cleaner_count INTEGER,
    property_category VARCHAR(50),
    property_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    apartment_number VARCHAR(50),
    owner_name VARCHAR(255),
    owner_email VARCHAR(255),
    location TEXT,
    cleaner_name VARCHAR(255),
    cleaner_email VARCHAR(255),
    cleaner_phone VARCHAR(20),
    cleaner_2_name_view VARCHAR(255),
    cleaner_2_email VARCHAR(255),
    cleaner_2_phone VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.apartment_id,
        cs.cleaner_id,
        cs.cleaner_2_id,
        cs.cleaning_date,
        cs.notes,
        cs.price,
        cs.welcome_pack_fee,
        cs.cleaner_1_name,
        cs.cleaner_2_name,
        cs.cleaner_1_fee,
        cs.cleaner_2_fee,
        cs.total_cleaning_fee,
        cs.is_multi_cleaner,
        cs.cleaner_count,
        cs.property_category,
        cs.property_id,
        cs.created_at,
        cs.updated_at,
        a.apartment_number,
        a.owner_name,
        a.owner_email,
        a.location,
        c.name AS cleaner_name,
        c.email AS cleaner_email,
        c.phone AS cleaner_phone,
        c2.name AS cleaner_2_name_view,
        c2.email AS cleaner_2_email,
        c2.phone AS cleaner_2_phone
    FROM cleaning_sessions cs
    LEFT JOIN apartments a ON cs.apartment_id = a.id
    LEFT JOIN cleaners c ON cs.cleaner_id = c.id
    LEFT JOIN cleaners c2 ON cs.cleaner_2_id = c2.id;
END;
$$ LANGUAGE plpgsql;
