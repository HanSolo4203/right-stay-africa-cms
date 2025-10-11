-- Booking System Schema for Right Stay Africa CMS
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Guests table
CREATE TABLE IF NOT EXISTS guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking channels table
CREATE TABLE IF NOT EXISTS booking_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- e.g., 'Airbnb', 'Booking.com', 'Direct', 'VRBO'
    commission_rate DECIMAL(5,2) DEFAULT 0.00, -- Commission percentage
    payment_processing_fee DECIMAL(5,2) DEFAULT 0.00, -- Processing fee percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upsells table for additional services
CREATE TABLE IF NOT EXISTS upsells (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_reference TEXT UNIQUE NOT NULL, -- External booking reference
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES booking_channels(id) ON DELETE SET NULL,
    
    -- Booking dates
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
    
    -- Financial details
    accommodation_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    extra_charges DECIMAL(10,2) DEFAULT 0.00,
    cleaning_fee DECIMAL(10,2) DEFAULT 0.00,
    booking_taxes DECIMAL(10,2) DEFAULT 0.00,
    channel_commission DECIMAL(10,2) DEFAULT 0.00,
    payment_processing_fee DECIMAL(10,2) DEFAULT 0.00,
    total_payout DECIMAL(10,2) GENERATED ALWAYS AS (
        accommodation_total 
        - discount_amount 
        + extra_charges 
        + cleaning_fee 
        + booking_taxes 
        - channel_commission 
        - payment_processing_fee
    ) STORED,
    
    -- Status and metadata
    booking_status TEXT DEFAULT 'confirmed' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking upsells junction table
CREATE TABLE IF NOT EXISTS booking_upsells (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    upsell_id UUID REFERENCES upsells(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(booking_id, upsell_id)
);

-- Custom expenses table for additional costs
CREATE TABLE IF NOT EXISTS custom_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    expense_name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_name ON guests(name);
CREATE INDEX idx_bookings_apartment_id ON bookings(apartment_id);
CREATE INDEX idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX idx_bookings_channel_id ON bookings(channel_id);
CREATE INDEX idx_bookings_check_in_date ON bookings(check_in_date);
CREATE INDEX idx_bookings_check_out_date ON bookings(check_out_date);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_booking_upsells_booking_id ON booking_upsells(booking_id);
CREATE INDEX idx_custom_expenses_booking_id ON custom_expenses(booking_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_guests_updated_at 
    BEFORE UPDATE ON guests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_channels_updated_at 
    BEFORE UPDATE ON booking_channels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upsells_updated_at 
    BEFORE UPDATE ON upsells 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_expenses_updated_at 
    BEFORE UPDATE ON custom_expenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample booking channels
INSERT INTO booking_channels (name, commission_rate, payment_processing_fee) VALUES
('Airbnb', 3.00, 2.50),
('Booking.com', 15.00, 2.50),
('VRBO', 5.00, 2.50),
('Direct', 0.00, 2.50),
('Expedia', 12.00, 2.50)
ON CONFLICT (name) DO NOTHING;

-- Insert sample upsells
INSERT INTO upsells (name, price) VALUES
('Airport Transfer', 25.00),
('Welcome Pack', 15.00),
('Late Checkout', 10.00),
('Extra Cleaning', 30.00),
('Linen Change', 20.00)
ON CONFLICT DO NOTHING;

-- Insert sample guests
INSERT INTO guests (name, email, phone) VALUES
('John Smith', 'john.smith@email.com', '+27 82 123 4567'),
('Sarah Johnson', 'sarah.johnson@email.com', '+27 83 234 5678'),
('Mike Chen', 'mike.chen@email.com', '+27 84 345 6789'),
('Emma Davis', 'emma.davis@email.com', '+27 85 456 7890'),
('Lisa Brown', 'lisa.brown@email.com', '+27 86 567 8901')
ON CONFLICT DO NOTHING;

-- Insert sample bookings (assuming apartments exist)
INSERT INTO bookings (
    booking_reference,
    apartment_id,
    guest_id,
    channel_id,
    check_in_date,
    check_out_date,
    accommodation_total,
    discount_amount,
    extra_charges,
    cleaning_fee,
    booking_taxes,
    channel_commission,
    payment_processing_fee,
    booking_status
) VALUES
(
    'AIR-2024-001',
    (SELECT id FROM apartments WHERE apartment_number = '101' LIMIT 1),
    (SELECT id FROM guests WHERE name = 'John Smith' LIMIT 1),
    (SELECT id FROM booking_channels WHERE name = 'Airbnb' LIMIT 1),
    '2024-01-15',
    '2024-01-18',
    450.00,
    0.00,
    25.00,
    50.00,
    45.00,
    13.50,
    11.25,
    'completed'
),
(
    'BOOK-2024-002',
    (SELECT id FROM apartments WHERE apartment_number = '102' LIMIT 1),
    (SELECT id FROM guests WHERE name = 'Sarah Johnson' LIMIT 1),
    (SELECT id FROM booking_channels WHERE name = 'Booking.com' LIMIT 1),
    '2024-01-20',
    '2024-01-25',
    750.00,
    50.00,
    0.00,
    50.00,
    75.00,
    112.50,
    18.75,
    'completed'
),
(
    'DIR-2024-003',
    (SELECT id FROM apartments WHERE apartment_number = '201' LIMIT 1),
    (SELECT id FROM guests WHERE name = 'Mike Chen' LIMIT 1),
    (SELECT id FROM booking_channels WHERE name = 'Direct' LIMIT 1),
    '2024-01-22',
    '2024-01-24',
    300.00,
    0.00,
    15.00,
    50.00,
    30.00,
    0.00,
    7.50,
    'completed'
);

-- Create a comprehensive view for owner statements
CREATE OR REPLACE VIEW owner_statements_view AS
SELECT 
    b.id as booking_id,
    b.booking_reference,
    a.apartment_number as property_name,
    a.owner_name,
    a.owner_email,
    g.name as guest_name,
    g.email as guest_email,
    bc.name as channel_name,
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
    b.total_payout,
    b.booking_status,
    b.booking_date,
    b.notes as booking_notes,
    COALESCE(upsell_totals.upsell_total, 0) as upsell_total,
    COALESCE(expense_totals.expense_total, 0) as custom_expense_total
FROM bookings b
JOIN apartments a ON b.apartment_id = a.id
JOIN guests g ON b.guest_id = g.id
LEFT JOIN booking_channels bc ON b.channel_id = bc.id
LEFT JOIN (
    SELECT 
        booking_id,
        SUM(total_price) as upsell_total
    FROM booking_upsells
    GROUP BY booking_id
) upsell_totals ON b.id = upsell_totals.booking_id
LEFT JOIN (
    SELECT 
        booking_id,
        SUM(amount) as expense_total
    FROM custom_expenses
    GROUP BY booking_id
) expense_totals ON b.id = expense_totals.booking_id;

-- Grant necessary permissions
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsells ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_upsells ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow authenticated users to view guests" ON guests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view booking_channels" ON booking_channels
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view upsells" ON upsells
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view bookings" ON bookings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view booking_upsells" ON booking_upsells
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view custom_expenses" ON custom_expenses
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role policies for API routes
CREATE POLICY "Allow service role full access to guests" ON guests
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to booking_channels" ON booking_channels
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to upsells" ON upsells
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to bookings" ON bookings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to booking_upsells" ON booking_upsells
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to custom_expenses" ON custom_expenses
    FOR ALL USING (auth.role() = 'service_role');
