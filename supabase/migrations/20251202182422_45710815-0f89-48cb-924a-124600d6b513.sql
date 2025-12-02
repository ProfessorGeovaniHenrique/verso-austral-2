-- Adicionar política de DELETE para admins na tabela invite_keys
CREATE POLICY "Admins can delete invite keys"
ON public.invite_keys
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));