-- Soft-disable apartments while preserving bookings/cleanings history
ALTER TABLE apartments
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_apartments_is_active ON apartments(is_active);

-- Rebuild schedulable properties view to respect apartment is_active
DROP VIEW IF EXISTS all_schedulable_properties CASCADE;

CREATE VIEW all_schedulable_properties AS
SELECT
    'apartment'::text AS property_category,
    apartments.id,
    apartments.apartment_number AS property_name,
    apartments.owner_name,
    apartments.owner_email,
    apartments.address AS location,
    apartments.cleaner_payout,
    NULL::text AS asset_type,
    NULL::text AS service_description,
    NULL::numeric AS daily_payment_rate,
    apartments.is_active
FROM apartments
WHERE apartments.apartment_number IS NOT NULL
  AND NOT (apartments.apartment_number ~ '^[0-9]{6,}$')
  AND apartments.is_active = true

UNION ALL

SELECT
    'internal_asset'::text AS property_category,
    internal_assets.id,
    internal_assets.asset_name AS property_name,
    internal_assets.owner_name,
    internal_assets.owner_email,
    internal_assets.location,
    internal_assets.cleaner_payout,
    internal_assets.asset_type,
    internal_assets.service_description,
    internal_assets.daily_payment_rate,
    COALESCE(internal_assets.is_active, true) AS is_active
FROM internal_assets
WHERE internal_assets.asset_name IS NOT NULL;

GRANT SELECT ON all_schedulable_properties TO authenticated;

COMMENT ON COLUMN apartments.is_active IS 'When false, apartment is hidden from calendar/scheduling but historical bookings and cleanings are retained';
