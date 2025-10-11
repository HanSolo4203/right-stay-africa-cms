-- Filter out apartments with Uplisting IDs from scheduling and invoicing
-- Uplisting IDs are typically long numerical strings (6+ digits) in apartment_number

-- Update the all_schedulable_properties view to exclude apartments with Uplisting IDs
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
  -- Exclude apartments with Uplisting IDs (long numerical strings)
  AND NOT (apartment_number ~ '^[0-9]{6,}$')

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

-- Grant necessary permissions
GRANT SELECT ON all_schedulable_properties TO authenticated;
