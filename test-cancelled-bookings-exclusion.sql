-- Test script to verify cancelled bookings are excluded from owner statements
-- but still stored in the database

-- 1. Check current booking statuses in the database
SELECT 
    booking_status, 
    COUNT(*) as count,
    SUM(accommodation_total) as total_accommodation
FROM bookings 
GROUP BY booking_status 
ORDER BY count DESC;

-- 2. Check if any cancelled bookings exist
SELECT 
    'Cancelled bookings in database' as description,
    COUNT(*) as count,
    SUM(accommodation_total) as total_accommodation_value
FROM bookings 
WHERE booking_status = 'cancelled';

-- 3. Check if cancelled bookings appear in owner statements view
SELECT 
    'Cancelled bookings in owner statements view' as description,
    COUNT(*) as count,
    SUM(accommodation_total) as total_accommodation_value
FROM owner_statements_view 
WHERE booking_status = 'cancelled';

-- 4. Show sample cancelled bookings (if any exist)
SELECT 
    b.booking_reference,
    a.apartment_number as property_name,
    bc.name as channel_name,
    b.booking_status,
    b.accommodation_total,
    b.check_in_date,
    b.check_out_date
FROM bookings b
LEFT JOIN apartments a ON b.apartment_id = a.id
LEFT JOIN booking_channels bc ON b.channel_id = bc.id
WHERE b.booking_status = 'cancelled'
LIMIT 5;

-- 5. Show total counts comparison
SELECT 
    'Total bookings in database' as source,
    COUNT(*) as count
FROM bookings
UNION ALL
SELECT 
    'Total bookings in owner statements view' as source,
    COUNT(*) as count
FROM owner_statements_view;

-- 6. Show booking status distribution in owner statements view
SELECT 
    booking_status,
    COUNT(*) as count,
    SUM(accommodation_total) as total_accommodation
FROM owner_statements_view
GROUP BY booking_status
ORDER BY count DESC;
