-- Update owner_statements_view to exclude cancelled bookings
-- Cancelled bookings will still be stored in the database but won't appear in owner statements

DROP VIEW IF EXISTS owner_statements_view;

CREATE VIEW owner_statements_view AS
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
    b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount + b.booking_taxes AS gross_revenue,
    CASE
        WHEN lower(bc.name) ~~ '%booking%'::text OR lower(bc.name) = 'booking_dot_com'::text OR lower(bc.name) = 'uplisting'::text OR lower(bc.name) = 'direct'::text THEN 
            b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount + b.booking_taxes - b.payment_processing_fee - b.channel_commission - COALESCE(b.commission_tax, 0::numeric)
        ELSE 
            b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount - b.payment_processing_fee - b.channel_commission - COALESCE(b.commission_tax, 0::numeric)
    END AS net_revenue,
    b.total_payout,
    CASE
        WHEN lower(bc.name) ~~ '%booking%'::text OR lower(bc.name) = 'booking_dot_com'::text OR lower(bc.name) = 'uplisting'::text OR lower(bc.name) = 'direct'::text THEN 
            b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount + b.booking_taxes - b.payment_processing_fee - b.channel_commission - COALESCE(b.commission_tax, 0::numeric) - b.cleaning_fee - COALESCE(expense_totals.expense_total, 0::numeric)
        ELSE 
            b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount - b.payment_processing_fee - b.channel_commission - COALESCE(b.commission_tax, 0::numeric) - b.cleaning_fee - COALESCE(expense_totals.expense_total, 0::numeric)
    END AS preliminary_owner_payout
FROM bookings b
JOIN apartments a ON b.apartment_id = a.id
JOIN guests g ON b.guest_id = g.id
LEFT JOIN booking_channels bc ON b.channel_id = bc.id
LEFT JOIN (
    SELECT booking_upsells.booking_id,
           sum(booking_upsells.total_price) AS upsell_total
    FROM booking_upsells
    GROUP BY booking_upsells.booking_id
) upsell_totals ON b.id = upsell_totals.booking_id
LEFT JOIN (
    SELECT custom_expenses.booking_id,
           sum(custom_expenses.amount) AS expense_total
    FROM custom_expenses
    GROUP BY custom_expenses.booking_id
) expense_totals ON b.id = expense_totals.booking_id
WHERE b.booking_status != 'cancelled';

-- Add comment explaining the exclusion
COMMENT ON VIEW owner_statements_view IS 
'Owner statements view excluding cancelled bookings. 
Cancelled bookings are stored in the database but excluded from financial statements 
to prevent showing unpaid accommodation values from channels like Booking.com.';

-- Verify the view works
SELECT COUNT(*) as total_bookings_in_view FROM owner_statements_view;
SELECT COUNT(*) as total_bookings_in_table FROM bookings;
SELECT 
    booking_status, 
    COUNT(*) as count 
FROM bookings 
GROUP BY booking_status 
ORDER BY count DESC;
