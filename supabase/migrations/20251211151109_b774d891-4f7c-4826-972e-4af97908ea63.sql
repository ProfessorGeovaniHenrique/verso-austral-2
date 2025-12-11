
-- ============================================
-- SECURITY FIX: processing_jobs - Restrict access (v2)
-- ============================================

-- Drop ALL existing policies including admin
DROP POLICY IF EXISTS "Admins have full access to processing_jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Allow all access" ON public.processing_jobs;
DROP POLICY IF EXISTS "Anyone can insert processing_jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Anyone can update processing_jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Anyone can read processing_jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Public can access processing_jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Authenticated users can read processing_jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Sistema pode inserir processing_jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Sistema pode atualizar processing_jobs" ON public.processing_jobs;

-- Ensure RLS is enabled
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins have full access to processing_jobs"
ON public.processing_jobs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can read jobs (for monitoring)
CREATE POLICY "Authenticated users can read processing_jobs"
ON public.processing_jobs
FOR SELECT
TO authenticated
USING (true);

-- Add security comment
COMMENT ON TABLE public.processing_jobs IS 
'Processing pipeline jobs for music enrichment.
SECURITY: 
- SELECT: Authenticated users (for monitoring)
- INSERT/UPDATE/DELETE: Admins only (service role bypasses RLS for edge functions)';
