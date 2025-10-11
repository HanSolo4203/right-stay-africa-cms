-- Update total_payout formula to match calculations.ts business logic
-- 
-- NEW FORMULA (matching calculations.ts):
-- Gross Revenue = accommodation_total + discount_amount + extra_charges + cleaning_fee + booking_taxes
-- Total Payout = Gross Revenue - channel_commission - payment_processing_fee
--
-- Note: This assumes discount_amount can be negative (discount reduces revenue)
-- and positive (adjustment increases revenue)

-- Step 1: Drop the view that depends on total_payout
DROP VIEW IF EXISTS owner_statements_view;

-- Step 2: Drop the existing generated column
ALTER TABLE bookings 
DROP COLUMN total_payout;

-- Step 3: Recreate the column with the correct formula
-- Formula matches calculations.ts: calculateGrossRevenue() - commissions
ALTER TABLE bookings 
ADD COLUMN total_payout NUMERIC GENERATED ALWAYS AS (
    -- Gross Revenue calculation
    (accommodation_total + discount_amount + extra_charges + cleaning_fee + booking_taxes)
    -- Subtract commissions and fees
    - channel_commission 
    - payment_processing_fee
) STORED;

-- Step 4: Recreate the owner_statements_view
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
    b.total_payout,
    b.booking_status,
    b.booking_date,
    b.notes AS booking_notes,
    COALESCE(upsell_totals.upsell_total, 0::numeric) AS upsell_total,
    COALESCE(expense_totals.expense_total, 0::numeric) AS custom_expense_total
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

-- Verification: Check the new formula
SELECT 
    booking_reference,
    accommodation_total,
    discount_amount,
    extra_charges,
    cleaning_fee,
    booking_taxes,
    channel_commission,
    payment_processing_fee,
    total_payout,
    -- Manual calculation to verify
    (accommodation_total + discount_amount + extra_charges + cleaning_fee + booking_taxes 
     - channel_commission - payment_processing_fee) as calculated_payout,
    -- Check if they match
    total_payout = (accommodation_total + discount_amount + extra_charges + cleaning_fee + booking_taxes 
                   - channel_commission - payment_processing_fee) as formula_matches
FROM bookings
LIMIT 5;

-- Note about upsells:
-- The calculations.ts includes upsell_total in gross revenue, but this is fetched separately
-- from the booking_upsells table and added in the view (owner_statements_view).
-- The total_payout column only calculates the booking-level payout, and upsells are
-- handled at the view level by COALESCE(upsell_totals.upsell_total, 0).

