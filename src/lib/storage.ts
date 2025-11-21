import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export async function uploadFile(
  file: File,
  path: string,
  bucket: string = 'corpus'
): Promise<UploadResult> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const publicUrl = getPublicUrl(data.path, bucket);
  return { path: data.path, publicUrl };
}

export function getPublicUrl(path: string, bucket: string = 'corpus'): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function deleteFile(path: string, bucket: string = 'corpus'): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
}

export async function listFiles(path: string = '', bucket: string = 'corpus') {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path);

  if (error) throw error;
  return data;
}
