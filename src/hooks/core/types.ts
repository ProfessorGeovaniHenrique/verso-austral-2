/**
 * Tipos centralizados para hooks de jobs assíncronos
 */

export type { JobStatus, BaseJob, AsyncJobConfig, AsyncJobResult } from './useAsyncJob';

// Re-export específicos por domínio
export interface EnrichmentJobData {
  job_type: 'metadata' | 'youtube' | 'lyrics' | 'full';
  scope: 'all' | 'artist' | 'corpus' | 'selection' | 'letter';
  artist_id?: string | null;
  artist_name?: string | null;
  corpus_id?: string | null;
  corpus_type?: string | null;
  song_ids?: string[];
  total_songs: number;
  songs_processed: number;
  songs_succeeded: number;
  songs_failed: number;
  current_song_index: number;
  chunk_size: number;
  chunks_processed: number;
  last_chunk_at?: string | null;
  force_reenrich?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SemanticAnnotationJobData {
  artist_id: string;
  artist_name: string;
  total_songs: number;
  total_words: number;
  processed_words: number;
  cached_words: number;
  new_words: number;
  current_song_index: number;
  current_word_index: number;
  chunk_size: number;
  chunks_processed: number;
  last_chunk_at?: string | null;
}

export interface SemanticRefinementJobData {
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
  sample_refinements: Array<{
    palavra: string;
    oldCode: string;
    newCode: string;
    level: number;
    confianca: number;
    kwic?: string;
  }>;
  current_offset: number;
  last_chunk_at?: string | null;
}

export interface CorpusAnnotationJobData {
  corpus_id: string;
  corpus_name: string;
  total_artists: number;
  processed_artists: number;
  current_artist_id?: string | null;
  current_artist_name?: string | null;
  current_artist_job_id?: string | null;
  total_songs: number;
  processed_songs: number;
  total_words_estimated: number;
  processed_words: number;
}
