-- SPRINT RAC-1: Cancelar jobs duplicados, mantendo apenas o mais recente por artista
WITH ranked_jobs AS (
  SELECT 
    id,
    artist_id,
    artist_name,
    status,
    tempo_inicio,
    ROW_NUMBER() OVER (PARTITION BY artist_id ORDER BY tempo_inicio DESC) as rn
  FROM semantic_annotation_jobs
  WHERE status IN ('processando', 'pendente', 'pausado')
)
UPDATE semantic_annotation_jobs 
SET 
  status = 'cancelado', 
  tempo_fim = NOW(),
  erro_mensagem = 'Job duplicado cancelado automaticamente (race condition cleanup - Sprint RAC-1)'
WHERE id IN (
  SELECT id FROM ranked_jobs WHERE rn > 1
);