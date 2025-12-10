import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  activeJobs: Array<{
    id: string;
    artist_name: string;
    status: string;
    processed_words: number;
    total_words: number;
    progress: number;
    tempo_inicio: string;
    tempo_fim: string | null;
    erro_mensagem: string | null;
    last_chunk_at: string | null;
    chunks_processed: number | null;
  }>;
}

interface MVStats {
  total_words: number;
  unique_tagsets: number;
  nc_words: number;
  avg_confidence: number;
  total_entries: number;
  gemini_percentage: number;
  rule_based_percentage: number;
  pos_based_percentage: number;
  words_with_insignias: number;
  polysemous_words: number;
  lexicon_entries: number;
  domain_distribution: Array<{ tagset: string; count: number }> | null;
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

      // Parse domain_distribution from JSONB (comes as Json type from Supabase)
      const rawDomainDist = mvData?.domain_distribution;
      const parsedDomainDist: Array<{ tagset: string; count: number }> = 
        Array.isArray(rawDomainDist) 
          ? (rawDomainDist as Array<{ tagset: string; count: number }>)
          : [];

      // Default values if MV is empty
      const stats: MVStats = {
        total_words: mvData?.total_words ?? 0,
        unique_tagsets: mvData?.unique_tagsets ?? 0,
        nc_words: mvData?.nc_words ?? 0,
        avg_confidence: mvData?.avg_confidence ?? 0,
        total_entries: mvData?.total_entries ?? 0,
        gemini_percentage: mvData?.gemini_percentage ?? 0,
        rule_based_percentage: mvData?.rule_based_percentage ?? 0,
        pos_based_percentage: mvData?.pos_based_percentage ?? 0,
        words_with_insignias: mvData?.words_with_insignias ?? 0,
        polysemous_words: mvData?.polysemous_words ?? 0,
        lexicon_entries: mvData?.lexicon_entries ?? 0,
        domain_distribution: parsedDomainDist
      };

      // 2. Parse domain distribution from JSONB
      const domainDistribution = (stats.domain_distribution || []).map(d => ({
        tagset: d.tagset,
        count: d.count,
        percentage: stats.total_entries > 0 
          ? (d.count / stats.total_entries) * 100 
          : 0
      }));

      // 3. Fetch active jobs (small query, max 10 rows)
      const { data: jobsData, error: jobsError } = await supabase
        .from('semantic_annotation_jobs')
        .select('*')
        .in('status', ['processando', 'pausado', 'pendente'])
        .order('tempo_inicio', { ascending: false })
        .limit(10);

      if (jobsError) throw jobsError;

      const activeJobs = (jobsData || []).map(job => ({
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
