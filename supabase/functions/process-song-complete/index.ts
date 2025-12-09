/**
 * Edge Function: process-song-complete
 * Pipeline unificada de 3 fases para processamento completo de uma música:
 * 1. Enriquecimento de Metadados (GPT-5)
 * 2. Anotação Semântica (Gemini)
 * 3. Cálculo de Quality Score
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessSongRequest {
  songId: string;
  skipEnrichment?: boolean;
  skipAnnotation?: boolean;
  forceReprocess?: boolean;
}

interface QualityBreakdown {
  title: number;
  composer: number;
  youtube: number;
  lyrics: number;
  year: number;
  semantic: number;
}

interface PhaseResult {
  success: boolean;
  durationMs: number;
  error?: string;
}

interface EnrichmentPhaseResult extends PhaseResult {
  composerFound: boolean;
  youtubeFound: boolean;
  yearFound: boolean;
  confidenceScore: number;
}

interface AnnotationPhaseResult extends PhaseResult {
  wordsProcessed: number;
  cachedWords: number;
  newWords: number;
  coverage: number;
}

interface QualityPhaseResult extends PhaseResult {
  score: number;
  breakdown: QualityBreakdown;
}

interface ProcessingResult {
  songId: string;
  songTitle: string;
  artistName: string;
  success: boolean;
  phases: {
    enrichment: EnrichmentPhaseResult;
    annotation: AnnotationPhaseResult;
    quality: QualityPhaseResult;
  };
  totalTimeMs: number;
  error?: string;
}

function createSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// FASE 1: Enriquecimento de Metadados
async function enrichMetadata(
  supabase: ReturnType<typeof createSupabaseClient>,
  songId: string,
  forceReprocess: boolean
): Promise<EnrichmentPhaseResult> {
  const startTime = Date.now();

  try {
    const { data, error } = await supabase.functions.invoke('enrich-music-data', {
      body: { songId, mode: 'metadata-only', forceReenrich: forceReprocess }
    });

    if (error) {
      console.error(`[process-song-complete] Enrichment error:`, error);
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: error.message,
        composerFound: false,
        youtubeFound: false,
        yearFound: false,
        confidenceScore: 0
      };
    }

    return {
      success: data?.success || false,
      durationMs: Date.now() - startTime,
      composerFound: !!data?.composer,
      youtubeFound: !!data?.youtube_url,
      yearFound: !!data?.release_year,
      confidenceScore: data?.confidence_score || 0
    };
  } catch (err) {
    console.error(`[process-song-complete] Enrichment exception:`, err);
    return {
      success: false,
      durationMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      composerFound: false,
      youtubeFound: false,
      yearFound: false,
      confidenceScore: 0
    };
  }
}

// FASE 2: Anotação Semântica
async function annotateSemantics(
  supabase: ReturnType<typeof createSupabaseClient>,
  songId: string,
  forceReprocess: boolean
): Promise<AnnotationPhaseResult> {
  const startTime = Date.now();

  try {
    const { data, error } = await supabase.functions.invoke('annotate-single-song', {
      body: { songId, forceReprocess }
    });

    if (error) {
      console.error(`[process-song-complete] Annotation error:`, error);
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: error.message,
        wordsProcessed: 0,
        cachedWords: 0,
        newWords: 0,
        coverage: 0
      };
    }

    const stats = data?.stats || {};
    const coverage = stats.totalWords > 0 
      ? (stats.processedWords / stats.totalWords) * 100 
      : 0;

    return {
      success: data?.success || false,
      durationMs: Date.now() - startTime,
      wordsProcessed: stats.processedWords || 0,
      cachedWords: stats.cachedWords || 0,
      newWords: stats.newWords || 0,
      coverage
    };
  } catch (err) {
    console.error(`[process-song-complete] Annotation exception:`, err);
    return {
      success: false,
      durationMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      wordsProcessed: 0,
      cachedWords: 0,
      newWords: 0,
      coverage: 0
    };
  }
}

// FASE 3: Cálculo de Quality Score
async function calculateQualityScore(
  supabase: ReturnType<typeof createSupabaseClient>,
  songId: string
): Promise<QualityPhaseResult> {
  const startTime = Date.now();

  try {
    // Buscar dados atuais da música
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, title, composer, youtube_url, lyrics, release_year')
      .eq('id', songId)
      .single();

    if (songError || !song) {
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: 'Música não encontrada',
        score: 0,
        breakdown: { title: 0, composer: 0, youtube: 0, lyrics: 0, year: 0, semantic: 0 }
      };
    }

    // Verificar cobertura semântica
    const { count: semanticCount } = await supabase
      .from('semantic_disambiguation_cache')
      .select('*', { count: 'exact', head: true })
      .eq('song_id', songId);

    // Calcular breakdown
    const breakdown: QualityBreakdown = {
      title: song.title && song.title.length > 0 ? 10 : 0,
      composer: song.composer && song.composer.length > 0 ? 20 : 0,
      youtube: song.youtube_url && song.youtube_url.length > 0 ? 15 : 0,
      lyrics: song.lyrics && song.lyrics.length > 100 ? 30 : (song.lyrics && song.lyrics.length > 0 ? 15 : 0),
      year: song.release_year && song.release_year.length > 0 ? 15 : 0,
      semantic: (semanticCount && semanticCount > 10) ? 10 : (semanticCount && semanticCount > 0 ? 5 : 0)
    };

    const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

    // Atualizar quality_score na música
    const { error: updateError } = await supabase
      .from('songs')
      .update({ quality_score: score })
      .eq('id', songId);

    if (updateError) {
      console.error(`[process-song-complete] Quality update error:`, updateError);
    }

    return {
      success: true,
      durationMs: Date.now() - startTime,
      score,
      breakdown
    };
  } catch (err) {
    console.error(`[process-song-complete] Quality exception:`, err);
    return {
      success: false,
      durationMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      score: 0,
      breakdown: { title: 0, composer: 0, youtube: 0, lyrics: 0, year: 0, semantic: 0 }
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createSupabaseClient();

  try {
    const { 
      songId, 
      skipEnrichment = false, 
      skipAnnotation = false,
      forceReprocess = false 
    }: ProcessSongRequest = await req.json();

    if (!songId) {
      return new Response(
        JSON.stringify({ success: false, error: 'songId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-song-complete] Iniciando processamento da música ${songId}`);

    // Buscar informações básicas da música
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, title, artists(name)')
      .eq('id', songId)
      .single();

    if (songError || !song) {
      return new Response(
        JSON.stringify({ success: false, error: 'Música não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const artistName = Array.isArray(song.artists) 
      ? song.artists[0]?.name || 'Desconhecido' 
      : 'Desconhecido';

    // FASE 1: Enriquecimento
    let enrichmentResult: EnrichmentPhaseResult;
    if (skipEnrichment) {
      enrichmentResult = {
        success: true,
        durationMs: 0,
        composerFound: false,
        youtubeFound: false,
        yearFound: false,
        confidenceScore: 0
      };
      console.log(`[process-song-complete] FASE 1 pulada (skipEnrichment=true)`);
    } else {
      console.log(`[process-song-complete] FASE 1: Enriquecimento de metadados...`);
      enrichmentResult = await enrichMetadata(supabase, songId, forceReprocess);
      console.log(`[process-song-complete] FASE 1 completa: ${enrichmentResult.success ? 'sucesso' : 'erro'}`);
    }

    // FASE 2: Anotação Semântica
    let annotationResult: AnnotationPhaseResult;
    if (skipAnnotation) {
      annotationResult = {
        success: true,
        durationMs: 0,
        wordsProcessed: 0,
        cachedWords: 0,
        newWords: 0,
        coverage: 0
      };
      console.log(`[process-song-complete] FASE 2 pulada (skipAnnotation=true)`);
    } else {
      console.log(`[process-song-complete] FASE 2: Anotação semântica...`);
      annotationResult = await annotateSemantics(supabase, songId, forceReprocess);
      console.log(`[process-song-complete] FASE 2 completa: ${annotationResult.wordsProcessed} palavras`);
    }

    // FASE 3: Quality Score (sempre executa)
    console.log(`[process-song-complete] FASE 3: Calculando quality score...`);
    const qualityResult = await calculateQualityScore(supabase, songId);
    console.log(`[process-song-complete] FASE 3 completa: score=${qualityResult.score}`);

    const totalTimeMs = Date.now() - startTime;

    const result: ProcessingResult = {
      songId,
      songTitle: song.title,
      artistName,
      success: true,
      phases: {
        enrichment: enrichmentResult,
        annotation: annotationResult,
        quality: qualityResult
      },
      totalTimeMs
    };

    console.log(`[process-song-complete] Processamento completo em ${totalTimeMs}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(`[process-song-complete] Erro geral:`, err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        totalTimeMs: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
