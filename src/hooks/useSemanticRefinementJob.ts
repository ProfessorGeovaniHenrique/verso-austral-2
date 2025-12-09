import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RefinementSample {
  palavra: string;
  oldCode: string;
  newCode: string;
  level: number;
  confianca: number;
  kwic?: string;
}

export interface SemanticRefinementJob {
  id: string;
  status: 'pendente' | 'processando' | 'pausado' | 'concluido' | 'erro' | 'cancelado';
  domain_filter: 'MG' | 'DS' | null;
  model: 'gemini' | 'gpt5';
  priority_mode: 'impact' | 'alphabetical' | 'random';
  total_words: number;
  processed: number;
  refined: number;
  errors: number;
  n2_refined: number;
  n3_refined: number;
  n4_refined: number;
  sample_refinements: RefinementSample[];
  current_offset: number;
  last_chunk_at: string | null;
  tempo_inicio: string | null;
  tempo_fim: string | null;
  is_cancelling: boolean;
  created_at: string;
}

export function useSemanticRefinementJob() {
  const [activeJob, setActiveJob] = useState<SemanticRefinementJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveJob = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('semantic_refinement_jobs')
        .select('*')
        .in('status', ['pendente', 'processando', 'pausado'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setActiveJob({
          ...data,
          sample_refinements: (data.sample_refinements as unknown as RefinementSample[]) || [],
        } as SemanticRefinementJob);
      } else {
        setActiveJob(null);
      }
    } catch (error) {
      console.error('[useSemanticRefinementJob] Error fetching job:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveJob();
  }, [fetchActiveJob]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!activeJob?.id) return;

    const channel = supabase
      .channel(`refinement-job-${activeJob.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'semantic_refinement_jobs',
          filter: `id=eq.${activeJob.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setActiveJob({
            ...newData,
            sample_refinements: (newData.sample_refinements as unknown as RefinementSample[]) || [],
          } as SemanticRefinementJob);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeJob?.id]);

  // Start new job with priority mode
  const startJob = useCallback(async (
    domain_filter: 'MG' | 'DS' | null,
    model: 'gemini' | 'gpt5' = 'gemini',
    priority_mode: 'impact' | 'alphabetical' | 'random' = 'impact'
  ) => {
    try {
      setIsLoading(true);

      // Count words first
      let countQuery = supabase
        .from('semantic_disambiguation_cache')
        .select('id', { count: 'exact', head: true })
        .is('tagset_n2', null)
        .neq('tagset_codigo', 'NC');

      if (domain_filter === 'MG') {
        countQuery = countQuery.eq('tagset_codigo', 'MG');
      } else if (domain_filter === 'DS') {
        countQuery = countQuery.neq('tagset_codigo', 'MG');
      }

      const { count } = await countQuery;

      if (!count || count === 0) {
        toast.info('Nenhuma palavra N1 para refinar');
        return;
      }

      // Cancel existing jobs
      await supabase
        .from('semantic_refinement_jobs')
        .update({ status: 'cancelado', is_cancelling: true })
        .in('status', ['pendente', 'processando', 'pausado']);

      // Create new job
      const { data: newJob, error } = await supabase
        .from('semantic_refinement_jobs')
        .insert({
          domain_filter,
          model,
          priority_mode,
          total_words: count,
          status: 'processando',
          tempo_inicio: new Date().toISOString(),
          last_chunk_at: new Date().toISOString(),
          n2_refined: 0,
          n3_refined: 0,
          n4_refined: 0,
          sample_refinements: [],
        })
        .select()
        .single();

      if (error) throw error;

      setActiveJob({
        ...newJob,
        sample_refinements: [],
      } as SemanticRefinementJob);
      
      const priorityLabel = priority_mode === 'impact' ? 'por impacto' :
                           priority_mode === 'alphabetical' ? 'alfabético' : 'aleatório';
      toast.success(`Iniciando refinamento de ${count.toLocaleString()} palavras (${priorityLabel})`);

      // Trigger first chunk
      const response = await supabase.functions.invoke('refine-domain-batch', {
        body: { jobId: newJob.id },
      });

      if (response.error) {
        console.error('[useSemanticRefinementJob] Start error:', response.error);
      }

    } catch (error) {
      console.error('[useSemanticRefinementJob] Error starting job:', error);
      toast.error('Erro ao iniciar refinamento');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pause job
  const pauseJob = useCallback(async () => {
    if (!activeJob?.id) return;

    try {
      const { error } = await supabase
        .from('semantic_refinement_jobs')
        .update({ status: 'pausado' })
        .eq('id', activeJob.id);

      if (error) throw error;
      
      setActiveJob(prev => prev ? { ...prev, status: 'pausado' } : null);
      toast.info('Refinamento pausado');
    } catch (error) {
      console.error('[useSemanticRefinementJob] Error pausing:', error);
      toast.error('Erro ao pausar');
    }
  }, [activeJob?.id]);

  // Resume job
  const resumeJob = useCallback(async () => {
    if (!activeJob?.id) return;

    try {
      const { error } = await supabase
        .from('semantic_refinement_jobs')
        .update({ 
          status: 'processando',
          last_chunk_at: new Date().toISOString(),
        })
        .eq('id', activeJob.id);

      if (error) throw error;

      setActiveJob(prev => prev ? { ...prev, status: 'processando' } : null);
      toast.success('Refinamento retomado');

      await supabase.functions.invoke('refine-domain-batch', {
        body: { jobId: activeJob.id },
      });
    } catch (error) {
      console.error('[useSemanticRefinementJob] Error resuming:', error);
      toast.error('Erro ao retomar');
    }
  }, [activeJob?.id]);

  // Cancel job
  const cancelJob = useCallback(async () => {
    if (!activeJob?.id) return;

    try {
      const { error } = await supabase
        .from('semantic_refinement_jobs')
        .update({ 
          status: 'cancelado',
          is_cancelling: true,
          tempo_fim: new Date().toISOString(),
        })
        .eq('id', activeJob.id);

      if (error) throw error;

      setActiveJob(null);
      toast.info('Refinamento cancelado');
    } catch (error) {
      console.error('[useSemanticRefinementJob] Error cancelling:', error);
      toast.error('Erro ao cancelar');
    }
  }, [activeJob?.id]);

  // Calculate progress
  const progress = activeJob 
    ? Math.min(100, Math.round((activeJob.processed / activeJob.total_words) * 100))
    : 0;

  // Calculate depth distribution
  const depthDistribution = activeJob ? {
    n2: activeJob.n2_refined || 0,
    n3: activeJob.n3_refined || 0,
    n4: activeJob.n4_refined || 0,
    n1Only: activeJob.refined - (activeJob.n2_refined || 0),
  } : { n2: 0, n3: 0, n4: 0, n1Only: 0 };

  // Calculate refinement rate
  const refinementRate = activeJob && activeJob.processed > 0
    ? Math.round((activeJob.refined / activeJob.processed) * 100)
    : 0;

  // Calculate ETA
  const calculateEta = useCallback(() => {
    if (!activeJob || activeJob.processed === 0 || activeJob.status !== 'processando') {
      return null;
    }

    const elapsed = activeJob.tempo_inicio 
      ? Date.now() - new Date(activeJob.tempo_inicio).getTime()
      : 0;
    
    const rate = activeJob.processed / (elapsed / 1000);
    const remaining = activeJob.total_words - activeJob.processed;
    const etaSeconds = remaining / rate;

    if (etaSeconds < 60) return 'menos de 1 minuto';
    if (etaSeconds < 3600) return `~${Math.ceil(etaSeconds / 60)} minutos`;
    return `~${Math.ceil(etaSeconds / 3600)} horas`;
  }, [activeJob]);

  return {
    activeJob,
    isLoading,
    progress,
    depthDistribution,
    refinementRate,
    eta: calculateEta(),
    startJob,
    pauseJob,
    resumeJob,
    cancelJob,
    refetch: fetchActiveJob,
  };
}
