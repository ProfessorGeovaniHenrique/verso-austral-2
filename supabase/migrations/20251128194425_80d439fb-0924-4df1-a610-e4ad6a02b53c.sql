-- Criar função SECURITY DEFINER para marcar convite como usado
-- Esta função bypassa RLS e marca o convite como consumido após verificação bem-sucedida
CREATE OR REPLACE FUNCTION public.mark_invite_as_used(
  p_invite_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar o convite para marcar como usado
  UPDATE invite_keys
  SET 
    used_by = p_user_id,
    used_at = NOW(),
    is_active = false
  WHERE id = p_invite_id
    AND used_by IS NULL  -- Só marca se ainda não foi usado
    AND is_active = true;
  
  -- Retornar true se atualizou alguma linha
  RETURN FOUND;
END;
$$;

-- Permitir que qualquer usuário autenticado execute a função
GRANT EXECUTE ON FUNCTION public.mark_invite_as_used(uuid, uuid) TO authenticated;