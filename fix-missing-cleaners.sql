-- Fix missing cleaners by adding them to the cleaners table
-- These cleaners exist in RSA laundry expenses but not in the main cleaners table

-- Insert Sylvia
INSERT INTO cleaners (id, name, email, phone, is_active, created_at, updated_at) 
VALUES ('c0640cd0-dad4-412d-8bd7-6ed1ca84b5ea', 'Sylvia', 's@mail.com', '0897876789', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Insert Wowo
INSERT INTO cleaners (id, name, email, phone, is_active, created_at, updated_at) 
VALUES ('b5a94f64-6d5b-4559-9691-1b12bbab2aaf', 'Wowo', 'wowo@email.com', '+27 82 123 4567', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify the cleaners were added
SELECT id, name, email, phone, is_active FROM cleaners WHERE id IN (
  'c0640cd0-dad4-412d-8bd7-6ed1ca84b5ea',
  'b5a94f64-6d5b-4559-9691-1b12bbab2aaf'
);
