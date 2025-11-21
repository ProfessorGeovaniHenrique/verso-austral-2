-- Criar novo bucket para o sistema de música
INSERT INTO storage.buckets (id, name, public)
VALUES ('music_corpus', 'music_corpus', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Public Access to music_corpus" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to music_corpus" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files in music_corpus" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in music_corpus" ON storage.objects;

-- Criar políticas RLS para o novo bucket music_corpus
CREATE POLICY "Public Access to music_corpus"
ON storage.objects FOR SELECT
USING (bucket_id = 'music_corpus');

CREATE POLICY "Authenticated users can upload to music_corpus"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'music_corpus' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own files in music_corpus"
ON storage.objects FOR UPDATE
USING (bucket_id = 'music_corpus' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own files in music_corpus"
ON storage.objects FOR DELETE
USING (bucket_id = 'music_corpus' AND auth.role() = 'authenticated');