-- Criar tabela de corpora
CREATE TABLE corpora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'FolderMusic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_system BOOLEAN DEFAULT FALSE
);

-- Inserir corpora padrão
INSERT INTO corpora (name, normalized_name, description, color, icon, is_system) VALUES
  ('Corpus Gaúcho', 'corpus-gaucho', 'Músicas da cultura gaúcha do Rio Grande do Sul', '#10B981', 'Music', TRUE),
  ('Corpus Nordestino', 'corpus-nordestino', 'Músicas da cultura nordestina', '#F59E0B', 'Disc', TRUE),
  ('Corpus Sertanejo', 'corpus-sertanejo', 'Músicas do gênero sertanejo brasileiro', '#8B5CF6', 'Guitar', TRUE);

-- Adicionar colunas corpus_id nas tabelas existentes
ALTER TABLE artists ADD COLUMN corpus_id UUID REFERENCES corpora(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN corpus_id UUID REFERENCES corpora(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX idx_artists_corpus_id ON artists(corpus_id);
CREATE INDEX idx_songs_corpus_id ON songs(corpus_id);
CREATE INDEX idx_corpora_normalized_name ON corpora(normalized_name);

-- RLS Policies
ALTER TABLE corpora ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corpora são públicos para leitura"
  ON corpora FOR SELECT
  USING (true);

CREATE POLICY "Admins podem criar corpora"
  ON corpora FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar corpora não-sistema"
  ON corpora FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND (is_system = FALSE OR auth.uid() = created_by)
  );

CREATE POLICY "Admins podem deletar corpora não-sistema"
  ON corpora FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND is_system = FALSE
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_corpora_updated_at
  BEFORE UPDATE ON corpora
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();