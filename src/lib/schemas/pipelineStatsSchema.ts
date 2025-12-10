import { z } from 'zod';

// Exported type interfaces (defined first for reuse)
export interface MVStats {
  total_words: number;
  unique_tagsets: number;
  nc_words: number;
  avg_confidence: number;
  gemini_percentage: number;
  rule_based_percentage: number;
  pos_based_percentage: number;
  words_with_insignias: number;
  polysemous_words: number;
  lexicon_entries: number;
  domain_distribution: Array<{ tagset: string; count: number }>;
}

export interface ActiveJob {
  id: string;
  artist_name: string;
  status: string;
  processed_words: number;
  total_words: number;
  tempo_inicio: string;
  tempo_fim: string | null;
  erro_mensagem: string | null;
  last_chunk_at: string | null;
  chunks_processed: number | null;
}

// Default values for MVStats
const defaultMVStats: MVStats = {
  total_words: 0,
  unique_tagsets: 0,
  nc_words: 0,
  avg_confidence: 0,
  gemini_percentage: 0,
  rule_based_percentage: 0,
  pos_based_percentage: 0,
  words_with_insignias: 0,
  polysemous_words: 0,
  lexicon_entries: 0,
  domain_distribution: []
};

/**
 * Schema for domain distribution item
 */
const DomainItemSchema = z.object({
  tagset: z.string(),
  count: z.number()
});

/**
 * Schema for active annotation job
 */
const JobSchema = z.object({
  id: z.string(),
  artist_name: z.string(),
  status: z.string(),
  processed_words: z.number(),
  total_words: z.number(),
  tempo_inicio: z.string(),
  tempo_fim: z.string().nullable(),
  erro_mensagem: z.string().nullable(),
  last_chunk_at: z.string().nullable(),
  chunks_processed: z.number().nullable()
});

/**
 * Parse domain distribution from unknown JSON
 */
function parseDomainDistribution(data: unknown): Array<{ tagset: string; count: number }> {
  if (!Array.isArray(data)) return [];
  
  const result: Array<{ tagset: string; count: number }> = [];
  for (const item of data) {
    const parsed = DomainItemSchema.safeParse(item);
    if (parsed.success) {
      result.push({ tagset: parsed.data.tagset, count: parsed.data.count });
    }
  }
  return result;
}

/**
 * Safely parse MV stats with fallback to defaults
 */
export const parseMVStats = (data: unknown): MVStats => {
  if (!data || typeof data !== 'object') return defaultMVStats;
  
  const raw = data as Record<string, unknown>;
  
  return {
    total_words: typeof raw.total_words === 'number' ? raw.total_words : 0,
    unique_tagsets: typeof raw.unique_tagsets === 'number' ? raw.unique_tagsets : 0,
    nc_words: typeof raw.nc_words === 'number' ? raw.nc_words : 0,
    avg_confidence: typeof raw.avg_confidence === 'number' ? raw.avg_confidence : 0,
    gemini_percentage: typeof raw.gemini_percentage === 'number' ? raw.gemini_percentage : 0,
    rule_based_percentage: typeof raw.rule_based_percentage === 'number' ? raw.rule_based_percentage : 0,
    pos_based_percentage: typeof raw.pos_based_percentage === 'number' ? raw.pos_based_percentage : 0,
    words_with_insignias: typeof raw.words_with_insignias === 'number' ? raw.words_with_insignias : 0,
    polysemous_words: typeof raw.polysemous_words === 'number' ? raw.polysemous_words : 0,
    lexicon_entries: typeof raw.lexicon_entries === 'number' ? raw.lexicon_entries : 0,
    domain_distribution: parseDomainDistribution(raw.domain_distribution)
  };
};

/**
 * Safely parse active jobs array, filtering out invalid entries
 */
export const parseActiveJobs = (data: unknown): ActiveJob[] => {
  if (!Array.isArray(data)) return [];
  
  const result: ActiveJob[] = [];
  for (const job of data) {
    const parsed = JobSchema.safeParse(job);
    if (parsed.success) {
      result.push({
        id: parsed.data.id,
        artist_name: parsed.data.artist_name,
        status: parsed.data.status,
        processed_words: parsed.data.processed_words,
        total_words: parsed.data.total_words,
        tempo_inicio: parsed.data.tempo_inicio,
        tempo_fim: parsed.data.tempo_fim,
        erro_mensagem: parsed.data.erro_mensagem,
        last_chunk_at: parsed.data.last_chunk_at,
        chunks_processed: parsed.data.chunks_processed
      });
    }
  }
  return result;
};
