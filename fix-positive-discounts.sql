-- Fix existing bookings where discounts are positive (should be negative)
-- Discounts should REDUCE revenue, so they must be negative values

-- Step 1: Check which bookings have positive discounts
SELECT 
    booking_reference,
    channel_name,
    accommodation_total,
    discount_amount,
    cleaning_fee,
    net_revenue,
    CASE 
        WHEN discount_amount > 0 THEN 'NEEDS FIX ❌'
        WHEN discount_amount < 0 THEN 'Correct ✓'
        ELSE 'No discount'
    END as discount_status
FROM owner_statements_view
WHERE discount_amount > 0
ORDER BY check_in_date DESC;

-- Step 2: Fix positive discounts by converting them to negative
UPDATE bookings 
SET discount_amount = -discount_amount
WHERE discount_amount > 0;

-- Step 3: Verify the fix worked
SELECT 
    booking_reference,
    channel_name,
    accommodation_total,
    discount_amount,
    cleaning_fee,
    gross_revenue,
    net_revenue
FROM owner_statements_view
WHERE booking_reference = 'HMZD2Z8QWS' -- The booking with R 2,536.80 discount
ORDER BY check_in_date DESC;

-- Expected result for HMZD2Z8QWS:
-- Accommodation: R 8,456.00
-- Discount: R -2,536.80 (now negative)
-- Cleaning: R 350.00
-- Gross Revenue: R 6,269.20 (8,456 - 2,536.80 + 350)
-- Net Revenue: R 5,187.76 (6,269.20 - 940.38 - 141.06)

-- Step 4: Show all bookings with their corrected values
SELECT 
    booking_reference,
    channel_name,
    gross_revenue,
    booking_taxes,
    channel_commission,
    commission_tax,
    payment_processing_fee,
    net_revenue,
    CASE 
        WHEN LOWER(channel_name) LIKE '%booking%' OR LOWER(channel_name) = 'uplisting' 
        THEN 'Taxes kept'
        ELSE 'Taxes deducted'
    END as tax_treatment
FROM owner_statements_view
ORDER BY check_in_date DESC
LIMIT 10;

