-- Monthly Expense Calculation Functions for RSA Laundry Service
-- Run this in your Supabase SQL Editor

-- 1. Function to calculate monthly expenses with detailed breakdown
CREATE OR REPLACE FUNCTION get_monthly_rsa_expenses(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_cleaner_id UUID DEFAULT NULL
)
RETURNS TABLE (
    month_year TEXT,
    total_expenses DECIMAL(10,2),
    total_days INTEGER,
    average_daily_payment DECIMAL(10,2),
    cleaner_count INTEGER,
    expenses JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_data AS (
        SELECT 
            TO_CHAR(rle.service_date, 'YYYY-MM') as month_year,
            SUM(rle.daily_payment_amount) as total_expenses,
            COUNT(*) as total_days,
            AVG(rle.daily_payment_amount) as average_daily_payment,
            COUNT(DISTINCT rle.cleaner_id) as cleaner_count,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', rle.id,
                    'service_date', rle.service_date,
                    'daily_payment_amount', rle.daily_payment_amount,
                    'cleaner_name', c.name,
                    'cleaner_id', rle.cleaner_id,
                    'is_paid', rle.is_paid,
                    'payment_date', rle.payment_date,
                    'notes', rle.notes
                ) ORDER BY rle.service_date
            ) as expenses
        FROM rsa_laundry_expenses rle
        JOIN cleaners c ON rle.cleaner_id = c.id
        WHERE 
            (p_start_date IS NULL OR rle.service_date >= p_start_date)
            AND (p_end_date IS NULL OR rle.service_date <= p_end_date)
            AND (p_cleaner_id IS NULL OR rle.cleaner_id = p_cleaner_id)
        GROUP BY TO_CHAR(rle.service_date, 'YYYY-MM')
    )
    SELECT 
        md.month_year,
        md.total_expenses,
        md.total_days,
        md.average_daily_payment,
        md.cleaner_count,
        md.expenses
    FROM monthly_data md
    ORDER BY md.month_year DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to get running totals and year-to-date calculations
CREATE OR REPLACE FUNCTION get_rsa_expense_totals(
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS TABLE (
    month_year TEXT,
    monthly_total DECIMAL(10,2),
    running_total DECIMAL(10,2),
    year_to_date_total DECIMAL(10,2),
    monthly_average DECIMAL(10,2),
    year_to_date_average DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_totals AS (
        SELECT 
            TO_CHAR(rle.service_date, 'YYYY-MM') as month_year,
            SUM(rle.daily_payment_amount) as monthly_total,
            COUNT(*) as monthly_days
        FROM rsa_laundry_expenses rle
        WHERE EXTRACT(YEAR FROM rle.service_date) = p_year
        GROUP BY TO_CHAR(rle.service_date, 'YYYY-MM')
    ),
    running_calculations AS (
        SELECT 
            mt.month_year,
            mt.monthly_total,
            SUM(mt.monthly_total) OVER (
                ORDER BY mt.month_year 
                ROWS UNBOUNDED PRECEDING
            ) as running_total,
            SUM(mt.monthly_total) OVER () as year_to_date_total,
            mt.monthly_total / NULLIF(mt.monthly_days, 0) as monthly_average,
            SUM(mt.monthly_total) OVER () / NULLIF(SUM(mt.monthly_days) OVER (), 0) as year_to_date_average
        FROM monthly_totals mt
    )
    SELECT 
        rc.month_year,
        rc.monthly_total,
        rc.running_total,
        rc.year_to_date_total,
        rc.monthly_average,
        rc.year_to_date_average
    FROM running_calculations rc
    ORDER BY rc.month_year;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get cleaner performance by month
CREATE OR REPLACE FUNCTION get_cleaner_monthly_performance(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    cleaner_id UUID,
    cleaner_name TEXT,
    month_year TEXT,
    total_payments DECIMAL(10,2),
    total_days INTEGER,
    average_daily_payment DECIMAL(10,2),
    is_paid_count INTEGER,
    unpaid_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rle.cleaner_id,
        c.name as cleaner_name,
        TO_CHAR(rle.service_date, 'YYYY-MM') as month_year,
        SUM(rle.daily_payment_amount) as total_payments,
        COUNT(*) as total_days,
        AVG(rle.daily_payment_amount) as average_daily_payment,
        COUNT(*) FILTER (WHERE rle.is_paid = true) as is_paid_count,
        COUNT(*) FILTER (WHERE rle.is_paid = false) as unpaid_count
    FROM rsa_laundry_expenses rle
    JOIN cleaners c ON rle.cleaner_id = c.id
    WHERE 
        (p_start_date IS NULL OR rle.service_date >= p_start_date)
        AND (p_end_date IS NULL OR rle.service_date <= p_end_date)
    GROUP BY rle.cleaner_id, c.name, TO_CHAR(rle.service_date, 'YYYY-MM')
    ORDER BY TO_CHAR(rle.service_date, 'YYYY-MM') DESC, total_payments DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get expense summary for date range
CREATE OR REPLACE FUNCTION get_expense_summary(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_expenses DECIMAL(10,2),
    total_days INTEGER,
    average_daily_payment DECIMAL(10,2),
    unique_cleaners INTEGER,
    paid_expenses DECIMAL(10,2),
    unpaid_expenses DECIMAL(10,2),
    paid_days INTEGER,
    unpaid_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(rle.daily_payment_amount) as total_expenses,
        COUNT(*) as total_days,
        AVG(rle.daily_payment_amount) as average_daily_payment,
        COUNT(DISTINCT rle.cleaner_id) as unique_cleaners,
        SUM(rle.daily_payment_amount) FILTER (WHERE rle.is_paid = true) as paid_expenses,
        SUM(rle.daily_payment_amount) FILTER (WHERE rle.is_paid = false) as unpaid_expenses,
        COUNT(*) FILTER (WHERE rle.is_paid = true) as paid_days,
        COUNT(*) FILTER (WHERE rle.is_paid = false) as unpaid_days
    FROM rsa_laundry_expenses rle
    WHERE rle.service_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rsa_laundry_expenses_service_date_cleaner 
ON rsa_laundry_expenses(service_date, cleaner_id);

CREATE INDEX IF NOT EXISTS idx_rsa_laundry_expenses_is_paid_service_date 
ON rsa_laundry_expenses(is_paid, service_date);

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION get_monthly_rsa_expenses TO authenticated;
GRANT EXECUTE ON FUNCTION get_rsa_expense_totals TO authenticated;
GRANT EXECUTE ON FUNCTION get_cleaner_monthly_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_summary TO authenticated;
