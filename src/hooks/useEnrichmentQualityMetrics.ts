import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('useEnrichmentQualityMetrics');

export interface EnrichmentQualityMetrics {
  // Overview
  totalSongs: number;
  enrichedCount: number;
  pendingCount: number;
  errorCount: number;
  successRate: number;
  avgConfidence: number;
  
  // Field Coverage
  fieldCoverage: {
    composer: { count: number; percentage: number };
    releaseYear: { count: number; percentage: number };
    youtubeUrl: { count: number; percentage: number };
    lyrics: { count: number; percentage: number };
    enrichmentSource: { count: number; percentage: number };
  };
  
  // Layer Performance
  layerStats: Array<{
    layer: string;
    count: number;
    avgConfidence: number;
    withComposer: number;
    withYear: number;
    withYoutube: number;
  }>;
  
  // Confidence Distribution
  confidenceDistribution: Array<{ range: string; count: number }>;
  
  // Source Distribution
  sourceDistribution: Array<{ 
    source: string; 
    count: number; 
    avgConfidence: number;
    percentage: number;
  }>;
  
  // History (last 30 days)
  enrichmentHistory: Array<{ 
    date: string; 
    success: number; 
    failure: number;
    total: number;
  }>;
  
  // Recent Enrichments
  recentEnrichments: Array<{
    id: string;
    title: string;
    artist: string;
    timestamp: string;
    status: string;
    confidence: number;
    source: string;
  }>;
  
  // Data Quality
  dataQuality: {
    suspiciousComposers: number;
    invalidYears: number;
    missingMultipleFields: number;
    lowConfidence: number;
  };
}

async function fetchEnrichmentMetrics(): Promise<EnrichmentQualityMetrics> {
  log.info('Fetching enrichment quality metrics');

  // 1. Overview Stats
  const { data: allSongs, error: songsError } = await supabase
    .from('songs')
    .select('id, title, status, confidence_score, enrichment_source, composer, release_year, youtube_url, lyrics, created_at, updated_at, artists(name)');

  if (songsError) {
    log.error('Failed to fetch songs for metrics', songsError);
    throw songsError;
  }

  const totalSongs = allSongs?.length || 0;
  const enrichedCount = allSongs?.filter(s => s.status === 'enriched').length || 0;
  const pendingCount = allSongs?.filter(s => s.status === 'pending').length || 0;
  const errorCount = allSongs?.filter(s => s.status === 'error').length || 0;
  const successRate = totalSongs > 0 ? (enrichedCount / totalSongs) * 100 : 0;
  
  const confidenceScores = allSongs?.filter(s => s.confidence_score !== null).map(s => s.confidence_score!) || [];
  const avgConfidence = confidenceScores.length > 0 
    ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
    : 0;

  // 2. Field Coverage
  const composerCount = allSongs?.filter(s => s.composer && s.composer.trim() !== '').length || 0;
  const releaseYearCount = allSongs?.filter(s => s.release_year && s.release_year.trim() !== '').length || 0;
  const youtubeUrlCount = allSongs?.filter(s => s.youtube_url && s.youtube_url.trim() !== '').length || 0;
  const lyricsCount = allSongs?.filter(s => s.lyrics && s.lyrics.trim() !== '').length || 0;
  const enrichmentSourceCount = allSongs?.filter(s => s.enrichment_source && s.enrichment_source.trim() !== '').length || 0;

  const fieldCoverage = {
    composer: { count: composerCount, percentage: (composerCount / totalSongs) * 100 },
    releaseYear: { count: releaseYearCount, percentage: (releaseYearCount / totalSongs) * 100 },
    youtubeUrl: { count: youtubeUrlCount, percentage: (youtubeUrlCount / totalSongs) * 100 },
    lyrics: { count: lyricsCount, percentage: (lyricsCount / totalSongs) * 100 },
    enrichmentSource: { count: enrichmentSourceCount, percentage: (enrichmentSourceCount / totalSongs) * 100 },
  };

  // 3. Layer Performance
  const layerMap = new Map<string, {
    count: number;
    totalConfidence: number;
    withComposer: number;
    withYear: number;
    withYoutube: number;
  }>();

  allSongs?.forEach(song => {
    if (!song.enrichment_source) return;
    
    if (!layerMap.has(song.enrichment_source)) {
      layerMap.set(song.enrichment_source, {
        count: 0,
        totalConfidence: 0,
        withComposer: 0,
        withYear: 0,
        withYoutube: 0,
      });
    }
    
    const stats = layerMap.get(song.enrichment_source)!;
    stats.count++;
    if (song.confidence_score) stats.totalConfidence += song.confidence_score;
    if (song.composer && song.composer.trim() !== '') stats.withComposer++;
    if (song.release_year && song.release_year.trim() !== '') stats.withYear++;
    if (song.youtube_url && song.youtube_url.trim() !== '') stats.withYoutube++;
  });

  const layerStats = Array.from(layerMap.entries()).map(([layer, stats]) => ({
    layer,
    count: stats.count,
    avgConfidence: stats.count > 0 ? stats.totalConfidence / stats.count : 0,
    withComposer: stats.withComposer,
    withYear: stats.withYear,
    withYoutube: stats.withYoutube,
  })).sort((a, b) => b.count - a.count);

  // 4. Confidence Distribution
  const confidenceRanges = [
    { range: '0-49%', min: 0, max: 49 },
    { range: '50-69%', min: 50, max: 69 },
    { range: '70-79%', min: 70, max: 79 },
    { range: '80-89%', min: 80, max: 89 },
    { range: '90-100%', min: 90, max: 100 },
  ];

  const confidenceDistribution = confidenceRanges.map(({ range, min, max }) => ({
    range,
    count: allSongs?.filter(s => 
      s.confidence_score !== null && 
      s.confidence_score >= min && 
      s.confidence_score <= max
    ).length || 0,
  }));

  // 5. Source Distribution
  const sourceMap = new Map<string, { count: number; totalConfidence: number }>();
  
  allSongs?.forEach(song => {
    if (!song.enrichment_source) return;
    
    if (!sourceMap.has(song.enrichment_source)) {
      sourceMap.set(song.enrichment_source, { count: 0, totalConfidence: 0 });
    }
    
    const stats = sourceMap.get(song.enrichment_source)!;
    stats.count++;
    if (song.confidence_score) stats.totalConfidence += song.confidence_score;
  });

  const sourceDistribution = Array.from(sourceMap.entries()).map(([source, stats]) => ({
    source,
    count: stats.count,
    avgConfidence: stats.count > 0 ? stats.totalConfidence / stats.count : 0,
    percentage: (stats.count / enrichedCount) * 100,
  })).sort((a, b) => b.count - a.count);

  // 6. Enrichment History (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const historyMap = new Map<string, { success: number; failure: number }>();
  
  allSongs?.forEach(song => {
    const updatedAt = new Date(song.updated_at || song.created_at);
    if (updatedAt < thirtyDaysAgo) return;
    
    const dateKey = updatedAt.toISOString().split('T')[0];
    
    if (!historyMap.has(dateKey)) {
      historyMap.set(dateKey, { success: 0, failure: 0 });
    }
    
    const stats = historyMap.get(dateKey)!;
    if (song.status === 'enriched') stats.success++;
    if (song.status === 'error') stats.failure++;
  });

  const enrichmentHistory = Array.from(historyMap.entries())
    .map(([date, stats]) => ({
      date,
      success: stats.success,
      failure: stats.failure,
      total: stats.success + stats.failure,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 7. Recent Enrichments (last 20)
  const recentSongs = allSongs
    ?.filter(s => s.status === 'enriched')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 20);

  const recentEnrichments = recentSongs?.map(song => ({
    id: song.id,
    title: song.title,
    artist: (song.artists as any)?.name || 'Desconhecido',
    timestamp: song.updated_at,
    status: song.status,
    confidence: song.confidence_score || 0,
    source: song.enrichment_source || 'unknown',
  })) || [];

  // 8. Data Quality Issues
  const junkWords = ['released', 'gravadora', 'records', 'provided', 'auto-generated', 
                     'topic', 'vevo', 'official', 'music', 'entertainment'];
  
  const suspiciousComposers = allSongs?.filter(song => {
    if (!song.composer) return false;
    const composer = song.composer.toLowerCase();
    const artistName = ((song.artists as any)?.name || '').toLowerCase();
    
    // Compositor igual ao artista
    if (composer === artistName) return true;
    
    // Palavras inválidas
    return junkWords.some(word => composer.includes(word));
  }).length || 0;

  const currentYear = new Date().getFullYear();
  const invalidYears = allSongs?.filter(song => {
    if (!song.release_year) return false;
    const year = parseInt(song.release_year);
    return isNaN(year) || year < 1900 || year > currentYear;
  }).length || 0;

  const missingMultipleFields = allSongs?.filter(song => {
    const missingCount = [
      !song.composer || song.composer.trim() === '',
      !song.release_year || song.release_year.trim() === '',
      !song.youtube_url || song.youtube_url.trim() === '',
    ].filter(Boolean).length;
    
    return missingCount >= 2;
  }).length || 0;

  const lowConfidence = allSongs?.filter(song => 
    song.confidence_score !== null && song.confidence_score < 50
  ).length || 0;

  const dataQuality = {
    suspiciousComposers,
    invalidYears,
    missingMultipleFields,
    lowConfidence,
  };

  log.success('Enrichment metrics fetched successfully', {
    totalSongs,
    enrichedCount,
    avgConfidence: avgConfidence.toFixed(2),
  });

  return {
    totalSongs,
    enrichedCount,
    pendingCount,
    errorCount,
    successRate,
    avgConfidence,
    fieldCoverage,
    layerStats,
    confidenceDistribution,
    sourceDistribution,
    enrichmentHistory,
    recentEnrichments,
    dataQuality,
  };
}

export function useEnrichmentQualityMetrics() {
  return useQuery({
    queryKey: ['enrichment-quality-metrics'],
    queryFn: fetchEnrichmentMetrics,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });
}
