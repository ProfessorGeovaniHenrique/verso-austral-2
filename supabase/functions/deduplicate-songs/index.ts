import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createEdgeLogger } from '../_shared/unified-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SongRelease {
  year: string | null;
  album: string | null;
  source: string;
  is_original?: boolean;
  merged_from_id?: string;
}

interface Song {
  id: string;
  title: string;
  normalized_title: string;
  artist_id: string;
  composer: string | null;
  release_year: string | null;
  lyrics: string | null;
  status: string;
  youtube_url: string | null;
  confidence_score: number | null;
  created_at: string;
  releases: SongRelease[];
  total_releases: number;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('deduplicate-songs', requestId);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { dryRun = true, corpusIds = [] } = await req.json();

    log.info('Starting deduplication', { dryRun, corpusIds });

    // 1. Fetch ALL songs with pagination (Supabase has 1000 row default limit)
    const BATCH_SIZE = 1000; // Supabase max limit per query
    let allSongs: Song[] = [];
    let offset = 0;
    let hasMore = true;

    log.info('Starting batch fetch', { batchSize: BATCH_SIZE });

    while (hasMore) {
      const query = supabase
        .from('songs')
        .select('id, title, normalized_title, artist_id, composer, release_year, lyrics, status, youtube_url, confidence_score, created_at, corpus_id')
        .range(offset, offset + BATCH_SIZE - 1);

      if (corpusIds.length > 0) {
        query.in('corpus_id', corpusIds);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Add default releases/total_releases to match Song interface
        const songsWithDefaults = data.map(song => ({
          ...song,
          releases: [] as SongRelease[],
          total_releases: 1
        }));
        allSongs = [...allSongs, ...songsWithDefaults];
        offset += BATCH_SIZE;
        log.info('Batch fetched', { batchSize: data.length, totalSoFar: allSongs.length, offset });
      }
      
      hasMore = data && data.length === BATCH_SIZE;
    }

    log.info('All songs fetched', { totalSongs: allSongs.length });

    // Group by (normalized_title, artist_id)
    const groups: Record<string, Song[]> = {};
    
    for (const song of allSongs) {
      const key = `${song.normalized_title}|${song.artist_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(song);
    }

    // Filter only groups with duplicates
    const duplicateGroups = Object.entries(groups).filter(([_, songs]) => songs.length > 1);

    log.info('Duplicate groups found', { 
      totalGroups: duplicateGroups.length,
      totalDuplicates: duplicateGroups.reduce((sum, [_, songs]) => sum + (songs.length - 1), 0)
    });

    let consolidated = 0;
    let duplicatesRemoved = 0;
    let releasesPreserved = 0;
    const topConsolidated: any[] = [];

    // Process each duplicate group
    for (const [key, songs] of duplicateGroups) {
      // Calculate completeness score for each song
      const scoredSongs = songs.map(song => ({
        song,
        score: calculateCompletenessScore(song)
      }));

      // Sort by score (highest first), then by created_at (oldest first)
      scoredSongs.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.song.created_at).getTime() - new Date(b.song.created_at).getTime();
      });

      const primarySong = scoredSongs[0].song;
      const duplicates = scoredSongs.slice(1).map(s => s.song);

      // Build releases array
      const releases: SongRelease[] = [];
      const years = new Set<string>();

      for (const song of songs) {
        if (song.release_year && !years.has(song.release_year)) {
          years.add(song.release_year);
          releases.push({
            year: song.release_year,
            album: null, // Could be extracted from raw_data in future
            source: 'import',
            is_original: song.release_year === findOldestYear(songs),
            merged_from_id: song.id !== primarySong.id ? song.id : undefined
          });
        }
      }

      // Find oldest year
      const oldestYear = findOldestYear(songs);

      // Merge metadata: pick longest lyrics, first non-null composer, etc.
      const mergedData: any = {
        composer: songs.find(s => s.composer)?.composer || primarySong.composer,
        lyrics: songs.reduce((longest, s) => 
          (s.lyrics?.length || 0) > (longest?.length || 0) ? s.lyrics : longest, 
          primarySong.lyrics
        ),
        youtube_url: songs.find(s => s.youtube_url)?.youtube_url || primarySong.youtube_url,
        release_year: oldestYear,
        releases: releases,
        total_releases: releases.length,
        status: songs.some(s => s.status === 'enriched') ? 'enriched' : primarySong.status
      };

      if (!dryRun) {
        log.info('Processing group', { 
          title: primarySong.title, 
          primaryId: primarySong.id, 
          duplicateCount: duplicates.length 
        });

        // Update primary song with merged data
        const { error: updateError } = await supabase
          .from('songs')
          .update(mergedData)
          .eq('id', primarySong.id);

        if (updateError) {
          log.error('Failed to update primary song', updateError, { songId: primarySong.id });
          continue;
        }

        log.info('Primary song updated', { songId: primarySong.id });

        // Migrate foreign key references
        for (const duplicate of duplicates) {
          // Update semantic_disambiguation_cache
          const { error: cacheUpdateError } = await supabase
            .from('semantic_disambiguation_cache')
            .update({ song_id: primarySong.id })
            .eq('song_id', duplicate.id);

          if (cacheUpdateError) {
            log.warn('Failed to migrate cache references', { 
              duplicateId: duplicate.id, 
              error: cacheUpdateError.message 
            });
          }
        }

        log.info('Foreign keys migrated', { duplicateCount: duplicates.length });

        // Delete duplicates
        const duplicateIds = duplicates.map(d => d.id);
        const { error: deleteError } = await supabase
          .from('songs')
          .delete()
          .in('id', duplicateIds);

        if (deleteError) {
          log.error('Failed to delete duplicates', deleteError, { duplicateIds });
        } else {
          log.info('Duplicates deleted', { count: duplicateIds.length });
        }
      }

      consolidated++;
      duplicatesRemoved += duplicates.length;
      releasesPreserved += releases.length;

      if (topConsolidated.length < 20) {
        topConsolidated.push({
          title: primarySong.title,
          releasesCount: releases.length,
          yearsSpan: `${Math.min(...Array.from(years).map(y => parseInt(y) || 9999))}-${Math.max(...Array.from(years).map(y => parseInt(y) || 0))}`
        });
      }
    }

    // Note: UNIQUE constraint should be added via SQL migration, not via RPC
    // Migration will handle: ALTER TABLE songs ADD CONSTRAINT songs_unique_title_artist UNIQUE (normalized_title, artist_id);

    const result = {
      dryRun,
      processed: duplicateGroups.length,
      consolidated,
      duplicatesRemoved,
      releasesPreserved,
      topConsolidated
    };

    log.info('Deduplication complete', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    log.fatal('Deduplication failed', error instanceof Error ? error : new Error(String(error)));
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Falha ao executar deduplicação'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculateCompletenessScore(song: Song): number {
  let score = 0;
  
  if (song.composer && song.composer.trim()) score += 50;
  if (song.lyrics) score += 30 + Math.min(song.lyrics.length / 100, 20);
  if (song.status === 'enriched') score += 25;
  if (song.youtube_url) score += 15;
  if (song.confidence_score && song.confidence_score > 80) score += 10;
  
  return score;
}

function findOldestYear(songs: Song[]): string | null {
  const years = songs
    .map(s => s.release_year)
    .filter((y): y is string => y !== null)
    .map(y => parseInt(y))
    .filter(y => !isNaN(y));
  
  return years.length > 0 ? Math.min(...years).toString() : null;
}
