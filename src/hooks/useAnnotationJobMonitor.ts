import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AnnotationJob } from './useAnnotationJobs';

export function useAnnotationJobMonitor(jobId: string | null) {
  const [job, setJob] = useState<AnnotationJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    setIsLoading(true);

    // Buscar job inicial
    const fetchJob = async () => {
      const { data } = await supabase
        .from('annotation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (data) {
        setJob(data);
        setIsLoading(false);
      }
    };

    fetchJob();

    // Configurar Realtime para atualizações
    const channel = supabase
      .channel(`annotation-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'annotation_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const updatedJob = payload.new as AnnotationJob;
          setJob(updatedJob);

          if (updatedJob.status === 'completed') {
            toast.success('Anotação concluída! Visualize os resultados abaixo.', {
              duration: 5000
            });
          } else if (updatedJob.status === 'failed') {
            toast.error(`Erro na anotação: ${updatedJob.erro_mensagem}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  return { job, isLoading };
}
