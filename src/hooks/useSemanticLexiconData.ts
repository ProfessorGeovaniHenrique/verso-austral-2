import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';

export interface SemanticLexiconFilters {
  search: string;
  domainN1: string | null;
  fonte: string | null;
  confidenceLevel: 'all' | 'low' | 'medium' | 'high';
  flags: {
    polysemous: boolean;
    mwe: boolean;
    spellingDeviation: boolean;
    withInsignias: boolean;
    needsReview: boolean;
    mgOnlyN1: boolean; // Filter for MG words classified only at N1
    dsOnlyN1: boolean; // NEW: Filter for ANY domain classified only at N1
  };
}

export interface SemanticLexiconEntry {
  id: string;
  palavra: string;
  tagset_codigo: string;
  tagset_n1: string | null;
  tagset_n2: string | null;
  confianca: number | null;
  fonte: string | null;
  lema: string | null;
  pos: string | null;
  is_polysemous: boolean | null;
  is_mwe: boolean | null;
  mwe_text: string | null;
  is_spelling_deviation: boolean | null;
  forma_padrao: string | null;
  insignias_culturais: string[] | null;
  song_id: string | null;
  contexto_hash: string;
  cached_at: string | null;
}

export interface LexiconStats {
  total: number;
  lowConfidence: number;
  polysemous: number;
  mwe: number;
  spellingDeviations: number;
  withInsignias: number;
  needsReview: number;
  mgOnlyN1: number; // Count of MG words at N1 only
  dsOnlyN1: number; // NEW: Count of ANY domain at N1 only
  bySource: Record<string, number>;
  byDomain: Record<string, number>;
}

const DEFAULT_FILTERS: SemanticLexiconFilters = {
  search: '',
  domainN1: null,
  fonte: null,
  confidenceLevel: 'all',
  flags: {
    polysemous: false,
    mwe: false,
    spellingDeviation: false,
    withInsignias: false,
    needsReview: false,
    mgOnlyN1: false,
    dsOnlyN1: false,
  },
};

export function useSemanticLexiconData(pageSize = 50) {
  const [filters, setFilters] = useState<SemanticLexiconFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);

  // Fetch stats for filter chips
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['semantic-lexicon-stats'],
    queryFn: async (): Promise<LexiconStats> => {
      const { data, error } = await supabase
        .from('semantic_disambiguation_cache')
        .select('tagset_codigo, tagset_n1, tagset_n2, confianca, fonte, is_polysemous, is_mwe, is_spelling_deviation, insignias_culturais')
        .neq('tagset_codigo', 'NC');

      if (error) throw error;

      const entries = data || [];
      const bySource: Record<string, number> = {};
      const byDomain: Record<string, number> = {};
      let lowConfidence = 0;
      let polysemous = 0;
      let mwe = 0;
      let spellingDeviations = 0;
      let withInsignias = 0;
      let needsReview = 0;
      let mgOnlyN1 = 0;
      let dsOnlyN1 = 0;

      entries.forEach(entry => {
        // By source
        const source = entry.fonte || 'unknown';
        bySource[source] = (bySource[source] || 0) + 1;

        // By domain N1
        const domain = entry.tagset_n1 || entry.tagset_codigo?.split('.')[0] || 'unknown';
        byDomain[domain] = (byDomain[domain] || 0) + 1;

        // Counts
        if (entry.confianca !== null && entry.confianca < 0.70) lowConfidence++;
        if (entry.is_polysemous) polysemous++;
        if (entry.is_mwe) mwe++;
        if (entry.is_spelling_deviation) spellingDeviations++;
        if (entry.insignias_culturais && entry.insignias_culturais.length > 0) withInsignias++;
        
        // Needs review: low confidence + automatic source
        if (entry.confianca !== null && entry.confianca < 0.80 && 
            entry.fonte !== 'manual' && entry.fonte !== 'human_validated') {
          needsReview++;
        }

        // MG only at N1 level (no N2)
        if (entry.tagset_codigo === 'MG' && 
            (entry.fonte === 'rule_based' || !entry.tagset_n2)) {
          mgOnlyN1++;
        }

        // ANY domain only at N1 level (tagset_codigo has no dot, meaning it's just N1)
        const isN1Only = entry.tagset_codigo && 
          !entry.tagset_codigo.includes('.') && 
          entry.tagset_codigo !== 'NC';
        if (isN1Only) {
          dsOnlyN1++;
        }
      });

      return {
        total: entries.length,
        lowConfidence,
        polysemous,
        mwe,
        spellingDeviations,
        withInsignias,
        needsReview,
        mgOnlyN1,
        dsOnlyN1,
        bySource,
        byDomain,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch paginated data with filters
  const { data: entries, isLoading: entriesLoading, refetch } = useQuery({
    queryKey: ['semantic-lexicon-entries', filters, page, pageSize],
    queryFn: async (): Promise<{ data: SemanticLexiconEntry[]; totalCount: number }> => {
      let query = supabase
        .from('semantic_disambiguation_cache')
        .select('*', { count: 'exact' })
        .neq('tagset_codigo', 'NC')
        .order('cached_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.ilike('palavra', `%${filters.search}%`);
      }

      if (filters.domainN1) {
        query = query.or(`tagset_n1.eq.${filters.domainN1},tagset_codigo.like.${filters.domainN1}%`);
      }

      if (filters.fonte) {
        query = query.eq('fonte', filters.fonte);
      }

      if (filters.confidenceLevel === 'low') {
        query = query.lt('confianca', 0.70);
      } else if (filters.confidenceLevel === 'medium') {
        query = query.gte('confianca', 0.70).lt('confianca', 0.90);
      } else if (filters.confidenceLevel === 'high') {
        query = query.gte('confianca', 0.90);
      }

      if (filters.flags.polysemous) {
        query = query.eq('is_polysemous', true);
      }

      if (filters.flags.mwe) {
        query = query.eq('is_mwe', true);
      }

      if (filters.flags.spellingDeviation) {
        query = query.eq('is_spelling_deviation', true);
      }

      if (filters.flags.withInsignias) {
        query = query.not('insignias_culturais', 'is', null);
      }

      if (filters.flags.needsReview) {
        query = query
          .lt('confianca', 0.80)
          .not('fonte', 'in', '("manual","human_validated")');
      }

      // NEW: Filter for MG words classified only at N1
      if (filters.flags.mgOnlyN1) {
        query = query
          .eq('tagset_codigo', 'MG')
          .or('fonte.eq.rule_based,tagset_n2.is.null');
      }

      // NEW: Filter for ANY domain classified only at N1 (no dots in tagset_codigo)
      if (filters.flags.dsOnlyN1) {
        query = query
          .not('tagset_codigo', 'like', '%.%')
          .neq('tagset_codigo', 'NC');
      }

      // Pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: (data || []) as SemanticLexiconEntry[],
        totalCount: count || 0,
      };
    },
    enabled: !!stats, // Wait for stats to load first
  });

  const updateFilter = <K extends keyof SemanticLexiconFilters>(
    key: K,
    value: SemanticLexiconFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page on filter change
  };

  const toggleFlag = (flag: keyof SemanticLexiconFilters['flags']) => {
    setFilters(prev => ({
      ...prev,
      flags: { ...prev.flags, [flag]: !prev.flags[flag] },
    }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  };

  const totalPages = useMemo(() => {
    if (!entries?.totalCount) return 0;
    return Math.ceil(entries.totalCount / pageSize);
  }, [entries?.totalCount, pageSize]);

  return {
    entries: entries?.data || [],
    totalCount: entries?.totalCount || 0,
    stats: stats || null,
    filters,
    page,
    totalPages,
    isLoading: statsLoading || entriesLoading,
    updateFilter,
    toggleFlag,
    resetFilters,
    setPage,
    refetch,
  };
}
