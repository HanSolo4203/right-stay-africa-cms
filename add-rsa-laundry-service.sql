-- Migration: Create RSA Laundry Service as a separate asset table
-- This migration creates a new table for RSA Laundry Room as a business asset
-- Run this in your Supabase SQL editor

-- Create RSA Laundry Assets table
CREATE TABLE rsa_laundry_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_name TEXT NOT NULL,
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

-- Insert RSA Laundry Room as the first asset
INSERT INTO rsa_laundry_assets (
    asset_name,
    asset_type,
    owner_name,
    owner_email,
    location,
    daily_payment_rate,
    service_description,
    cleaner_payout
) VALUES (
    'RSA Laundry Room',
    'LAUNDRY_SERVICE',
    'Right Stay Africa',
    'admin@rightstayafrica.com',
    'Internal Business Space',
    200.00, -- Daily payment rate for laundry services
    'Internal laundry service for Right Stay Africa properties',
    200.00 -- Cleaner payout for laundry services
);

-- Add comments to explain the table and columns
COMMENT ON TABLE rsa_laundry_assets IS 'Business assets owned by Right Stay Africa for internal services';
COMMENT ON COLUMN rsa_laundry_assets.asset_name IS 'Name of the business asset (e.g., RSA Laundry Room)';
COMMENT ON COLUMN rsa_laundry_assets.asset_type IS 'Type of asset: LAUNDRY_SERVICE, MAINTENANCE_SERVICE, or OTHER_SERVICE';
COMMENT ON COLUMN rsa_laundry_assets.owner_name IS 'Owner of the asset (typically Right Stay Africa)';
COMMENT ON COLUMN rsa_laundry_assets.daily_payment_rate IS 'Daily payment rate for services provided by this asset';
COMMENT ON COLUMN rsa_laundry_assets.service_description IS 'Description of the service provided by this asset';
COMMENT ON COLUMN rsa_laundry_assets.cleaner_payout IS 'Amount paid to cleaners for services at this asset';
COMMENT ON COLUMN rsa_laundry_assets.is_active IS 'Whether this asset is currently active and available for scheduling';

-- Create indexes for better performance
CREATE INDEX idx_rsa_laundry_assets_asset_type ON rsa_laundry_assets(asset_type);
CREATE INDEX idx_rsa_laundry_assets_is_active ON rsa_laundry_assets(is_active);
CREATE INDEX idx_rsa_laundry_assets_asset_name ON rsa_laundry_assets(asset_name);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_rsa_laundry_assets_updated_at 
    BEFORE UPDATE ON rsa_laundry_assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to get all active RSA laundry assets
CREATE OR REPLACE FUNCTION get_active_rsa_laundry_assets()
RETURNS TABLE (
    id UUID,
    asset_name TEXT,
    asset_type TEXT,
    owner_name TEXT,
    location TEXT,
    daily_payment_rate DECIMAL(10,2),
    service_description TEXT,
    cleaner_payout DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rla.id,
        rla.asset_name,
        rla.asset_type,
        rla.owner_name,
        rla.location,
        rla.daily_payment_rate,
        rla.service_description,
        rla.cleaner_payout
    FROM rsa_laundry_assets rla
    WHERE rla.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get RSA laundry assets by type
CREATE OR REPLACE FUNCTION get_rsa_laundry_assets_by_type(asset_type_param TEXT)
RETURNS TABLE (
    id UUID,
    asset_name TEXT,
    asset_type TEXT,
    owner_name TEXT,
    location TEXT,
    daily_payment_rate DECIMAL(10,2),
    service_description TEXT,
    cleaner_payout DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rla.id,
        rla.asset_name,
        rla.asset_type,
        rla.owner_name,
        rla.location,
        rla.daily_payment_rate,
        rla.service_description,
        rla.cleaner_payout
    FROM rsa_laundry_assets rla
    WHERE rla.asset_type = asset_type_param AND rla.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a view that combines apartments and RSA laundry assets for scheduling
CREATE VIEW all_schedulable_properties AS
SELECT 
    'apartment' as property_category,
    a.id,
    a.apartment_number as property_name,
    a.owner_name,
    a.owner_email,
    a.address as location,
    a.cleaner_payout,
    NULL::TEXT as asset_type,
    NULL::TEXT as service_description,
    NULL::DECIMAL as daily_payment_rate
FROM apartments a
UNION ALL
SELECT 
    'rsa_asset' as property_category,
    rla.id,
    rla.asset_name as property_name,
    rla.owner_name,
    rla.owner_email,
    rla.location,
    rla.cleaner_payout,
    rla.asset_type,
    rla.service_description,
    rla.daily_payment_rate
FROM rsa_laundry_assets rla
WHERE rla.is_active = TRUE;
