-- Adicionar coluna youtube_url na tabela songs
ALTER TABLE songs ADD COLUMN youtube_url TEXT;

-- Adicionar índice para melhorar performance de queries
CREATE INDEX idx_songs_youtube_url ON songs(youtube_url);

-- Adicionar comentário descritivo
COMMENT ON COLUMN songs.youtube_url IS 'URL completa do vídeo no YouTube (https://www.youtube.com/watch?v=VIDEO_ID)';