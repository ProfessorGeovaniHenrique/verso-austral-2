import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AnnotationJob } from './useAnnotationJobs';

export function useActiveJobs() {
  const [activeJobs, setActiveJobs] = useState<AnnotationJob[]>([]);

  useEffect(() => {
    // Buscar jobs ativos iniciais
    const fetchActiveJobs = async () => {
      const { data } = await supabase
        .from('annotation_jobs')
        .select('*')
        .in('status', ['processing', 'pending'])
        .order('tempo_inicio', { ascending: false });

      if (data) {
        setActiveJobs(data);
      }
    };

    fetchActiveJobs();

    // Configurar Realtime para atualizações
    const channel = supabase
      .channel('active-jobs-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotation_jobs'
        },
        () => {
          fetchActiveJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { activeJobs };
}
