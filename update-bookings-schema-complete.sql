-- Complete Bookings Schema Update with Correct Business Logic
-- Based on your actual owner statement calculations

-- Step 1: Drop dependent view
DROP VIEW IF EXISTS owner_statements_view;

-- Step 2: Drop old total_payout column
ALTER TABLE bookings DROP COLUMN IF EXISTS total_payout;

-- Step 3: Add commission_tax column if it doesn't exist
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
    END IF;
END $$;

-- Make sure existing records have 0 for commission_tax
UPDATE bookings 
SET commission_tax = COALESCE(commission_tax, 0.00)
WHERE commission_tax IS NULL OR commission_tax IS NOT NULL;

-- Step 4: Add net_revenue column with channel-specific logic
-- This replaces total_payout as the primary payout field
-- 
-- CHANNEL-SPECIFIC LOGIC:
-- - Airbnb: Deducts booking taxes (they handle tax remittance)
-- - Booking.com: Does NOT deduct booking taxes (you handle tax remittance)
-- 
-- We'll calculate this in the view using channel name to determine logic
-- For now, add a simple total_payout column (will be overridden by view)
ALTER TABLE bookings 
ADD COLUMN total_payout NUMERIC GENERATED ALWAYS AS (
    -- Simple calculation - will be overridden by net_revenue in view
    (accommodation_total + cleaning_fee + extra_charges + discount_amount)
    - payment_processing_fee 
    - channel_commission
    - COALESCE(commission_tax, 0)
) STORED;

-- Step 5: Add comment to clarify what total_payout represents
COMMENT ON COLUMN bookings.total_payout IS 
'Total payout from booking platform (what RightStay Africa receives). 
This is BEFORE deducting RightStay expenses (cleaning fees, welcome packs, etc.) 
and RightStay commission to calculate final owner payout.';

COMMENT ON COLUMN bookings.cleaning_fee IS 
'Cleaning fee paid by guest (included in gross revenue). 
This is a RightStay expense that should be deducted from total_payout for owner statements.';

COMMENT ON COLUMN bookings.commission_tax IS 
'Tax on platform commission (e.g., VAT on Airbnb commission). 
Deducted from gross revenue along with commission.';

-- Step 6: Recreate the owner_statements_view with channel-specific net_revenue
CREATE OR REPLACE VIEW owner_statements_view AS
SELECT 
    b.id AS booking_id,
    b.booking_reference,
    a.apartment_number AS property_name,
    a.owner_name,
    a.owner_email,
    g.name AS guest_name,
    g.email AS guest_email,
    bc.name AS channel_name,
    b.check_in_date,
    b.check_out_date,
    b.nights,
    b.accommodation_total,
    b.discount_amount,
    b.extra_charges,
    b.cleaning_fee,
    b.booking_taxes,
    b.channel_commission,
    b.payment_processing_fee,
    b.commission_tax,
    b.booking_status,
    b.booking_date,
    b.notes AS booking_notes,
    COALESCE(upsell_totals.upsell_total, 0::numeric) AS upsell_total,
    COALESCE(expense_totals.expense_total, 0::numeric) AS custom_expense_total,
    -- Calculate gross revenue (what guest pays including taxes)
    (b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount + b.booking_taxes) AS gross_revenue,
    -- Calculate NET REVENUE (what RightStay receives from bookings after platform fees, BEFORE RightStay commission)
    -- Channel-specific: Booking.com keeps taxes, Airbnb doesn't
    CASE 
        WHEN LOWER(bc.name) LIKE '%booking%' OR LOWER(bc.name) = 'booking_dot_com' OR LOWER(bc.name) = 'uplisting' OR LOWER(bc.name) = 'direct' THEN
            -- Booking.com/Uplisting/Direct: Keep booking taxes (you handle tax remittance)
            (b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount + b.booking_taxes
             - b.payment_processing_fee 
             - b.channel_commission
             - COALESCE(b.commission_tax, 0))
        ELSE
            -- Airbnb: Deduct booking taxes (platform handles tax remittance)
            (b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount
             - b.payment_processing_fee 
             - b.channel_commission
             - COALESCE(b.commission_tax, 0))
    END AS net_revenue,
    -- Keep total_payout for backward compatibility (always deducts taxes)
    b.total_payout,
    -- Calculate what owner should receive (net_revenue - RightStay expenses)
    -- Note: This doesn't include RightStay commission yet - that's calculated in the app
    CASE 
        WHEN LOWER(bc.name) LIKE '%booking%' 
          OR LOWER(bc.name) = 'booking_dot_com' 
          OR LOWER(bc.name) = 'uplisting'
          OR LOWER(bc.name) = 'direct' THEN
            -- Booking.com, Uplisting, Direct: Keep booking taxes
            (b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount)
            - b.payment_processing_fee 
            - b.channel_commission
            - COALESCE(b.commission_tax, 0)
            - b.cleaning_fee 
            - COALESCE(expense_totals.expense_total, 0)
        ELSE
            -- Airbnb and others: Deduct booking taxes
            (b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount)
            - COALESCE(b.booking_taxes, 0)
            - b.payment_processing_fee 
            - b.channel_commission
            - COALESCE(b.commission_tax, 0)
            - b.cleaning_fee 
            - COALESCE(expense_totals.expense_total, 0)
    END AS preliminary_owner_payout
FROM bookings b
JOIN apartments a ON b.apartment_id = a.id
JOIN guests g ON b.guest_id = g.id
LEFT JOIN booking_channels bc ON b.channel_id = bc.id
LEFT JOIN (
    SELECT 
        booking_id,
        SUM(total_price) AS upsell_total
    FROM booking_upsells
    GROUP BY booking_id
) upsell_totals ON b.id = upsell_totals.booking_id
LEFT JOIN (
    SELECT 
        booking_id,
        SUM(amount) AS expense_total
    FROM custom_expenses
    GROUP BY booking_id
) expense_totals ON b.id = expense_totals.booking_id;

COMMENT ON VIEW owner_statements_view IS 
'Complete booking view for owner statements with channel-specific calculations.
- net_revenue: What RightStay receives (channel-specific tax handling)
  * Airbnb/VRBO/Expedia: Booking taxes deducted (platform handles tax remittance)
  * Booking.com/Uplisting/Direct: Booking taxes NOT deducted (you handle tax remittance)
- total_payout: Legacy field (always deducts taxes)
- preliminary_owner_payout: After deducting cleaning fees and custom expenses (BEFORE RightStay commission)
- Final owner payout is calculated in the application by subtracting RightStay commission from preliminary_owner_payout';

-- Step 7: Verification query
SELECT 
    booking_reference,
    channel_name,
    accommodation_total,
    cleaning_fee,
    extra_charges,
    discount_amount,
    booking_taxes,
    payment_processing_fee,
    channel_commission,
    commission_tax,
    -- Show gross revenue
    gross_revenue,
    -- Show net revenue (channel-specific)
    net_revenue,
    -- Show if booking.com (taxes NOT deducted)
    CASE 
        WHEN LOWER(channel_name) LIKE '%booking%' THEN 'Booking.com (taxes kept)'
        ELSE 'Airbnb/Other (taxes deducted)'
    END as channel_type
FROM owner_statements_view
WHERE booking_id IS NOT NULL
ORDER BY check_in_date DESC
LIMIT 10;

