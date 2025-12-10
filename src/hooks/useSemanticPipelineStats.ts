import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseMVStats, parseActiveJobs, type ActiveJob } from '@/lib/schemas/pipelineStatsSchema';

export interface PipelineStats {
  cacheStats: {
    totalWords: number;
    uniqueTagsets: number;
    ncWords: number;
    avgConfidence: number;
    geminiPercentage: number;
    ruleBasedPercentage: number;
    posBasedPercentage: number;
    wordsWithInsignias: number;
    polysemousWords: number;
  };
  semanticLexicon: {
    totalEntries: number;
    status: 'empty' | 'partial' | 'complete';
  };
  domainDistribution: Array<{
    tagset: string;
    count: number;
    percentage: number;
  }>;
  activeJobs: Array<ActiveJob & { progress: number }>;
}

export function useSemanticPipelineStats() {
  return useQuery({
    queryKey: ['semantic-pipeline-stats'],
    queryFn: async (): Promise<PipelineStats> => {
      // 1. Fetch aggregated stats from materialized view (single row, <100ms)
      const { data: mvData, error: mvError } = await supabase
        .from('semantic_pipeline_stats_mv')
        .select('*')
        .maybeSingle();

      if (mvError) throw mvError;

      // Parse and validate with Zod schema (graceful fallback on validation error)
      const stats = parseMVStats(mvData);

      // 2. Calculate domain distribution percentages with division guard
      const totalEntries = stats.lexicon_entries;
      const domainDistribution = stats.domain_distribution.map(d => ({
        tagset: d.tagset,
        count: d.count,
        percentage: totalEntries > 0 ? (d.count / totalEntries) * 100 : 0
      }));

      // 3. Fetch active jobs (small query, max 10 rows)
      const { data: jobsData, error: jobsError } = await supabase
        .from('semantic_annotation_jobs')
        .select('*')
        .in('status', ['processando', 'pausado', 'pendente'])
        .order('tempo_inicio', { ascending: false })
        .limit(10);

      if (jobsError) throw jobsError;

      // Validate jobs with Zod schema
      const validatedJobs = parseActiveJobs(jobsData);
      
      const activeJobs = validatedJobs.map(job => ({
        ...job,
        progress: job.total_words > 0 ? (job.processed_words / job.total_words) * 100 : 0
      }));

      return {
        cacheStats: {
          totalWords: stats.total_words,
          uniqueTagsets: stats.unique_tagsets,
          ncWords: stats.nc_words,
          avgConfidence: Number(stats.avg_confidence) || 0,
          geminiPercentage: Number(stats.gemini_percentage) || 0,
          ruleBasedPercentage: Number(stats.rule_based_percentage) || 0,
          posBasedPercentage: Number(stats.pos_based_percentage) || 0,
          wordsWithInsignias: stats.words_with_insignias,
          polysemousWords: stats.polysemous_words
        },
        semanticLexicon: {
          totalEntries: stats.lexicon_entries,
          status: stats.lexicon_entries === 0 
            ? 'empty' 
            : stats.lexicon_entries < 1000 
              ? 'partial' 
              : 'complete'
        },
        domainDistribution,
        activeJobs
      };
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

// Hook para forçar refresh da MV
export function useRefreshPipelineStats() {
  const refreshMV = async () => {
    const { error } = await supabase.rpc('refresh_semantic_pipeline_stats_mv');
    if (error) throw error;
  };

  return { refreshMV };
}
