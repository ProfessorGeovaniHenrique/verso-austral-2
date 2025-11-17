-- Tabela para feedback humano nas análises da IA
CREATE TABLE IF NOT EXISTS public.ai_analysis_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id TEXT NOT NULL,
  analysis_id UUID NOT NULL REFERENCES public.ai_analysis_history(id) ON DELETE CASCADE,
  human_verdict TEXT NOT NULL CHECK (human_verdict IN ('valid', 'false_positive', 'already_fixed')),
  validator_notes TEXT,
  validated_by TEXT,
  validated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_feedback_analysis_id ON public.ai_analysis_feedback(analysis_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_feedback_suggestion_id ON public.ai_analysis_feedback(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_feedback_verdict ON public.ai_analysis_feedback(human_verdict);

-- RLS policies
ALTER TABLE public.ai_analysis_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de feedback"
  ON public.ai_analysis_feedback
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção de feedback"
  ON public.ai_analysis_feedback
  FOR INSERT
  WITH CHECK (true);

-- Adicionar coluna confidence_score na tabela ai_suggestion_status
ALTER TABLE public.ai_suggestion_status 
ADD COLUMN IF NOT EXISTS confidence_score INTEGER DEFAULT 100 CHECK (confidence_score >= 0 AND confidence_score <= 100),
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'auto-verified', 'false-positive', 'human-verified'));

-- Adicionar colunas para tracking de contexto na ai_analysis_history
ALTER TABLE public.ai_analysis_history
ADD COLUMN IF NOT EXISTS context_used JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS bugs_auto_resolved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS false_positives_filtered INTEGER DEFAULT 0;