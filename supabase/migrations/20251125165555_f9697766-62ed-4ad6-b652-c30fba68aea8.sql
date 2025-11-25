-- ==========================================
-- SPRINT 1: SEMANTIC ANNOTATION DUAL-LAYER
-- ==========================================

-- 1️⃣ Tabela: Taxonomia de Domínios Semânticos Gaúchos (18 domínios)
CREATE TABLE IF NOT EXISTS public.semantic_tagset_gaucho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE, -- Códigos mnemônicos: NA, CL, AL, SE, etc.
  codigo_en TEXT NOT NULL, -- Tradução: Nature, Culture, Food, Feelings
  nome TEXT NOT NULL, -- Nome completo: "Natureza e Paisagem"
  nome_en TEXT NOT NULL, -- "Nature and Landscape"
  descricao TEXT,
  nivel_profundidade INTEGER DEFAULT 1 CHECK (nivel_profundidade >= 1 AND nivel_profundidade <= 3),
  categoria_pai TEXT REFERENCES public.semantic_tagset_gaucho(codigo),
  exemplos TEXT[] DEFAULT '{}',
  cor_hex TEXT DEFAULT '#3B82F6',
  icone TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'proposto', 'descontinuado')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_semantic_tagset_gaucho_codigo ON public.semantic_tagset_gaucho(codigo);
CREATE INDEX IF NOT EXISTS idx_semantic_tagset_gaucho_pai ON public.semantic_tagset_gaucho(categoria_pai);
CREATE INDEX IF NOT EXISTS idx_semantic_tagset_gaucho_status ON public.semantic_tagset_gaucho(status);

-- 2️⃣ Tabela: Cache de Desambiguação Semântica
CREATE TABLE IF NOT EXISTS public.semantic_disambiguation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  palavra TEXT NOT NULL,
  contexto_hash TEXT NOT NULL, -- Hash do contexto (esquerdo + direito)
  lema TEXT,
  pos TEXT,
  tagset_codigo TEXT NOT NULL REFERENCES public.semantic_tagset_gaucho(codigo),
  confianca NUMERIC(3,2) DEFAULT 0.95 CHECK (confianca >= 0 AND confianca <= 1),
  fonte TEXT DEFAULT 'gemini_flash' CHECK (fonte IN ('gemini_flash', 'gemini_pro', 'rule_based', 'manual')),
  justificativa TEXT,
  hits_count INTEGER DEFAULT 0,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_hit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(palavra, contexto_hash)
);

-- Índices para lookups rápidos
CREATE INDEX IF NOT EXISTS idx_semantic_cache_lookup ON public.semantic_disambiguation_cache(palavra, contexto_hash);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_tagset ON public.semantic_disambiguation_cache(tagset_codigo);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_hits ON public.semantic_disambiguation_cache(hits_count DESC);

-- 3️⃣ Tabela: Atribuição de Insígnias Culturais
CREATE TABLE IF NOT EXISTS public.cultural_insignia_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  palavra TEXT NOT NULL,
  insignia TEXT NOT NULL, -- Gaúcho, Platino, Nordestino, etc.
  tipo_atribuicao TEXT NOT NULL CHECK (tipo_atribuicao IN ('primary', 'secondary')),
  fonte TEXT NOT NULL CHECK (fonte IN ('corpus_type', 'dialectal_lexicon', 'ai_inference')),
  confianca NUMERIC(3,2) DEFAULT 0.95,
  metadata JSONB DEFAULT '{}',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_insignia_palavra ON public.cultural_insignia_attribution(palavra);
CREATE INDEX IF NOT EXISTS idx_insignia_tipo ON public.cultural_insignia_attribution(tipo_atribuicao);

-- 4️⃣ Atualizar annotated_corpus para suportar nova arquitetura
-- Adicionar coluna para múltiplos tagsets (array de códigos)
ALTER TABLE public.annotated_corpus 
ADD COLUMN IF NOT EXISTS tagsets_array TEXT[] DEFAULT '{}';

-- Adicionar índice para busca por insígnias
CREATE INDEX IF NOT EXISTS idx_annotated_corpus_insignias ON public.annotated_corpus USING GIN(insignias_culturais);

-- 5️⃣ Inserir 18 Domínios Semânticos Gaúchos Iniciais
INSERT INTO public.semantic_tagset_gaucho (codigo, codigo_en, nome, nome_en, descricao, nivel_profundidade, cor_hex, icone) VALUES
('NA', 'Nature', 'Natureza e Paisagem', 'Nature and Landscape', 'Flora, fauna, elementos naturais, fenômenos climáticos, geografia', 1, '#10B981', 'Leaf'),
('CL', 'Culture', 'Cultura e Lida Gaúcha', 'Gaucho Culture and Work', 'Artefatos culturais, lida campeira, tradições gaúchas', 1, '#8B5CF6', 'Home'),
('SE', 'Feelings', 'Sentimentos e Abstrações', 'Feelings and Abstractions', 'Emoções, estados mentais, conceitos abstratos', 1, '#EF4444', 'Heart'),
('AV', 'Actions', 'Ações e Processos', 'Actions and Processes', 'Verbos de ação, processos, eventos', 1, '#F59E0B', 'Zap'),
('QE', 'Qualities', 'Qualidades e Estados', 'Qualities and States', 'Adjetivos descritivos, estados físicos/mentais', 1, '#06B6D4', 'Sparkles'),
('CV', 'Body', 'Corpo e Seres Vivos', 'Body and Living Beings', 'Partes do corpo, animais, seres vivos', 1, '#EC4899', 'User'),
('PF', 'Function', 'Palavras Funcionais', 'Function Words', 'Artigos, preposições, conjunções, conectivos', 1, '#6B7280', 'Link'),
('AL', 'Food', 'Alimentação e Bebidas', 'Food and Beverages', 'Comidas, bebidas, erva-mate, chimarrão', 1, '#84CC16', 'Coffee'),
('VR', 'Clothing', 'Vestimentas e Arreios', 'Clothing and Tack', 'Roupas gaúchas, pilchas, equipamentos de montaria', 1, '#F97316', 'Shirt'),
('LU', 'Place', 'Lugares e Estruturas', 'Places and Structures', 'Locais físicos, construções, galpão, estâncias', 1, '#3B82F6', 'MapPin'),
('TE', 'Time', 'Tempo e Cronologia', 'Time and Chronology', 'Períodos, estações, momentos do dia', 1, '#A855F7', 'Clock'),
('MU', 'Music', 'Música e Poesia', 'Music and Poetry', 'Instrumentos, gêneros musicais, elementos poéticos', 1, '#EC4899', 'Music'),
('SO', 'Social', 'Relações Sociais', 'Social Relations', 'Família, amizade, comunidade, hierarquia', 1, '#14B8A6', 'Users'),
('TR', 'Work', 'Trabalho e Ferramentas', 'Work and Tools', 'Lida campeira, ferramentas, utensílios', 1, '#F59E0B', 'Wrench'),
('AN', 'Animals', 'Animais e Pecuária', 'Animals and Livestock', 'Cavalos, gado, animais domésticos, montaria', 1, '#10B981', 'Horse'),
('CO', 'Commerce', 'Comércio e Economia', 'Commerce and Economy', 'Trocas, valores, pecuária como negócio', 1, '#EAB308', 'DollarSign'),
('RE', 'Religion', 'Religiosidade e Crenças', 'Religion and Beliefs', 'Fé, santos, crenças populares', 1, '#8B5CF6', 'Church'),
('FE', 'Festivities', 'Festas e Celebrações', 'Festivities and Celebrations', 'Rodeios, fandangos, celebrações tradicionais', 1, '#F97316', 'PartyPopper')
ON CONFLICT (codigo) DO NOTHING;

-- 6️⃣ Function: Limpar cache expirado (7 dias)
CREATE OR REPLACE FUNCTION public.clean_expired_semantic_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM semantic_disambiguation_cache 
  WHERE cached_at < NOW() - INTERVAL '7 days';
END;
$$;

-- 7️⃣ Function: Incrementar hit count no cache
CREATE OR REPLACE FUNCTION public.increment_semantic_cache_hit(cache_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE semantic_disambiguation_cache
  SET 
    hits_count = hits_count + 1,
    last_hit_at = NOW()
  WHERE id = cache_id;
END;
$$;

-- 8️⃣ RLS Policies

-- semantic_tagset_gaucho: público para leitura
ALTER TABLE public.semantic_tagset_gaucho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taxonomia é pública para leitura"
ON public.semantic_tagset_gaucho
FOR SELECT
USING (true);

CREATE POLICY "Admins podem inserir domínios"
ON public.semantic_tagset_gaucho
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar domínios"
ON public.semantic_tagset_gaucho
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- semantic_disambiguation_cache: público para leitura, sistema pode gerenciar
ALTER TABLE public.semantic_disambiguation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache é público para leitura"
ON public.semantic_disambiguation_cache
FOR SELECT
USING (true);

CREATE POLICY "Sistema pode gerenciar cache"
ON public.semantic_disambiguation_cache
FOR ALL
USING (true);

-- cultural_insignia_attribution: público para leitura
ALTER TABLE public.cultural_insignia_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atribuições são públicas"
ON public.cultural_insignia_attribution
FOR SELECT
USING (true);

CREATE POLICY "Sistema pode inserir atribuições"
ON public.cultural_insignia_attribution
FOR INSERT
WITH CHECK (true);

-- 9️⃣ Trigger: Update timestamp em semantic_tagset_gaucho
CREATE OR REPLACE FUNCTION public.update_semantic_tagset_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_semantic_tagset_gaucho_timestamp
BEFORE UPDATE ON public.semantic_tagset_gaucho
FOR EACH ROW
EXECUTE FUNCTION public.update_semantic_tagset_timestamp();