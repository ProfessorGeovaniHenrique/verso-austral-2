-- Add lyrics source attribution columns
ALTER TABLE songs ADD COLUMN IF NOT EXISTS lyrics_source text;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS lyrics_url text;

-- Add constraint for valid sources
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'songs_lyrics_source_check'
  ) THEN
    ALTER TABLE songs ADD CONSTRAINT songs_lyrics_source_check 
      CHECK (lyrics_source IS NULL OR lyrics_source IN ('letras.mus.br', 'genius', 'manual', 'original', 'web_search'));
  END IF;
END $$;

-- Move 30,145 orphan songs to Corpus Nordestino
UPDATE songs 
SET corpus_id = '1e7256cd-5adf-4196-85f9-4af7031f098a' 
WHERE corpus_id IS NULL;

-- Create index for lyrics source queries
CREATE INDEX IF NOT EXISTS idx_songs_lyrics_source ON songs(lyrics_source) WHERE lyrics_source IS NOT NULL;