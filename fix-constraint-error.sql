-- Fix the property_category constraint error
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing constraint if it exists
ALTER TABLE cleaning_sessions 
DROP CONSTRAINT IF EXISTS cleaning_sessions_property_category_check;

-- 2. Recreate the constraint with the correct values
ALTER TABLE cleaning_sessions 
ADD CONSTRAINT cleaning_sessions_property_category_check 
CHECK (property_category IN ('apartment', 'internal_asset'));

-- 3. Update any existing NULL values to 'apartment'
UPDATE cleaning_sessions 
SET property_category = 'apartment' 
WHERE property_category IS NULL;

-- 4. Verification
SELECT 'Constraint fixed!' as status;
SELECT DISTINCT property_category FROM cleaning_sessions;
