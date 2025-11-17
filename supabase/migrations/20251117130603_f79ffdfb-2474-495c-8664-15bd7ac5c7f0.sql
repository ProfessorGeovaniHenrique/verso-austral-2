-- FASE 1: Database Schema para Sistema de Autenticação com Invite Keys

-- 1. Criar Enum para Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'evaluator');

-- 2. Tabela de Roles de Usuários
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL DEFAULT 'evaluator',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Tabela de Convites/Chaves de Acesso
CREATE TABLE public.invite_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    role public.app_role DEFAULT 'evaluator',
    notes TEXT
);

-- 4. Índices para Performance
CREATE INDEX idx_invite_keys_key_code ON public.invite_keys(key_code) WHERE is_active = true;
CREATE INDEX idx_invite_keys_active ON public.invite_keys(is_active, used_at) WHERE is_active = true;
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- 5. Função Security Definer para Checagem de Role (evita RLS recursivo)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. Função para Gerar Código de Convite Único (formato VA-XXXX-XXXX)
CREATE OR REPLACE FUNCTION public.generate_invite_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gera código no formato: VA-XXXX-XXXX
    key_code := 'VA-' || 
                UPPER(substring(md5(random()::text) from 1 for 4)) || '-' ||
                UPPER(substring(md5(random()::text) from 1 for 4));
    
    -- Verifica se já existe
    SELECT EXISTS(SELECT 1 FROM public.invite_keys WHERE key_code = key_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN key_code;
END;
$$;

-- 7. Habilitar Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_keys ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies para user_roles

-- Usuários podem ver apenas suas próprias roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins podem ver todas as roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem inserir roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins podem atualizar roles
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins podem deletar roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 9. RLS Policies para invite_keys

-- Admins podem ver todos os convites
CREATE POLICY "Admins can view invite keys"
ON public.invite_keys FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem criar convites
CREATE POLICY "Admins can create invite keys"
ON public.invite_keys FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins podem atualizar convites
CREATE POLICY "Admins can update invite keys"
ON public.invite_keys FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Usuários autenticados podem marcar um convite como usado (validação adicional na aplicação)
CREATE POLICY "Users can use invite keys"
ON public.invite_keys FOR UPDATE
TO authenticated
USING (
  is_active = true 
  AND used_at IS NULL 
  AND (expires_at IS NULL OR expires_at > now())
)
WITH CHECK (used_by = auth.uid());

-- 10. Trigger para Atribuir Role Automaticamente ao Usar Convite
CREATE OR REPLACE FUNCTION public.assign_role_on_invite_use()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o convite foi marcado como usado (novo used_by quando era NULL)
  IF NEW.used_by IS NOT NULL AND OLD.used_by IS NULL THEN
    -- Inserir role na tabela user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.used_by, NEW.role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Marcar convite como inativo
    NEW.is_active := false;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_invite_key_used
AFTER UPDATE ON public.invite_keys
FOR EACH ROW
WHEN (NEW.used_by IS NOT NULL AND OLD.used_by IS NULL)
EXECUTE FUNCTION public.assign_role_on_invite_use();

-- 11. Comentários para Documentação
COMMENT ON TABLE public.user_roles IS 'Armazena as roles dos usuários (admin, evaluator)';
COMMENT ON TABLE public.invite_keys IS 'Chaves de convite para cadastro de novos usuários';
COMMENT ON FUNCTION public.has_role IS 'Verifica se um usuário possui uma role específica (usado em RLS)';
COMMENT ON FUNCTION public.generate_invite_key IS 'Gera código único de convite no formato VA-XXXX-XXXX';
COMMENT ON FUNCTION public.assign_role_on_invite_use IS 'Atribui automaticamente a role ao usuário quando um convite é usado';