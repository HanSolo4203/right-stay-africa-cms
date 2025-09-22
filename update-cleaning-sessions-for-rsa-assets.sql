-- Migration: Update cleaning_sessions table to support RSA assets
-- This migration adds support for scheduling cleaning sessions on RSA laundry assets
-- Run this in your Supabase SQL editor

-- Add new columns to support property categories (only if they don't exist)
DO $$ 
BEGIN
    -- Add property_category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cleaning_sessions' 
                   AND column_name = 'property_category') THEN
        ALTER TABLE cleaning_sessions ADD COLUMN property_category TEXT DEFAULT 'apartment' CHECK (property_category IN ('apartment', 'rsa_asset'));
    END IF;
    
    -- Add property_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cleaning_sessions' 
                   AND column_name = 'property_id') THEN
        ALTER TABLE cleaning_sessions ADD COLUMN property_id UUID;
    END IF;
END $$;

-- Add welcome_pack_fee column only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cleaning_sessions' 
                   AND column_name = 'welcome_pack_fee') THEN
        ALTER TABLE cleaning_sessions ADD COLUMN welcome_pack_fee DECIMAL(10,2);
    END IF;
END $$;

-- Add comments to explain the new columns
COMMENT ON COLUMN cleaning_sessions.property_category IS 'Category of property: apartment or rsa_asset';
COMMENT ON COLUMN cleaning_sessions.property_id IS 'ID of the property (apartment_id or rsa_asset_id)';
COMMENT ON COLUMN cleaning_sessions.welcome_pack_fee IS 'Welcome pack fee applied to this cleaning session';

-- Update existing records to use the new structure (only if columns exist)
DO $$ 
BEGIN
    -- Only update if both columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'cleaning_sessions' 
               AND column_name = 'property_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'cleaning_sessions' 
                AND column_name = 'property_category') THEN
        UPDATE cleaning_sessions 
        SET property_id = apartment_id, 
            property_category = 'apartment'
        WHERE property_id IS NULL;
    END IF;
END $$;

-- Make property_id NOT NULL after populating existing data (only if column exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'cleaning_sessions' 
               AND column_name = 'property_id') THEN
        ALTER TABLE cleaning_sessions ALTER COLUMN property_id SET NOT NULL;
    END IF;
END $$;

-- Create indexes for the new columns (only if they don't exist)
DO $$ 
BEGIN
    -- Create index for property_id if column exists and index doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'cleaning_sessions' 
               AND column_name = 'property_id')
    AND NOT EXISTS (SELECT 1 FROM pg_indexes 
                    WHERE tablename = 'cleaning_sessions' 
                    AND indexname = 'idx_cleaning_sessions_property_id') THEN
        CREATE INDEX idx_cleaning_sessions_property_id ON cleaning_sessions(property_id);
    END IF;
    
    -- Create index for property_category if column exists and index doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'cleaning_sessions' 
               AND column_name = 'property_category')
    AND NOT EXISTS (SELECT 1 FROM pg_indexes 
                    WHERE tablename = 'cleaning_sessions' 
                    AND indexname = 'idx_cleaning_sessions_property_category') THEN
        CREATE INDEX idx_cleaning_sessions_property_category ON cleaning_sessions(property_category);
    END IF;
END $$;

-- Drop dependent functions first, then the view
DROP FUNCTION IF EXISTS get_cleaning_sessions_detailed() CASCADE;
DROP VIEW IF EXISTS cleaning_sessions_detailed CASCADE;

-- Create the updated detailed view to include RSA assets (only if new columns exist)
DO $$ 
BEGIN
    -- Check if the new columns exist before creating the view
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'cleaning_sessions' 
               AND column_name = 'property_category')
    AND EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'cleaning_sessions' 
                AND column_name = 'property_id') THEN
        
        -- Create the new view with RSA asset support
        EXECUTE '
        CREATE VIEW cleaning_sessions_detailed AS
        SELECT 
            cs.id,
            cs.cleaning_date,
            cs.notes,
            cs.price,
            cs.welcome_pack_fee,
            cs.created_at,
            cs.updated_at,
            cs.property_category,
            cs.property_id,
            -- Property information (apartment or RSA asset)
            CASE 
                WHEN cs.property_category = ''apartment'' THEN a.apartment_number
                WHEN cs.property_category = ''rsa_asset'' THEN rla.asset_name
                ELSE NULL
            END as apartment_number, -- Keep for backward compatibility
            CASE 
                WHEN cs.property_category = ''apartment'' THEN a.owner_name
                WHEN cs.property_category = ''rsa_asset'' THEN rla.owner_name
                ELSE NULL
            END as owner_name,
            CASE 
                WHEN cs.property_category = ''apartment'' THEN a.owner_email
                WHEN cs.property_category = ''rsa_asset'' THEN rla.owner_email
                ELSE NULL
            END as owner_email,
            CASE 
                WHEN cs.property_category = ''apartment'' THEN a.address
                WHEN cs.property_category = ''rsa_asset'' THEN rla.location
                ELSE NULL
            END as address,
            CASE 
                WHEN cs.property_category = ''apartment'' THEN a.cleaner_payout
                WHEN cs.property_category = ''rsa_asset'' THEN rla.cleaner_payout
                ELSE NULL
            END as cleaner_payout,
            -- RSA asset specific fields
            rla.asset_type,
            rla.service_description,
            rla.daily_payment_rate,
            rla.is_active,
            -- Cleaner information
            c.name as cleaner_name,
            c.phone as cleaner_phone,
            c.email as cleaner_email
        FROM cleaning_sessions cs
        LEFT JOIN apartments a ON cs.property_category = ''apartment'' AND cs.property_id = a.id
        LEFT JOIN rsa_laundry_assets rla ON cs.property_category = ''rsa_asset'' AND cs.property_id = rla.id
        LEFT JOIN cleaners c ON cs.cleaner_id = c.id';
        
    ELSE
        -- Create a basic view without the new columns (fallback)
        EXECUTE '
        CREATE VIEW cleaning_sessions_detailed AS
        SELECT 
            cs.id,
            cs.cleaning_date,
            cs.notes,
            cs.price,
            cs.created_at,
            cs.updated_at,
            a.apartment_number,
            a.owner_name,
            a.owner_email,
            a.address,
            a.cleaner_payout,
            c.name as cleaner_name,
            c.phone as cleaner_phone,
            c.email as cleaner_email
        FROM cleaning_sessions cs
        JOIN apartments a ON cs.apartment_id = a.id
        JOIN cleaners c ON cs.cleaner_id = c.id';
    END IF;
END $$;

-- Recreate the get_cleaning_sessions_detailed function
CREATE OR REPLACE FUNCTION get_cleaning_sessions_detailed()
RETURNS TABLE (
    id UUID,
    cleaning_date DATE,
    notes TEXT,
    price DECIMAL(10,2),
    welcome_pack_fee DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    property_category TEXT,
    property_id UUID,
    apartment_number TEXT,
    owner_name TEXT,
    owner_email TEXT,
    address TEXT,
    cleaner_payout DECIMAL(10,2),
    asset_type TEXT,
    service_description TEXT,
    daily_payment_rate DECIMAL(10,2),
    is_active BOOLEAN,
    cleaner_name TEXT,
    cleaner_phone TEXT,
    cleaner_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        csd.id,
        csd.cleaning_date,
        csd.notes,
        csd.price,
        csd.welcome_pack_fee,
        csd.created_at,
        csd.updated_at,
        csd.property_category,
        csd.property_id,
        csd.apartment_number,
        csd.owner_name,
        csd.owner_email,
        csd.address,
        csd.cleaner_payout,
        csd.asset_type,
        csd.service_description,
        csd.daily_payment_rate,
        csd.is_active,
        csd.cleaner_name,
        csd.cleaner_phone,
        csd.cleaner_email
    FROM cleaning_sessions_detailed csd;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get cleaning sessions by property category
CREATE OR REPLACE FUNCTION get_cleaning_sessions_by_property_category(category TEXT)
RETURNS TABLE (
    id UUID,
    cleaning_date DATE,
    notes TEXT,
    price DECIMAL(10,2),
    welcome_pack_fee DECIMAL(10,2),
    property_category TEXT,
    property_id UUID,
    apartment_number TEXT,
    owner_name TEXT,
    cleaner_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        csd.id,
        csd.cleaning_date,
        csd.notes,
        csd.price,
        csd.welcome_pack_fee,
        csd.property_category,
        csd.property_id,
        csd.apartment_number,
        csd.owner_name,
        csd.cleaner_name
    FROM cleaning_sessions_detailed csd
    WHERE csd.property_category = category;
END;
$$ LANGUAGE plpgsql;

-- Create a function to validate property exists before creating cleaning session
CREATE OR REPLACE FUNCTION validate_property_for_cleaning_session(
    property_id_param UUID,
    property_category_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    property_exists BOOLEAN := FALSE;
BEGIN
    IF property_category_param = 'apartment' THEN
        SELECT EXISTS(SELECT 1 FROM apartments WHERE id = property_id_param) INTO property_exists;
    ELSIF property_category_param = 'rsa_asset' THEN
        SELECT EXISTS(SELECT 1 FROM rsa_laundry_assets WHERE id = property_id_param AND is_active = TRUE) INTO property_exists;
    END IF;
    
    RETURN property_exists;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for the new structure
-- Note: These policies assume you have existing RLS policies for cleaning_sessions
-- You may need to adjust these based on your existing RLS setup

-- Policy for reading cleaning sessions (including RSA assets)
CREATE POLICY "Users can view cleaning sessions for all properties" ON cleaning_sessions
    FOR SELECT USING (true);

-- Policy for creating cleaning sessions (including RSA assets)
CREATE POLICY "Users can create cleaning sessions for all properties" ON cleaning_sessions
    FOR INSERT WITH CHECK (true);

-- Policy for updating cleaning sessions (including RSA assets)
CREATE POLICY "Users can update cleaning sessions for all properties" ON cleaning_sessions
    FOR UPDATE USING (true);

-- Policy for deleting cleaning sessions (including RSA assets)
CREATE POLICY "Users can delete cleaning sessions for all properties" ON cleaning_sessions
    FOR DELETE USING (true);

-- Add comments to document the migration
COMMENT ON TABLE cleaning_sessions IS 'Cleaning sessions for both apartments and RSA laundry assets';
COMMENT ON VIEW cleaning_sessions_detailed IS 'Detailed view of cleaning sessions including property and cleaner information for both apartments and RSA assets';
