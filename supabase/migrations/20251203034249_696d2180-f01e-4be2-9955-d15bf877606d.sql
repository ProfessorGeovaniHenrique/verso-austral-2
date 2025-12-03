-- Migrar artistas sem classificação para Corpus Nordestino
-- Artistas que têm músicas no Corpus Nordestino mas corpus_id = NULL
UPDATE artists a
SET corpus_id = '1e7256cd-5adf-4196-85f9-4af7031f098a',
    updated_at = now()
WHERE a.corpus_id IS NULL
  AND EXISTS (
    SELECT 1 FROM songs s 
    WHERE s.artist_id = a.id 
      AND s.corpus_id = '1e7256cd-5adf-4196-85f9-4af7031f098a'
  );