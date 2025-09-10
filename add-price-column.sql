-- Migration script to add price column to cleaning_sessions table
-- Run this in your Supabase SQL editor

-- Add price column to cleaning_sessions table
ALTER TABLE cleaning_sessions 
ADD COLUMN price DECIMAL(10,2);

-- Update the detailed view to include price
DROP VIEW IF EXISTS cleaning_sessions_detailed;

CREATE VIEW cleaning_sessions_detailed AS
SELECT 
    cs.id,
    cs.cleaning_date,
    cs.notes,
    cs.price,
    cs.created_at,
    cs.updated_at,
    a.apartment_number,
    a.owner_name,
    a.owner_email,
    a.address,
    c.name as cleaner_name,
    c.phone as cleaner_phone,
    c.email as cleaner_email
FROM cleaning_sessions cs
JOIN apartments a ON cs.apartment_id = a.id
JOIN cleaners c ON cs.cleaner_id = c.id;

-- Update existing records with default price (optional)
-- Uncomment the line below if you want to set a default price for existing records
-- UPDATE cleaning_sessions SET price = 150.00 WHERE price IS NULL;
