-- Add cleaner_payout column to apartments table
-- This column stores the amount paid to cleaners per cleaning session for each apartment

ALTER TABLE apartments 
ADD COLUMN cleaner_payout DECIMAL(10,2);

-- Update existing apartments with default cleaner payout (R100)
UPDATE apartments 
SET cleaner_payout = 100.00 
WHERE cleaner_payout IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN apartments.cleaner_payout IS 'Amount paid to cleaners per cleaning session for this apartment (in ZAR)';
