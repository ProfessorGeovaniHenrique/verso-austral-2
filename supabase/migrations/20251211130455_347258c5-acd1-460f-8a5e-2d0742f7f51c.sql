-- Fix RLS policies for semantic_disambiguation_cache table
-- Issue: Unrestricted SELECT access to proprietary semantic analysis data

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Sistema pode gerenciar cache" ON public.semantic_disambiguation_cache;
DROP POLICY IF EXISTS "Cache é público para leitura" ON public.semantic_disambiguation_cache;
DROP POLICY IF EXISTS "Admins have full access to semantic_disambiguation_cache" ON public.semantic_disambiguation_cache;

-- Ensure RLS is enabled
ALTER TABLE public.semantic_disambiguation_cache ENABLE ROW LEVEL SECURITY;

-- Only admins can read semantic cache (protects proprietary data)
CREATE POLICY "Only admins can read semantic_disambiguation_cache"
ON public.semantic_disambiguation_cache
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System/Edge functions can insert/update cache data
CREATE POLICY "System can insert semantic_disambiguation_cache"
ON public.semantic_disambiguation_cache
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "System can update semantic_disambiguation_cache"
ON public.semantic_disambiguation_cache
FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Only admins can delete cache entries
CREATE POLICY "Only admins can delete semantic_disambiguation_cache"
ON public.semantic_disambiguation_cache
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));