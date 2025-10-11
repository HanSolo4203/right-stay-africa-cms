-- Simple update to add gross_revenue and fix net_revenue for Booking.com channels
-- Run this if you've already added commission_tax column

DROP VIEW IF EXISTS owner_statements_view;

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
    (b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount + b.booking_taxes) AS gross_revenue,
    CASE 
        WHEN LOWER(bc.name) LIKE '%booking%' OR LOWER(bc.name) = 'booking_dot_com' OR LOWER(bc.name) = 'uplisting' OR LOWER(bc.name) = 'direct' THEN
            (b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount + b.booking_taxes - b.payment_processing_fee - b.channel_commission - COALESCE(b.commission_tax, 0))
        ELSE
            (b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount - b.payment_processing_fee - b.channel_commission - COALESCE(b.commission_tax, 0))
    END AS net_revenue,
    b.total_payout,
    CASE 
        WHEN LOWER(bc.name) LIKE '%booking%' OR LOWER(bc.name) = 'booking_dot_com' OR LOWER(bc.name) = 'uplisting' OR LOWER(bc.name) = 'direct' THEN
            (b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount + b.booking_taxes - b.payment_processing_fee - b.channel_commission - COALESCE(b.commission_tax, 0) - b.cleaning_fee - COALESCE(expense_totals.expense_total, 0))
        ELSE
            (b.accommodation_total + b.cleaning_fee + b.extra_charges + b.discount_amount - b.payment_processing_fee - b.channel_commission - COALESCE(b.commission_tax, 0) - b.cleaning_fee - COALESCE(expense_totals.expense_total, 0))
    END AS preliminary_owner_payout
FROM bookings b
JOIN apartments a ON b.apartment_id = a.id
JOIN guests g ON b.guest_id = g.id
LEFT JOIN booking_channels bc ON b.channel_id = bc.id
LEFT JOIN (
    SELECT booking_id, SUM(total_price) AS upsell_total
    FROM booking_upsells
    GROUP BY booking_id
) upsell_totals ON b.id = upsell_totals.booking_id
LEFT JOIN (
    SELECT booking_id, SUM(amount) AS expense_total
    FROM custom_expenses
    GROUP BY booking_id
) expense_totals ON b.id = expense_totals.booking_id;

