-- Add releases tracking columns to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS releases JSONB DEFAULT '[]'::jsonb;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS total_releases INTEGER DEFAULT 1;

-- Create index for releases queries
CREATE INDEX IF NOT EXISTS idx_songs_releases ON songs USING GIN (releases);

-- Add comments for documentation
COMMENT ON COLUMN songs.releases IS 'Array de lançamentos: [{year, album, source, is_original, merged_from_id}]';
COMMENT ON COLUMN songs.total_releases IS 'Contagem total de releases/álbuns diferentes desta música';