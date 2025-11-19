-- FASE 3: Schema para aplicação de metadados ao corpus

-- Tabela de versões do corpus (backup e versionamento)
CREATE TABLE IF NOT EXISTS corpus_metadata_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus_type TEXT NOT NULL CHECK (corpus_type IN ('gaucho', 'nordestino')),
  version_number BIGINT NOT NULL,
  content_snapshot TEXT NOT NULL,
  applied_by UUID REFERENCES auth.users(id),
  metadata_count INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico de aplicações
CREATE TABLE IF NOT EXISTS metadata_application_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus_type TEXT NOT NULL CHECK (corpus_type IN ('gaucho', 'nordestino')),
  songs_updated INT NOT NULL,
  applied_by UUID REFERENCES auth.users(id),
  application_source TEXT NOT NULL,
  backup_version_id UUID REFERENCES corpus_metadata_versions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies para admins

ALTER TABLE corpus_metadata_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_application_history ENABLE ROW LEVEL SECURITY;

-- Admins podem ler versões
CREATE POLICY "Admins can view corpus versions"
ON corpus_metadata_versions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Sistema pode inserir versões
CREATE POLICY "System can insert corpus versions"
ON corpus_metadata_versions FOR INSERT
WITH CHECK (true);

-- Admins podem ver histórico
CREATE POLICY "Admins can view application history"
ON metadata_application_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Sistema pode inserir histórico
CREATE POLICY "System can insert application history"
ON metadata_application_history FOR INSERT
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_corpus_versions_type_created ON corpus_metadata_versions(corpus_type, created_at DESC);
CREATE INDEX idx_application_history_type_created ON metadata_application_history(corpus_type, created_at DESC);
CREATE INDEX idx_application_history_user ON metadata_application_history(applied_by);