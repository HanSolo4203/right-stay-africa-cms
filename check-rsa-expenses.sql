-- Check RSA Laundry Expenses Data
-- Run this to see what data exists

-- Check if there are any RSA laundry expenses
SELECT COUNT(*) as total_expenses FROM rsa_laundry_expenses;

-- Check expenses by month
SELECT 
    DATE_TRUNC('month', service_date) as month,
    COUNT(*) as expense_count,
    SUM(daily_payment_amount) as total_amount
FROM rsa_laundry_expenses 
GROUP BY DATE_TRUNC('month', service_date)
ORDER BY month;

-- Check recent expenses
SELECT 
    service_date,
    daily_payment_amount,
    cleaner_id,
    asset_id
FROM rsa_laundry_expenses 
ORDER BY service_date DESC 
LIMIT 10;

-- Check if the view works
SELECT COUNT(*) as view_count FROM rsa_laundry_expenses_detailed;

-- Check view data
SELECT 
    service_date,
    daily_payment_amount,
    cleaner_name,
    asset_name
FROM rsa_laundry_expenses_detailed 
ORDER BY service_date DESC 
LIMIT 5;
