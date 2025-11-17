-- 1. Adicionar coluna offset_inicial para retomada
ALTER TABLE dictionary_import_jobs 
ADD COLUMN IF NOT EXISTS offset_inicial INTEGER DEFAULT 0;

-- 2. Remover duplicatas existentes em dialectal_lexicon
DELETE FROM dialectal_lexicon a
USING dialectal_lexicon b
WHERE a.id > b.id 
AND a.verbete_normalizado = b.verbete_normalizado
AND a.origem_primaria = b.origem_primaria;

-- 3. Criar índice único para prevenir duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS idx_dialectal_unique 
ON dialectal_lexicon(verbete_normalizado, origem_primaria);

-- 4. Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_dialectal_verbete_norm 
ON dialectal_lexicon(verbete_normalizado);

-- 5. Comentários documentando a estrutura
COMMENT ON COLUMN dictionary_import_jobs.offset_inicial IS 'Posição inicial do processamento para retomada de jobs incompletos';
COMMENT ON INDEX idx_dialectal_unique IS 'Previne inserção de verbetes duplicados no mesmo volume';