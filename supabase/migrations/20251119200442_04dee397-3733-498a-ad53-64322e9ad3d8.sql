-- Criar bucket de storage para corpus se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('corpus', 'corpus', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para o bucket corpus
CREATE POLICY "Admins can manage corpus files"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'corpus' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Public can view corpus files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'corpus');