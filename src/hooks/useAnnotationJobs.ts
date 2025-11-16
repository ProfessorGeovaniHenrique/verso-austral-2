import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnnotationJob {
  id: string;
  user_id: string;
  corpus_type: string;
  status: string;
  total_palavras: number | null;
  palavras_processadas: number | null;
  palavras_anotadas: number | null;
  progresso: number | null;
  tempo_inicio: string | null;
  tempo_fim: string | null;
  erro_mensagem: string | null;
  metadata: any;
}

export function useAnnotationJobs() {
  const [jobs, setJobs] = useState<AnnotationJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // ✅ FIX MEMORY LEAK: Refs para rastrear estado
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  const fetchJobs = async () => {
    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('annotation_jobs')
        .select('*')
        .order('tempo_inicio', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      if (isMountedRef.current) {
        setJobs(data || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar jobs';
      if (isMountedRef.current) {
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar jobs',
          description: errorMessage
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchJobs();

    // ✅ Realtime com cleanup
    channelRef.current = supabase
      .channel('annotation_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotation_jobs'
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const stats = {
    totalJobs: jobs.length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    failedJobs: jobs.filter(j => j.status === 'failed').length,
    inProgressJobs: jobs.filter(j => j.status === 'processing').length,
    totalWordsProcessed: jobs.reduce((sum, j) => sum + (j.palavras_processadas || 0), 0)
  };

  return {
    jobs,
    stats,
    isLoading,
    error,
    refetch: fetchJobs
  };
}
