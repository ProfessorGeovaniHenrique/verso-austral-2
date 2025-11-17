-- Criar função SECURITY DEFINER para buscar usuários com roles
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role app_role
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    ur.role
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON u.id = ur.user_id
  ORDER BY u.created_at DESC;
$$;