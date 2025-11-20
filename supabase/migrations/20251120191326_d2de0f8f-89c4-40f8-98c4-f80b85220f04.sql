-- ✅ FASE 2: Adicionar coluna marcadores_uso à tabela dialectal_lexicon
-- Esta coluna armazenará marcadores de uso estruturados como [r/us], [m/us], [n/d]

ALTER TABLE dialectal_lexicon 
ADD COLUMN IF NOT EXISTS marcadores_uso TEXT[] DEFAULT '{}';

-- Criar índice GIN para busca eficiente em arrays
CREATE INDEX IF NOT EXISTS idx_dialectal_marcadores 
ON dialectal_lexicon USING GIN (marcadores_uso);

-- Comentário para documentação
COMMENT ON COLUMN dialectal_lexicon.marcadores_uso IS 'Marcadores de uso extraídos: [r/us] = raro, [m/us] = muito usado, [n/d] = não determinado';
