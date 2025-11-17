-- ============================================
-- FIX: Corrigir RLS da tabela access_requests
-- Remove acesso público de leitura aos dados pessoais
-- ============================================

-- Garantir que RLS está habilitado
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes de SELECT
DROP POLICY IF EXISTS "Anyone can insert access_requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can read all access_requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can update access_requests" ON public.access_requests;

-- Recriar política de INSERT (pública - para formulário de solicitação)
CREATE POLICY "Anyone can submit access requests"
ON public.access_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Criar política de SELECT (restrita a admins)
CREATE POLICY "Only admins can view access requests"
ON public.access_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Criar política de UPDATE (restrita a admins)
CREATE POLICY "Only admins can update access requests"
ON public.access_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Criar política de DELETE (restrita a admins)
CREATE POLICY "Only admins can delete access requests"
ON public.access_requests
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Comentário para auditoria
COMMENT ON TABLE public.access_requests IS 'Tabela de solicitações de acesso. Contém dados pessoais (emails, nomes) protegidos por RLS. Apenas admins podem ler/modificar.';