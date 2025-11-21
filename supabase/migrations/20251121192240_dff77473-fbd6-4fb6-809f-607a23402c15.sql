-- Sprint 1: Limpar dados incorretos onde composer = artist name
-- Identificar e corrigir casos onde o compositor foi preenchido incorretamente com o nome do artista

UPDATE songs
SET 
  composer = NULL,
  status = 'pending',
  confidence_score = 0,
  updated_at = NOW()
WHERE composer IS NOT NULL 
  AND composer IN (
    SELECT a.name 
    FROM artists a 
    WHERE a.id = songs.artist_id
  );

-- Adicionar comment explicativo
COMMENT ON COLUMN songs.composer IS 'Nome do compositor da música (não deve ser o mesmo que o artista intérprete)';