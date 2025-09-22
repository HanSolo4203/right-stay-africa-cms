-- Fix RSA Laundry Expenses Detailed View
-- Add missing asset_id and cleaner_id fields

-- Drop the existing view first
DROP VIEW IF EXISTS rsa_laundry_expenses_detailed;

-- Recreate the view with all required fields
CREATE VIEW rsa_laundry_expenses_detailed AS
SELECT 
    rle.id,
    rle.asset_id,
    rle.cleaner_id,
    rle.service_date,
    rle.daily_payment_amount,
    rle.service_description,
    rle.notes,
    rle.is_paid,
    rle.payment_date,
    rle.created_at,
    rle.updated_at,
    -- Asset details
    ia.asset_name,
    ia.asset_type,
    ia.owner_name as asset_owner,
    ia.location as asset_location,
    -- Cleaner details
    c.name as cleaner_name,
    c.phone as cleaner_phone,
    c.email as cleaner_email
FROM rsa_laundry_expenses rle
JOIN internal_assets ia ON rle.asset_id = ia.id
JOIN cleaners c ON rle.cleaner_id = c.id;

-- Grant permissions on the updated view
GRANT SELECT ON rsa_laundry_expenses_detailed TO authenticated;
