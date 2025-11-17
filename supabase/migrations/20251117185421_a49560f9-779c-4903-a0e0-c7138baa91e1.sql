-- ============================================
-- ANALYTICS SYSTEM - Tabelas e Funções
-- ============================================

-- Tabela principal de eventos de analytics
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  event_metadata JSONB DEFAULT '{}'::jsonb,
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);

-- Tabela de sessões de usuário
CREATE TABLE public.analytics_user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  pages_visited INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0
);

CREATE INDEX idx_analytics_sessions_user ON analytics_user_sessions(user_id);
CREATE INDEX idx_analytics_sessions_started ON analytics_user_sessions(started_at DESC);

-- Tabela de uso de features (agregada)
CREATE TABLE public.analytics_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  first_used_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

CREATE INDEX idx_analytics_feature_user ON analytics_feature_usage(user_id);
CREATE INDEX idx_analytics_feature_name ON analytics_feature_usage(feature_name);

-- Tabela de solicitações de acesso
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  institution TEXT,
  role_requested TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  invited_at TIMESTAMPTZ,
  invite_key_id UUID REFERENCES public.invite_keys(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_requests_status ON access_requests(status);
CREATE INDEX idx_access_requests_created ON access_requests(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Analytics Events Policies
CREATE POLICY "Anyone can insert analytics_events"
ON public.analytics_events FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Admins can read all analytics_events"
ON public.analytics_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Analytics Sessions Policies
CREATE POLICY "Anyone can insert analytics_user_sessions"
ON public.analytics_user_sessions FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Admins can read analytics_user_sessions"
ON public.analytics_user_sessions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own sessions"
ON public.analytics_user_sessions FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Feature Usage Policies
CREATE POLICY "Users can upsert their own feature usage"
ON public.analytics_feature_usage FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read analytics_feature_usage"
ON public.analytics_feature_usage FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Access Requests Policies
CREATE POLICY "Anyone can insert access_requests"
ON public.access_requests FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Admins can read all access_requests"
ON public.access_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update access_requests"
ON public.access_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FUNÇÕES
-- ============================================

-- Função para incrementar uso de feature
CREATE OR REPLACE FUNCTION public.increment_feature_usage(
  _user_id UUID,
  _feature_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_feature_usage (user_id, feature_name, usage_count, first_used_at, last_used_at)
  VALUES (_user_id, _feature_name, 1, NOW(), NOW())
  ON CONFLICT (user_id, feature_name)
  DO UPDATE SET
    usage_count = analytics_feature_usage.usage_count + 1,
    last_used_at = NOW();
END;
$$;

-- Trigger para atualizar timestamp de access_requests
CREATE OR REPLACE FUNCTION update_access_request_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_access_request_updated_at
BEFORE UPDATE ON public.access_requests
FOR EACH ROW
EXECUTE FUNCTION update_access_request_timestamp();

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.analytics_events IS 'Rastreamento de eventos da aplicação';
COMMENT ON TABLE public.analytics_user_sessions IS 'Sessões de usuários para análise de comportamento';
COMMENT ON TABLE public.analytics_feature_usage IS 'Uso agregado de features por usuário';
COMMENT ON TABLE public.access_requests IS 'Solicitações de acesso de professores e pesquisadores';