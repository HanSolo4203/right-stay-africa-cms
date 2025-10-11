-- Fix existing bookings with NULL apartment_id
-- Run this in Supabase SQL Editor

-- First, let's see what we need to fix
SELECT 
    b.id,
    b.booking_reference,
    b.apartment_id,
    g.name as guest_name
FROM bookings b
LEFT JOIN guests g ON b.guest_id = g.id
WHERE b.apartment_id IS NULL;

-- Option 1: Delete the test bookings and re-import (RECOMMENDED)
DELETE FROM bookings WHERE apartment_id IS NULL;

-- Option 2: If you want to keep them, manually update (but you'd need to know which property each belongs to)
-- This won't work because we don't know which property_id was in the CSV for each booking

