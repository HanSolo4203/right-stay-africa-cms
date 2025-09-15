-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.apartments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  apartment_number text NOT NULL UNIQUE,
  owner_name text NOT NULL,
  owner_email text,
  address text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cleaner_payout numeric,
  CONSTRAINT apartments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cleaners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cleaners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cleaning_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  apartment_id uuid,
  cleaner_id uuid,
  cleaning_date date NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  price numeric,
  CONSTRAINT cleaning_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT cleaning_sessions_apartment_id_fkey FOREIGN KEY (apartment_id) REFERENCES public.apartments(id),
  CONSTRAINT cleaning_sessions_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.cleaners(id)
);