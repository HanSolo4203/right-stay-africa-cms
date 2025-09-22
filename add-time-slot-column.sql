-- Add time_slot column to cleaning_sessions table
-- This allows scheduling cleaning sessions at specific times

-- Add time_slot column to cleaning_sessions table
DO $$ 
BEGIN
    -- Add time_slot column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cleaning_sessions' 
        AND column_name = 'time_slot'
    ) THEN
        ALTER TABLE cleaning_sessions 
        ADD COLUMN time_slot TIME;
        
        -- Add comment
        COMMENT ON COLUMN cleaning_sessions.time_slot IS 'Time slot for the cleaning session (e.g., 09:00, 14:30)';
    END IF;
END $$;

-- Update the cleaning_sessions_detailed view to include time_slot
DROP VIEW IF EXISTS cleaning_sessions_detailed CASCADE;

CREATE VIEW cleaning_sessions_detailed AS
SELECT 
    cs.id,
    cs.apartment_id,
    cs.cleaner_id,
    cs.cleaner_2_id,
    cs.cleaning_date,
    cs.time_slot,
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
    a.address,
    c.name as cleaner_name,
    c.email as cleaner_email,
    c.phone as cleaner_phone,
    c2.name as cleaner_2_name_view,
    c2.email as cleaner_2_email,
    c2.phone as cleaner_2_phone
FROM cleaning_sessions cs
LEFT JOIN apartments a ON cs.apartment_id = a.id
LEFT JOIN cleaners c ON cs.cleaner_id = c.id
LEFT JOIN cleaners c2 ON cs.cleaner_2_id = c2.id;

-- Update the get_cleaning_sessions_detailed function to include time_slot
DROP FUNCTION IF EXISTS get_cleaning_sessions_detailed();

CREATE OR REPLACE FUNCTION get_cleaning_sessions_detailed()
RETURNS TABLE (
    id UUID,
    apartment_id UUID,
    cleaner_id UUID,
    cleaner_2_id UUID,
    cleaning_date DATE,
    time_slot TIME,
    notes TEXT,
    price DECIMAL(10,2),
    welcome_pack_fee DECIMAL(10,2),
    cleaner_1_name TEXT,
    cleaner_2_name TEXT,
    cleaner_1_fee DECIMAL(10,2),
    cleaner_2_fee DECIMAL(10,2),
    total_cleaning_fee DECIMAL(10,2),
    is_multi_cleaner BOOLEAN,
    cleaner_count INTEGER,
    property_category TEXT,
    property_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    apartment_number TEXT,
    owner_name TEXT,
    owner_email TEXT,
    address TEXT,
    cleaner_name TEXT,
    cleaner_email TEXT,
    cleaner_phone TEXT,
    cleaner_2_name_view TEXT,
    cleaner_2_email TEXT,
    cleaner_2_phone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.apartment_id,
        cs.cleaner_id,
        cs.cleaner_2_id,
        cs.cleaning_date,
        cs.time_slot,
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
        a.address,
        c.name as cleaner_name,
        c.email as cleaner_email,
        c.phone as cleaner_phone,
        c2.name as cleaner_2_name_view,
        c2.email as cleaner_2_email,
        c2.phone as cleaner_2_phone
    FROM cleaning_sessions cs
    LEFT JOIN apartments a ON cs.apartment_id = a.id
    LEFT JOIN cleaners c ON cs.cleaner_id = c.id
    LEFT JOIN cleaners c2 ON cs.cleaner_2_id = c2.id;
END;
$$ LANGUAGE plpgsql;

-- Add index for time_slot for better query performance
CREATE INDEX IF NOT EXISTS idx_cleaning_sessions_time_slot ON cleaning_sessions(time_slot);

-- Add index for combined date and time for scheduling queries
CREATE INDEX IF NOT EXISTS idx_cleaning_sessions_date_time ON cleaning_sessions(cleaning_date, time_slot);

COMMENT ON TABLE cleaning_sessions IS 'Cleaning sessions with time slot support for precise scheduling';
