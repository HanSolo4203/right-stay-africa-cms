-- Simple script to add missing cleaners
-- Run this in your Supabase SQL editor

INSERT INTO cleaners (id, name, email, phone, is_active, created_at, updated_at) 
VALUES ('c0640cd0-dad4-412d-8bd7-6ed1ca84b5ea', 'Sylvia', 's@mail.com', '0897876789', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO cleaners (id, name, email, phone, is_active, created_at, updated_at) 
VALUES ('b5a94f64-6d5b-4559-9691-1b12bbab2aaf', 'Wowo', 'wowo@email.com', '+27 82 123 4567', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
