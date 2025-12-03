-- Mover músicas sem corpus para Corpus Nordestino
UPDATE songs 
SET corpus_id = '1e7256cd-5adf-4196-85f9-4af7031f098a' 
WHERE corpus_id IS NULL;

-- Adicionar campos de atribuição de fonte (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'songs' AND column_name = 'lyrics_source') THEN
    ALTER TABLE songs ADD COLUMN lyrics_source text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'songs' AND column_name = 'lyrics_url') THEN
    ALTER TABLE songs ADD COLUMN lyrics_url text;
  END IF;
END $$;

-- Constraint para fontes válidas (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'songs_lyrics_source_check') THEN
    ALTER TABLE songs ADD CONSTRAINT songs_lyrics_source_check 
      CHECK (lyrics_source IS NULL OR lyrics_source IN ('letras.mus.br', 'genius', 'manual', 'original', 'web_search'));
  END IF;
END $$;