import { supabase } from '@/integrations/supabase/client';
import pLimit from 'p-limit';

export interface ParsedMusic {
  titulo: string;
  artista: string;
  album?: string;
  ano?: string;
  compositor?: string;
  genero?: string;
}

export interface EnrichmentResult {
  songId: string;
  success: boolean;
  enrichedData?: {
    composer?: string;
    releaseYear?: string;
    album?: string;
    genre?: string;
    youtubeVideoId?: string;
  };
  confidenceScore: number;
  sources: string[];
  error?: string;
}

export interface ExtractionResult {
  artistsCreated: number;
  songsCreated: number;
  duplicatesSkipped: number;
  artistIds: Record<string, string>;
  songIds: string[];
}

export interface ProcessingResult {
  songsProcessed: number;
  errors: Array<{ songId: string; error: string }>;
}

export const ingestionService = {
  /**
   * Extract music titles from parsed data and create/update database records
   */
  async extractTitles(
    songs: ParsedMusic[],
    uploadId?: string
  ): Promise<ExtractionResult> {
    const { data, error } = await supabase.functions.invoke('extract-music-titles', {
      body: { songs, uploadId },
    });

    if (error) {
      console.error('Error extracting music titles:', error);
      throw new Error(error.message || 'Failed to extract music titles');
    }

    return data as ExtractionResult;
  },

  /**
   * Process and normalize music data
   */
  async processData(songIds: string[]): Promise<ProcessingResult> {
    const { data, error } = await supabase.functions.invoke('process-music-data', {
      body: { songIds },
    });

    if (error) {
      console.error('Error processing music data:', error);
      throw new Error(error.message || 'Failed to process music data');
    }

    return data as ProcessingResult;
  },

  /**
   * Enrich a single song with metadata from external APIs
   */
  async enrichSong(songId: string): Promise<EnrichmentResult> {
    const { data, error } = await supabase.functions.invoke('enrich-music-data', {
      body: { songId },
    });

    if (error) {
      console.error('Error enriching song:', error);
      throw new Error(error.message || 'Failed to enrich song');
    }

    return data as EnrichmentResult;
  },

  /**
   * Enrich multiple songs in batch with concurrency control
   */
  async batchEnrich(
    songIds: string[],
    options: {
      batchSize?: number;
      onProgress?: (current: number, total: number) => void;
      onSongComplete?: (result: EnrichmentResult) => void;
      onError?: (songId: string, error: Error) => void;
    } = {}
  ): Promise<EnrichmentResult[]> {
    const {
      batchSize = 3, // Conservative to avoid rate limits
      onProgress,
      onSongComplete,
      onError,
    } = options;

    const limit = pLimit(batchSize);
    const results: EnrichmentResult[] = [];
    let completed = 0;

    const promises = songIds.map((songId) =>
      limit(async () => {
        try {
          // Add delay between requests to respect rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const result = await this.enrichSong(songId);
          results.push(result);
          completed++;

          if (onProgress) {
            onProgress(completed, songIds.length);
          }

          if (onSongComplete) {
            onSongComplete(result);
          }

          return result;
        } catch (error) {
          completed++;
          
          const errorResult: EnrichmentResult = {
            songId,
            success: false,
            confidenceScore: 0,
            sources: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          };

          results.push(errorResult);

          if (onError) {
            onError(songId, error instanceof Error ? error : new Error('Unknown error'));
          }

          if (onProgress) {
            onProgress(completed, songIds.length);
          }

          return errorResult;
        }
      })
    );

    await Promise.all(promises);

    return results;
  },

  /**
   * Get songs by status
   */
  async getSongsByStatus(status: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('music_songs' as any)
      .select(`
        id,
        title,
        normalized_title,
        composer,
        release_year,
        status,
        confidence_score,
        enrichment_source,
        created_at,
        artists (
          id,
          name
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching songs:', error);
      throw new Error(error.message || 'Failed to fetch songs');
    }

    return data || [];
  },

  /**
   * Get enrichment statistics
   */
  async getEnrichmentStats(): Promise<{
    total: number;
    pending: number;
    processed: number;
    enriched: number;
    avgConfidence: number;
  }> {
    const { data, error } = await supabase
      .from('music_songs' as any)
      .select('status, confidence_score');

    if (error) {
      console.error('Error fetching stats:', error);
      throw new Error(error.message || 'Failed to fetch statistics');
    }

    const stats = {
      total: data?.length || 0,
      pending: (data as any[])?.filter((s) => s.status === 'pending').length || 0,
      processed: (data as any[])?.filter((s) => s.status === 'processed').length || 0,
      enriched: (data as any[])?.filter((s) => s.status === 'enriched').length || 0,
      avgConfidence: 0,
    };

    const enrichedSongs = (data as any[])?.filter((s) => s.confidence_score !== null) || [];
    if (enrichedSongs.length > 0) {
      const totalConfidence = enrichedSongs.reduce(
        (sum, s) => sum + (s.confidence_score || 0),
        0
      );
      stats.avgConfidence = Math.round(totalConfidence / enrichedSongs.length);
    }

    return stats;
  },
};
