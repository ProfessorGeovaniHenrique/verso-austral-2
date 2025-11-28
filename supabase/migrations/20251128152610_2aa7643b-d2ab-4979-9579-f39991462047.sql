-- =====================================================
-- MIGRATION: Deduplicação Eficiente de Músicas
-- Objetivo: Remover 5.774 duplicatas mantendo melhor versão
-- =====================================================

-- FASE 1: BACKUP E PREPARAÇÃO
-- =====================================================

-- Criar tabela de backup completo
CREATE TABLE IF NOT EXISTS songs_backup AS 
SELECT * FROM songs;

-- Criar tabela de log de deduplicação
CREATE TABLE IF NOT EXISTS deduplication_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at timestamptz DEFAULT now(),
  songs_before integer,
  songs_after integer,
  duplicates_removed integer,
  primary_songs_kept integer,
  details jsonb
);

-- FASE 2: IDENTIFICAR E REMOVER DUPLICATAS
-- =====================================================

-- CTE para identificar a melhor versão de cada grupo duplicado
WITH duplicate_groups AS (
  SELECT 
    id,
    normalized_title,
    artist_id,
    -- Selecionar a melhor versão baseado em:
    -- 1. Presença de compositor (prioridade)
    -- 2. Tamanho das letras (mais completo)
    -- 3. Data de criação (mais antigo = original)
    ROW_NUMBER() OVER (
      PARTITION BY normalized_title, artist_id 
      ORDER BY 
        CASE WHEN composer IS NOT NULL AND composer != '' THEN 1 ELSE 0 END DESC,
        COALESCE(LENGTH(lyrics), 0) DESC,
        CASE WHEN status = 'enriched' THEN 1 ELSE 0 END DESC,
        created_at ASC
    ) as rank,
    COUNT(*) OVER (PARTITION BY normalized_title, artist_id) as duplicate_count
  FROM songs
  WHERE normalized_title IS NOT NULL
),
primary_songs AS (
  SELECT id, normalized_title, artist_id, duplicate_count
  FROM duplicate_groups
  WHERE rank = 1 AND duplicate_count > 1
),
duplicates_to_delete AS (
  SELECT dg.id, dg.normalized_title, dg.artist_id
  FROM duplicate_groups dg
  WHERE dg.rank > 1
),
-- Registrar estatísticas antes da deleção
pre_deletion_stats AS (
  SELECT 
    COUNT(*) as total_before,
    COUNT(DISTINCT (normalized_title, artist_id)) as unique_songs
  FROM songs
)
-- Inserir log antes de deletar
INSERT INTO deduplication_log (songs_before, songs_after, duplicates_removed, primary_songs_kept, details)
SELECT 
  (SELECT total_before FROM pre_deletion_stats),
  (SELECT unique_songs FROM pre_deletion_stats),
  (SELECT COUNT(*) FROM duplicates_to_delete),
  (SELECT COUNT(*) FROM primary_songs),
  jsonb_build_object(
    'method', 'sql_migration',
    'selection_criteria', 'composer + lyrics_length + status + created_at',
    'duplicate_groups', (SELECT COUNT(*) FROM primary_songs)
  )
RETURNING id;

-- FASE 3: MIGRAR FOREIGN KEYS
-- =====================================================

-- Atualizar semantic_disambiguation_cache para apontar para músicas primárias
WITH duplicate_groups AS (
  SELECT 
    id,
    normalized_title,
    artist_id,
    ROW_NUMBER() OVER (
      PARTITION BY normalized_title, artist_id 
      ORDER BY 
        CASE WHEN composer IS NOT NULL AND composer != '' THEN 1 ELSE 0 END DESC,
        COALESCE(LENGTH(lyrics), 0) DESC,
        CASE WHEN status = 'enriched' THEN 1 ELSE 0 END DESC,
        created_at ASC
    ) as rank
  FROM songs
  WHERE normalized_title IS NOT NULL
),
primary_mapping AS (
  SELECT 
    dg_dup.id as duplicate_id,
    dg_primary.id as primary_id
  FROM duplicate_groups dg_dup
  JOIN duplicate_groups dg_primary 
    ON dg_dup.normalized_title = dg_primary.normalized_title 
    AND dg_dup.artist_id = dg_primary.artist_id
    AND dg_primary.rank = 1
  WHERE dg_dup.rank > 1
)
UPDATE semantic_disambiguation_cache sdc
SET song_id = pm.primary_id
FROM primary_mapping pm
WHERE sdc.song_id = pm.duplicate_id;

-- FASE 4: DELETAR DUPLICATAS
-- =====================================================

WITH duplicate_groups AS (
  SELECT 
    id,
    normalized_title,
    artist_id,
    ROW_NUMBER() OVER (
      PARTITION BY normalized_title, artist_id 
      ORDER BY 
        CASE WHEN composer IS NOT NULL AND composer != '' THEN 1 ELSE 0 END DESC,
        COALESCE(LENGTH(lyrics), 0) DESC,
        CASE WHEN status = 'enriched' THEN 1 ELSE 0 END DESC,
        created_at ASC
    ) as rank
  FROM songs
  WHERE normalized_title IS NOT NULL
),
duplicates_to_delete AS (
  SELECT id
  FROM duplicate_groups
  WHERE rank > 1
)
DELETE FROM songs 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- FASE 5: ADICIONAR UNIQUE CONSTRAINT
-- =====================================================

-- Prevenir duplicatas futuras
ALTER TABLE songs 
ADD CONSTRAINT songs_unique_normalized_title_artist 
UNIQUE (normalized_title, artist_id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_songs_normalized_title_artist 
ON songs(normalized_title, artist_id);

-- FASE 6: ATUALIZAR LOG COM RESULTADO FINAL
-- =====================================================

UPDATE deduplication_log
SET 
  songs_after = (SELECT COUNT(*) FROM songs),
  details = details || jsonb_build_object(
    'constraint_added', true,
    'backup_table', 'songs_backup',
    'completed_at', now()
  )
WHERE id = (SELECT id FROM deduplication_log ORDER BY executed_at DESC LIMIT 1);

-- Comentário final
COMMENT ON CONSTRAINT songs_unique_normalized_title_artist ON songs IS 
'Previne duplicatas futuras: apenas uma música por (título normalizado, artista)';

COMMENT ON TABLE deduplication_log IS 
'Log de execuções de deduplicação para auditoria e monitoramento';