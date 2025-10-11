-- Add commission_tax column to bookings table (if migration hasn't been run yet)
-- This is a standalone script that can be run separately

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'commission_tax'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN commission_tax NUMERIC(10,2) DEFAULT 0.00 NOT NULL;
        
        RAISE NOTICE 'Added commission_tax column to bookings table';
    ELSE
        RAISE NOTICE 'commission_tax column already exists';
    END IF;
END $$;

-- Make sure existing records have 0 for commission_tax if NULL
UPDATE bookings 
SET commission_tax = 0.00 
WHERE commission_tax IS NULL;

-- Verify the column exists and has correct default
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings' 
AND column_name = 'commission_tax';

-- Show sample data
SELECT 
    booking_reference,
    channel_commission,
    commission_tax,
    payment_processing_fee
FROM bookings
WHERE apartment_id IS NOT NULL
LIMIT 5;

