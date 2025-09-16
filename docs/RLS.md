-- Enable Row Level Security on all tables
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_sessions ENABLE ROW LEVEL SECURITY;

-- APARTMENTS TABLE POLICIES
-- Allow authenticated users to view all apartments
CREATE POLICY "Allow authenticated users to view apartments" ON public.apartments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert apartments
CREATE POLICY "Allow authenticated users to insert apartments" ON public.apartments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update apartments
CREATE POLICY "Allow authenticated users to update apartments" ON public.apartments
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete apartments
CREATE POLICY "Allow authenticated users to delete apartments" ON public.apartments
    FOR DELETE USING (auth.role() = 'authenticated');

-- CLEANERS TABLE POLICIES
-- Allow authenticated users to view all cleaners
CREATE POLICY "Allow authenticated users to view cleaners" ON public.cleaners
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert cleaners
CREATE POLICY "Allow authenticated users to insert cleaners" ON public.cleaners
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update cleaners
CREATE POLICY "Allow authenticated users to update cleaners" ON public.cleaners
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete cleaners
CREATE POLICY "Allow authenticated users to delete cleaners" ON public.cleaners
    FOR DELETE USING (auth.role() = 'authenticated');

-- CLEANING_SESSIONS TABLE POLICIES
-- Allow authenticated users to view all cleaning sessions
CREATE POLICY "Allow authenticated users to view cleaning_sessions" ON public.cleaning_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert cleaning sessions
CREATE POLICY "Allow authenticated users to insert cleaning_sessions" ON public.cleaning_sessions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update cleaning sessions
CREATE POLICY "Allow authenticated users to update cleaning_sessions" ON public.cleaning_sessions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete cleaning sessions
CREATE POLICY "Allow authenticated users to delete cleaning_sessions" ON public.cleaning_sessions
    FOR DELETE USING (auth.role() = 'authenticated');

-- CLEANING_SESSIONS_DETAILED VIEW POLICIES
-- Enable RLS on the view
ALTER TABLE public.cleaning_sessions_detailed ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view the detailed cleaning sessions view
CREATE POLICY "Allow authenticated users to view cleaning_sessions_detailed" ON public.cleaning_sessions_detailed
    FOR SELECT USING (auth.role() = 'authenticated');

-- Note: Views typically only need SELECT policies as they're read-only
-- INSERT/UPDATE/DELETE operations should be done on the underlying tables

-- Optional: If you want to grant service_role access (for server-side operations)
-- Uncomment the following policies if needed:

/*
-- Service role policies for apartments
CREATE POLICY "Allow service role full access to apartments" ON public.apartments
    FOR ALL USING (auth.role() = 'service_role');

-- Service role policies for cleaners
CREATE POLICY "Allow service role full access to cleaners" ON public.cleaners
    FOR ALL USING (auth.role() = 'service_role');

-- Service role policies for cleaning_sessions
CREATE POLICY "Allow service role full access to cleaning_sessions" ON public.cleaning_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Service role policy for cleaning_sessions_detailed view
CREATE POLICY "Allow service role to view cleaning_sessions_detailed" ON public.cleaning_sessions_detailed
    FOR SELECT USING (auth.role() = 'service_role');
*/