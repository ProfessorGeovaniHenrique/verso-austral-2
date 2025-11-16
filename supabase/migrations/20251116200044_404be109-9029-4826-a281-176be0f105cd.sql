-- FASE 1: Sistema de Hierarquia Limitada de Tagsets (3-4 níveis)

-- 1.1. Atualizar semantic_tagset com hierarquia explícita
ALTER TABLE semantic_tagset
  ADD COLUMN codigo_nivel_1 text,
  ADD COLUMN codigo_nivel_2 text,
  ADD COLUMN codigo_nivel_3 text,
  ADD COLUMN codigo_nivel_4 text,
  ADD COLUMN nivel_profundidade int CHECK (nivel_profundidade BETWEEN 1 AND 4),
  ADD COLUMN hierarquia_completa text,
  ADD COLUMN tagset_pai text REFERENCES semantic_tagset(codigo),
  ADD COLUMN tagsets_filhos text[] DEFAULT '{}';

-- Criar índices para queries hierárquicas
CREATE INDEX idx_tagset_nivel_1 ON semantic_tagset(codigo_nivel_1);
CREATE INDEX idx_tagset_nivel_2 ON semantic_tagset(codigo_nivel_2);
CREATE INDEX idx_tagset_hierarquia ON semantic_tagset(hierarquia_completa);
CREATE INDEX idx_tagset_pai ON semantic_tagset(tagset_pai);

-- Função para validar hierarquia (max 4 níveis)
CREATE OR REPLACE FUNCTION validate_tagset_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  partes text[];
BEGIN
  -- Contar níveis no código
  partes := string_to_array(NEW.codigo, '.');
  
  IF array_length(partes, 1) > 4 THEN
    RAISE EXCEPTION 'Hierarquia limitada a 4 níveis máximos';
  END IF;
  
  -- Extrair códigos de cada nível
  NEW.nivel_profundidade := array_length(partes, 1);
  
  NEW.codigo_nivel_1 := partes[1];
  NEW.codigo_nivel_2 := CASE WHEN array_length(partes, 1) >= 2 THEN partes[1] || '.' || partes[2] ELSE NULL END;
  NEW.codigo_nivel_3 := CASE WHEN array_length(partes, 1) >= 3 THEN partes[1] || '.' || partes[2] || '.' || partes[3] ELSE NULL END;
  NEW.codigo_nivel_4 := CASE WHEN array_length(partes, 1) = 4 THEN partes[1] || '.' || partes[2] || '.' || partes[3] || '.' || partes[4] ELSE NULL END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_tagset_hierarchy
  BEFORE INSERT OR UPDATE ON semantic_tagset
  FOR EACH ROW EXECUTE FUNCTION validate_tagset_hierarchy();

-- 1.2. Adicionar configuração de visualização por usuário
CREATE TABLE user_visualization_preferences (
  user_id uuid PRIMARY KEY,
  modo_visualizacao text DEFAULT 'geral' CHECK (modo_visualizacao IN ('geral', 'subnivel', 'hierarquico')),
  nivel_detalhamento int DEFAULT 1 CHECK (nivel_detalhamento BETWEEN 1 AND 4),
  mostrar_hierarquia_completa boolean DEFAULT false,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Permitir leitura e escrita de preferências
ALTER TABLE user_visualization_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ler suas preferências"
ON user_visualization_preferences FOR SELECT
USING (true);

CREATE POLICY "Usuários podem inserir suas preferências"
ON user_visualization_preferences FOR INSERT
WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar suas preferências"
ON user_visualization_preferences FOR UPDATE
USING (true);

-- FASE 2: Tabelas para Recursos Lexicais (Dicionários)

-- 2.1. Tabela de Sinônimos (Houaiss)
CREATE TABLE lexical_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  palavra text NOT NULL,
  pos text,
  acepcao_numero int,
  acepcao_descricao text,
  sinonimos text[],
  antonimos text[],
  contexto_uso text,
  fonte text DEFAULT 'houaiss',
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_synonyms_palavra ON lexical_synonyms(palavra);
CREATE INDEX idx_synonyms_sinonimos ON lexical_synonyms USING gin(sinonimos);

-- Permitir leitura pública
ALTER TABLE lexical_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sinônimos são públicos"
ON lexical_synonyms FOR SELECT
USING (true);

CREATE POLICY "Edge functions podem inserir sinônimos"
ON lexical_synonyms FOR INSERT
WITH CHECK (true);

-- 2.2. Tabela de Definições (UNESP)
CREATE TABLE lexical_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  palavra text NOT NULL,
  pos text,
  definicao text,
  exemplos text[],
  registro_uso text,
  area_conhecimento text,
  etimologia text,
  fonte text DEFAULT 'unesp',
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_definitions_palavra ON lexical_definitions(palavra);

-- Permitir leitura pública
ALTER TABLE lexical_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Definições são públicas"
ON lexical_definitions FOR SELECT
USING (true);

CREATE POLICY "Edge functions podem inserir definições"
ON lexical_definitions FOR INSERT
WITH CHECK (true);

-- 2.3. Tabela de Redes Semânticas
CREATE TABLE semantic_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  palavra_origem text NOT NULL,
  palavra_destino text NOT NULL,
  tipo_relacao text CHECK (tipo_relacao IN ('sinonimo', 'antonimo', 'hiponimo', 'hiperonimo')),
  peso_relacao numeric(5,2) DEFAULT 1.0,
  contexto text,
  fonte text,
  criado_em timestamptz DEFAULT now(),
  UNIQUE(palavra_origem, palavra_destino, tipo_relacao)
);

CREATE INDEX idx_networks_origem ON semantic_networks(palavra_origem);
CREATE INDEX idx_networks_destino ON semantic_networks(palavra_destino);

-- Permitir leitura pública
ALTER TABLE semantic_networks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Redes semânticas são públicas"
ON semantic_networks FOR SELECT
USING (true);

CREATE POLICY "Edge functions podem inserir redes"
ON semantic_networks FOR INSERT
WITH CHECK (true);

-- 2.4. Tabela de Aprendizado do Sistema (Padrões de Multi-Tagging)
CREATE TABLE semantic_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  palavra text NOT NULL,
  pos text,
  contexto_tipo text,
  tagsets_sugeridos jsonb NOT NULL,
  frequencia_validacoes int DEFAULT 0,
  taxa_acerto numeric(5,2) DEFAULT 0.0,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_patterns_palavra ON semantic_patterns(palavra);
CREATE INDEX idx_patterns_contexto ON semantic_patterns(contexto_tipo);

-- Permitir leitura e escrita
ALTER TABLE semantic_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Padrões são públicos"
ON semantic_patterns FOR SELECT
USING (true);

CREATE POLICY "Sistema pode criar padrões"
ON semantic_patterns FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar padrões"
ON semantic_patterns FOR UPDATE
USING (true);

-- FASE 3: Atualizar tabelas de anotação para suportar multi-tagging

-- 3.1. Modificar semantic_lexicon
ALTER TABLE semantic_lexicon 
  ADD COLUMN tagsets jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN tagset_primario text,
  ALTER COLUMN tagset_codigo DROP NOT NULL;

CREATE INDEX idx_lexicon_tagsets ON semantic_lexicon USING gin(tagsets);

-- 3.2. Modificar annotated_corpus
ALTER TABLE annotated_corpus
  ADD COLUMN tagsets jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN tagset_primario text,
  ALTER COLUMN tagset_codigo DROP NOT NULL;

CREATE INDEX idx_corpus_tagsets ON annotated_corpus USING gin(tagsets);

-- Comentários para documentação
COMMENT ON COLUMN semantic_lexicon.tagsets IS 
  'Array de objetos: [{"codigo": "CG.01", "peso": 0.85, "contexto": "trabalho campeiro", "justificativa": "..."}]';
COMMENT ON COLUMN semantic_lexicon.tagset_primario IS 
  'Código do tagset predominante (deve existir em tagsets array)';

COMMENT ON TABLE user_visualization_preferences IS 
  'Preferências de visualização hierárquica por usuário';

COMMENT ON TABLE semantic_patterns IS 
  'Padrões aprendidos de multi-tagging baseados em validações humanas';