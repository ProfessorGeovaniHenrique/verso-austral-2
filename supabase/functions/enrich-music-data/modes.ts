// Mode handlers for different enrichment workflows
import { 
  searchYouTube, 
  searchWithAI, 
  RateLimiter, 
  extractMetadataFromYouTube, 
  searchWithGoogleGrounding,
  validateYear
  // GPT-5 removido do pipeline - Google Search Grounding é agora a camada principal
} from "./helpers.ts";

type EdgeLogger = any; // Logger interface from unified-logger

const geminiLimiter = new RateLimiter(3, 500);
const youtubeLimiter = new RateLimiter(2, 1000);
const webSearchLimiter = new RateLimiter(2, 800);

// ===== ESTRUTURA PARA CROSS-VALIDATION =====
interface EnrichmentSource {
  source: string;
  composer?: string;
  year?: string;
  album?: string;
  confidence: number;
}

interface ValidationResult {
  finalComposer?: string;
  finalYear?: string;
  finalAlbum?: string;
  confidenceScore: number;
  usedSources: string[];
  validationNotes: string;
}

interface EnrichmentResult {
  songId: string;
  success: boolean;
  enrichedData?: {
    composer?: string;
    releaseYear?: string;
    youtubeVideoId?: string;
    lyrics?: string;
  };
  confidenceScore: number;
  sources: string[];
  error?: string;
  noChanges?: boolean; // Flag indicando que não houve mudanças reais
  message?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Single mode: Enrich one song by ID
export async function handleSingleMode(body: any, supabase: any, log: EdgeLogger) {
  const songId = body.songId;
  const enrichmentMode = body.mode || 'full';
  const forceReenrich = body.forceReenrich || false;
  
  if (!songId) {
    log.warn('Single mode called without songId');
    return new Response(
      JSON.stringify({ error: 'songId is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  log.info('Single mode enrichment started', { songId, enrichmentMode, forceReenrich });

  const result = await enrichSingleSong(songId, supabase, enrichmentMode, log, forceReenrich);

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Database mode: Enrich pending songs for an artist
export async function handleDatabaseMode(body: any, supabase: any, log: EdgeLogger) {
  const { artistId } = body;
  
  if (!artistId) {
    log.warn('Database mode called without artistId');
    return new Response(
      JSON.stringify({ error: 'artistId is required for database mode' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  log.info('Database mode enrichment started', { artistId });

  // Fetch artist name
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .select('name')
    .eq('id', artistId)
    .single();

  if (artistError) {
    log.error('Artist not found', artistError, { artistId });
    return new Response(
      JSON.stringify({ error: `Artist not found: ${artistError.message}` }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  log.logDatabaseQuery('artists', 'select', 1);

  // Fetch pending songs
  const { data: songsData, error: songsError } = await supabase
    .from('songs')
    .select('id, title')
    .eq('artist_id', artistId)
    .eq('status', 'pending')
    .limit(20);

  if (songsError) {
    log.error('Failed to fetch pending songs', songsError, { artistId });
    return new Response(
      JSON.stringify({ error: `Error fetching songs: ${songsError.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  log.logDatabaseQuery('songs', 'select', songsData?.length || 0);

  if (!songsData || songsData.length === 0) {
    log.info('No pending songs found', { artistId });
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'No pending songs found',
        processed: 0,
        successCount: 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  log.info('Pending songs found', { artistId, songCount: songsData.length });

  let successCount = 0;
  let failureCount = 0;

  // Enrich each song
  for (const song of songsData) {
    try {
      const result = await enrichSingleSong(song.id, supabase, 'full', log);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      log.error('Error enriching song', error instanceof Error ? error : new Error(String(error)), { songId: song.id });
      failureCount++;
    }
  }

  log.info('Database mode enrichment completed', {
    artistId,
    processed: songsData.length,
    successCount,
    failureCount
  });

  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'Enrichment completed',
      processed: songsData.length,
      successCount,
      failed: failureCount
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Legacy mode: Batch enrichment from array of titles
export async function handleLegacyMode(body: any, log: EdgeLogger) {
  const { titles, musics } = body;
  
  let musicsToProcess: Array<{ id?: string; titulo: string; artista?: string }> = [];
  
  if (titles && Array.isArray(titles)) {
    musicsToProcess = titles.map((titulo: string, index: number) => ({
      id: `legacy-${index}`,
      titulo,
      artista: undefined
    }));
  } else if (musics && Array.isArray(musics)) {
    musicsToProcess = musics.map((m: any) => ({
      id: m.id || `unknown-${Math.random()}`,
      titulo: m.titulo,
      artista: m.artista_contexto || m.artista
    }));
  } else {
    log.warn('Legacy mode called without titles or musics array');
    return new Response(
      JSON.stringify({ error: 'titles or musics array is required for legacy mode' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  log.info('Legacy mode enrichment started', { itemCount: musicsToProcess.length });

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    log.error('Gemini API key not configured', new Error('Missing API key'));
    return new Response(
      JSON.stringify({ error: 'Gemini API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const enrichedData = [];
  let successCount = 0;

  for (const music of musicsToProcess) {
    try {
      // YouTube search
      let youtubeData = null;
      const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
      if (youtubeApiKey) {
        try {
          youtubeData = await youtubeLimiter.schedule(() =>
            searchYouTube(music.titulo, music.artista || '', youtubeApiKey, null)
          );
        } catch (ytError) {
          console.error(`[Legacy Mode] YouTube error for "${music.titulo}":`, ytError);
        }
      }

      const metadata = await enrichWithAI(
        music.titulo,
        music.artista,
        youtubeData,
        GEMINI_API_KEY,
        undefined
      );

      let result = {
        id: music.id,
        titulo_original: music.titulo,
        artista_encontrado: metadata.artista || 'Não Identificado',
        compositor_encontrado: metadata.compositor || 'Não Identificado',
        ano_lancamento: metadata.ano || '0000',
        youtube_url: youtubeData?.videoId 
          ? `https://www.youtube.com/watch?v=${youtubeData.videoId}`
          : null,
        status_pesquisa: metadata.compositor !== 'Não Identificado' && metadata.ano !== '0000' 
          ? 'Sucesso' 
          : 'Parcial',
        observacoes: metadata.observacoes || '',
        enriched_by_web: false
      };

      // Web search fallback if needed
      const needsWebSearch = 
        result.compositor_encontrado === 'Não Identificado' ||
        result.ano_lancamento === '0000';

      if (needsWebSearch && GEMINI_API_KEY) {
      try {
        const webData = await webSearchLimiter.schedule(() =>
          searchWithAI(music.titulo, music.artista || '', undefined, GEMINI_API_KEY)
        );

        if (webData.compositor && webData.compositor !== 'Não Identificado') {
          result.compositor_encontrado = webData.compositor;
        }
        if (webData.ano && webData.ano !== '0000') {
          result.ano_lancamento = webData.ano;
        }

        if (webData.compositor !== 'Não Identificado' || webData.ano !== '0000') {
          result.status_pesquisa = 'Sucesso (Web)';
          result.enriched_by_web = true;
        }
      } catch (webError) {
        log.warn('Web search fallback failed', { titulo: music.titulo, error: webError instanceof Error ? webError.message : String(webError) });
      }
      }

      enrichedData.push(result);
      if (result.status_pesquisa.includes('Sucesso')) successCount++;

    } catch (error) {
      log.error('Legacy enrichment failed for song', error instanceof Error ? error : new Error(String(error)), { titulo: music.titulo });
      enrichedData.push({
        id: music.id,
        titulo_original: music.titulo,
        artista_encontrado: 'Não Identificado',
        compositor_encontrado: 'Não Identificado',
        ano_lancamento: '0000',
        status_pesquisa: 'Falha',
        observacoes: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
      });
    }
  }

  log.info('Legacy mode enrichment completed', {
    processed: enrichedData.length,
    successCount,
    failureCount: enrichedData.length - successCount
  });

  return new Response(
    JSON.stringify({ 
      success: true,
      results: enrichedData,
      processedCount: enrichedData.length,
      successCount
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Helper function to extract YouTube video ID from URL
function extractVideoId(youtubeUrl: string): string | undefined {
  const match = youtubeUrl.match(/[?&]v=([^&]+)/);
  return match ? match[1] : undefined;
}

// ===== CAMADA 4: Cross-Validation Engine =====
function crossValidateResults(sources: EnrichmentSource[]): ValidationResult {
  if (sources.length === 0) {
    return {
      confidenceScore: 0,
      usedSources: [],
      validationNotes: 'Nenhuma fonte retornou dados'
    };
  }

  // Agrupa por valor normalizado
  const composerVotes = new Map<string, { sources: string[], originalValue: string }>();
  const yearVotes = new Map<string, { sources: string[], originalValue: string }>();
  const albumVotes = new Map<string, { sources: string[], originalValue: string }>();
  
  for (const result of sources) {
    if (result.composer) {
      const normalized = result.composer.toLowerCase().trim();
      if (!composerVotes.has(normalized)) {
        composerVotes.set(normalized, { sources: [], originalValue: result.composer });
      }
      composerVotes.get(normalized)!.sources.push(result.source);
    }
    
    if (result.year) {
      const normalized = result.year.trim();
      if (!yearVotes.has(normalized)) {
        yearVotes.set(normalized, { sources: [], originalValue: result.year });
      }
      yearVotes.get(normalized)!.sources.push(result.source);
    }
    
    if (result.album) {
      const normalized = result.album.toLowerCase().trim();
      if (!albumVotes.has(normalized)) {
        albumVotes.set(normalized, { sources: [], originalValue: result.album });
      }
      albumVotes.get(normalized)!.sources.push(result.source);
    }
  }
  
  // Função para selecionar melhor valor baseado em votos
  const selectBestValue = (votes: Map<string, { sources: string[], originalValue: string }>) => {
    if (votes.size === 0) return undefined;
    
    // Ordenar por número de votos, depois por prioridade de fonte
    const sourcePriority: Record<string, number> = {
      'youtube_description': 3,
      'google_search_grounding': 4,
      'gemini_knowledge': 2,
      'web_search_ai': 1
    };
    
    const sorted = Array.from(votes.entries())
      .map(([normalized, data]) => ({
        normalized,
        ...data,
        voteCount: data.sources.length,
        priority: Math.max(...data.sources.map(s => sourcePriority[s] || 0))
      }))
      .sort((a, b) => {
        if (a.voteCount !== b.voteCount) return b.voteCount - a.voteCount;
        return b.priority - a.priority;
      });
    
    return sorted[0];
  };
  
  const bestComposer = selectBestValue(composerVotes);
  const bestYear = selectBestValue(yearVotes);
  const bestAlbum = selectBestValue(albumVotes);
  
  // Calcular confidence score
  let confidenceScore = 0;
  const notes: string[] = [];
  
  // Compositor (máximo 40 pontos)
  if (bestComposer) {
    if (bestComposer.voteCount >= 3) {
      confidenceScore += 40;
      notes.push(`Compositor confirmado por ${bestComposer.voteCount} fontes`);
    } else if (bestComposer.voteCount === 2) {
      confidenceScore += 30;
      notes.push(`Compositor confirmado por 2 fontes`);
    } else {
      confidenceScore += 15;
      notes.push(`Compositor de 1 fonte apenas`);
    }
  }
  
  // Ano (máximo 30 pontos)
  if (bestYear) {
    if (bestYear.voteCount >= 3) {
      confidenceScore += 30;
      notes.push(`Ano confirmado por ${bestYear.voteCount} fontes`);
    } else if (bestYear.voteCount === 2) {
      confidenceScore += 20;
      notes.push(`Ano confirmado por 2 fontes`);
    } else {
      confidenceScore += 10;
      notes.push(`Ano de 1 fonte apenas`);
    }
  }
  
  // Álbum (máximo 10 pontos)
  if (bestAlbum) {
    confidenceScore += 10;
    notes.push(`Álbum encontrado`);
  }
  
  // Bônus por YouTube URL (10 pontos)
  if (sources.some(s => s.source === 'youtube_description')) {
    confidenceScore += 10;
    notes.push(`Link YouTube disponível`);
  }
  
  // Detectar conflitos
  if (composerVotes.size > 1) {
    notes.push(`⚠️ Conflito: ${composerVotes.size} compositores diferentes encontrados`);
  }
  if (yearVotes.size > 1) {
    notes.push(`⚠️ Conflito: ${yearVotes.size} anos diferentes encontrados`);
  }
  
  return {
    finalComposer: bestComposer?.originalValue,
    finalYear: bestYear?.originalValue,
    finalAlbum: bestAlbum?.originalValue,
    confidenceScore: Math.min(100, confidenceScore),
    usedSources: [...new Set(sources.map(s => s.source))],
    validationNotes: notes.join('; ')
  };
}

// Core enrichment function for a single song
async function enrichSingleSong(
  songId: string, 
  supabase: any,
  enrichmentMode: 'full' | 'metadata-only' | 'youtube-only' = 'full',
  log: EdgeLogger,
  forceReenrich: boolean = false
): Promise<EnrichmentResult> {
  const timer = log.startTimer();
  
  try {
    // Fetch song data (including current enrichment status)
    const { data: song, error: fetchError } = await supabase
      .from('songs')
      .select(`
        id,
        title,
        normalized_title,
        composer,
        release_year,
        youtube_url,
        lyrics,
        confidence_score,
        status,
        artists (
          name
        )
      `)
      .eq('id', songId)
      .single();

    log.logDatabaseQuery('songs', 'select', 1);

    if (fetchError || !song) {
      log.warn('Song not found', { songId });
      return {
        songId,
        success: false,
        confidenceScore: 0,
        sources: [],
        error: 'Song not found'
      };
    }

    // Store current data for intelligent merge
    const currentData = {
      composer: song.composer,
      release_year: song.release_year,
      youtube_url: song.youtube_url,
      lyrics: song.lyrics,
      confidence_score: song.confidence_score || 0,
      status: song.status
    };

    log.debug('Current song data retrieved', { songId, currentData });

    const artistName = (song.artists as any)?.name || 'Unknown Artist';
    const enrichmentSources: EnrichmentSource[] = [];
    let youtubeContext = null;
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

    log.info('Starting 4-layer enrichment pipeline (YouTube → Google Grounding → Gemini)', { songId, mode: enrichmentMode, forceReenrich });

    // ===== CAMADA 1: YouTube API + Extração Inteligente =====
    if (youtubeApiKey && enrichmentMode !== 'metadata-only') {
      try {
        youtubeContext = await youtubeLimiter.schedule(() =>
          searchYouTube(song.title, artistName, youtubeApiKey, supabase)
        );
        
        if (youtubeContext) {
          log.info('YouTube video found', { songId, videoId: youtubeContext.videoId });
          
          // Extração inteligente de metadados do YouTube
          const extracted = extractMetadataFromYouTube(youtubeContext);
          
          enrichmentSources.push({
            source: 'youtube_description',
            composer: extracted.composer,
            year: extracted.year,
            album: extracted.album,
            confidence: 75
          });
          
          log.debug('YouTube metadata extracted', { 
            songId, 
            composer: extracted.composer, 
            year: extracted.year,
            album: extracted.album 
          });
          
          // SHORT-CIRCUIT: Se YouTube extraiu compositor E ano, pular para cross-validation
          if (extracted.composer && extracted.year) {
            log.info('YouTube provided complete metadata - skipping AI layers', { songId });
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'YOUTUBE_QUOTA_EXCEEDED') {
          log.error('YouTube quota exceeded', error, { songId });
        } else {
          log.warn('YouTube search failed', { songId, error: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    // ===== CAMADA 2: Google Search Grounding (Camada Principal) =====
    // Executar SEMPRE que não tiver dados completos do YouTube
    const hasCompleteYouTubeData = enrichmentSources.some(s => s.source === 'youtube_description' && s.composer && s.year);
    
    if (GEMINI_API_KEY && enrichmentMode !== 'youtube-only' && !hasCompleteYouTubeData) {
      try {
        log.info('Invoking Google Search Grounding', { songId });
        
        const groundingResult = await webSearchLimiter.schedule(() =>
          searchWithGoogleGrounding(song.title, artistName, GEMINI_API_KEY)
        );
        
        if (groundingResult && (groundingResult.compositor || groundingResult.ano || groundingResult.album)) {
          // Aumentar confiança do Google Grounding (agora é camada principal)
          const sourceConfidence = 
            groundingResult.confidence === 'high' ? 95 : 
            groundingResult.confidence === 'medium' ? 80 : 60;
          
          enrichmentSources.push({
            source: 'google_search_grounding',
            composer: groundingResult.compositor,
            year: groundingResult.ano,
            album: groundingResult.album,
            confidence: sourceConfidence
          });
          
          log.info('Google Search Grounding completed', { 
            songId, 
            composer: groundingResult.compositor,
            confidence: groundingResult.confidence,
            fontes: groundingResult.fontes?.length || 0
          });
        }
      } catch (error) {
        log.warn('Google Search Grounding failed', { songId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // ===== CAMADA 3: Gemini Knowledge Base (Fallback sem grounding) =====
    const needsMoreData = !enrichmentSources.some(s => s.composer && s.year);
    
    if (GEMINI_API_KEY && enrichmentMode !== 'youtube-only' && (forceReenrich || needsMoreData)) {
      try {
        log.info('Invoking Gemini Knowledge Base', { songId });
        
        const metadata = await enrichWithAI(
          song.title,
          artistName,
          youtubeContext,
          GEMINI_API_KEY,
          undefined
        );

        if (metadata.composer || metadata.compositor || metadata.releaseYear || metadata.ano) {
          enrichmentSources.push({
            source: 'gemini_knowledge',
            composer: metadata.composer || metadata.compositor,
            year: metadata.releaseYear || metadata.ano,
            confidence: 60
          });
          
          log.debug('Gemini Knowledge Base results', { 
            songId, 
            composer: metadata.composer || metadata.compositor,
            year: metadata.releaseYear || metadata.ano
          });
        }
      } catch (error) {
        log.warn('Gemini Knowledge Base failed', { songId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // ===== BUSCA DE LETRA (mantida do sistema original) =====
    let lyricsFound = false;
    const shouldSearchLyrics = !song.lyrics && GEMINI_API_KEY && enrichmentMode === 'full';

    if (shouldSearchLyrics) {
      try {
        log.info('Searching lyrics', { songId, title: song.title });
        const lyrics = await searchLyrics(song.title, artistName, GEMINI_API_KEY, log);
        if (lyrics) {
          lyricsFound = true;
          log.info('Lyrics found', { songId, length: lyrics.length });
        }
      } catch (error) {
        log.warn('Lyrics search failed', { songId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // ===== CAMADA 4: Cross-Validation Engine =====
    log.info('Starting cross-validation', { songId, sourcesCount: enrichmentSources.length });
    const validated = crossValidateResults(enrichmentSources);
    
    // ✅ VALIDAÇÃO ADICIONAL: Rejeitar compositor se for igual ao artista
    if (validated.finalComposer) {
      const composerLower = validated.finalComposer.toLowerCase().trim();
      const artistLower = artistName.toLowerCase().trim();
      
      if (composerLower === artistLower || composerLower.includes(artistLower)) {
        log.warn('Rejecting composer - identical to artist name', { 
          songId, 
          composer: validated.finalComposer, 
          artist: artistName 
        });
        validated.finalComposer = undefined;
        validated.confidenceScore = Math.max(0, validated.confidenceScore - 20);
        validated.validationNotes += '; Compositor rejeitado (idêntico ao artista)';
      }
    }
    
    log.info('Cross-validation completed', { 
      songId,
      finalComposer: validated.finalComposer,
      finalYear: validated.finalYear,
      finalAlbum: validated.finalAlbum,
      confidenceScore: validated.confidenceScore,
      sources: validated.usedSources
    });

    // ===== CAMADA 5: Persistência Inteligente =====
    
    // Verificar se temos dados novos e MELHORES (não aceitar "Não Identificado")
    const hasValidComposer = validated.finalComposer && 
      validated.finalComposer !== 'Não Identificado' && 
      validated.finalComposer.toLowerCase() !== 'não identificado';
    
    const hasValidYear = validated.finalYear && 
      validated.finalYear !== '0000' &&
      validateYear(validated.finalYear);
    
    const hasNewData = 
      hasValidComposer || 
      hasValidYear || 
      validated.finalAlbum ||
      (youtubeContext && youtubeContext.videoId) ||
      lyricsFound;

    const isBetterConfidence = validated.confidenceScore > currentData.confidence_score;
    const hasNewYouTube = youtubeContext?.videoId && !currentData.youtube_url;
    const hasNewComposer = hasValidComposer && !currentData.composer;
    const hasNewYear = hasValidYear && !currentData.release_year;
    const hasNewAlbum = validated.finalAlbum;

    // Decidir se deve atualizar
    let shouldUpdate = hasNewData && (
      forceReenrich ||
      isBetterConfidence ||
      hasNewYouTube ||
      hasNewComposer ||
      hasNewYear ||
      hasNewAlbum ||
      lyricsFound
    );

    if (currentData.confidence_score === 0 && hasNewData) {
      shouldUpdate = true;
    }

    if (!shouldUpdate) {
      log.info('Skipping update - no new data or current data better', { 
        songId, 
        currentConfidence: currentData.confidence_score,
        newConfidence: validated.confidenceScore,
        reason: !hasNewData ? 'No valid new data (rejecting Não Identificado)' : 'Current data is better'
      });
      
      return {
        songId,
        success: true, // API funcionou
        enrichedData: {
          composer: currentData.composer || undefined,
          releaseYear: currentData.release_year || undefined,
          youtubeVideoId: currentData.youtube_url ? extractVideoId(currentData.youtube_url) : undefined
        },
        confidenceScore: currentData.confidence_score,
        sources: ['cached'],
        noChanges: true, // Flag indicando que não houve mudanças reais
        message: 'Nenhum dado novo encontrado ou dados existentes são melhores'
      };
    }

    // ===== MERGE DATA: Combine best of both enrichments =====
    const updateData: any = {
      status: 'enriched',
      confidence_score: Math.max(validated.confidenceScore, currentData.confidence_score),
      enrichment_source: validated.usedSources.join(','),
      updated_at: new Date().toISOString(),
    };

    // Intelligent field merge: só sobrescrever se for melhor que existente
    // NÃO sobrescrever com "Não Identificado"
    if (hasValidComposer && (!currentData.composer || validated.confidenceScore >= currentData.confidence_score)) {
      updateData.composer = validated.finalComposer;
    } else {
      updateData.composer = currentData.composer || null;
    }
    
    if (hasValidYear && (!currentData.release_year || validated.confidenceScore >= currentData.confidence_score)) {
      updateData.release_year = validated.finalYear;
    } else {
      updateData.release_year = currentData.release_year || null;
    }
    
    updateData.album = validated.finalAlbum || null; // ✅ NOVO CAMPO ÁLBUM
    
    // Buscar letra se disponível
    if (lyricsFound) {
      const lyrics = await searchLyrics(song.title, artistName, GEMINI_API_KEY!, log);
      updateData.lyrics = lyrics || currentData.lyrics || null;
    } else {
      updateData.lyrics = currentData.lyrics || null;
    }
    
    if (youtubeContext?.videoId) {
      updateData.youtube_url = `https://www.youtube.com/watch?v=${youtubeContext.videoId}`;
    } else if (currentData.youtube_url) {
      updateData.youtube_url = currentData.youtube_url;
    }
    
    // Salvar notas de validação no raw_data
    updateData.raw_data = {
      ...song.raw_data,
      enrichment_validation: validated.validationNotes,
      enrichment_sources_detail: enrichmentSources,
      enrichment_timestamp: new Date().toISOString()
    };

    log.info('Updating song with validated data', {
      songId,
      composer: updateData.composer,
      release_year: updateData.release_year,
      album: updateData.album,
      youtube_url: updateData.youtube_url,
      confidence: updateData.confidence_score,
      sources: validated.usedSources
    });

    const { error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', songId);

    log.logDatabaseQuery('songs', 'update', 1, timer.end('enrich-single-song'));

    if (updateError) {
      log.error('Failed to update song', updateError, { songId });
      throw updateError;
    }

    log.info('Song enrichment successful - 5-layer pipeline', { 
      songId, 
      confidence: validated.confidenceScore, 
      sources: validated.usedSources,
      validationNotes: validated.validationNotes
    });

    return {
      songId,
      success: true,
      enrichedData: {
        composer: validated.finalComposer,
        releaseYear: validated.finalYear,
        youtubeVideoId: youtubeContext?.videoId
      },
      confidenceScore: validated.confidenceScore,
      sources: validated.usedSources
    };

  } catch (error) {
    log.error('Song enrichment failed', error instanceof Error ? error : new Error(String(error)), { songId });
    return {
      songId,
      success: false,
      confidenceScore: 0,
      sources: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Helper function to search lyrics using AI
async function searchLyrics(
  songTitle: string,
  artistName: string,
  geminiApiKey: string,
  log: EdgeLogger
): Promise<string | null> {
  const prompt = `Você é um sistema de busca de letras de músicas.

Retorne APENAS a letra completa da música "${songTitle}" do artista "${artistName}".

REGRAS CRÍTICAS:
1. Se você NÃO tiver certeza da letra COMPLETA e EXATA, retorne APENAS: "LETRA_NAO_DISPONIVEL"
2. NÃO invente versos ou trechos
3. NÃO misture com outras músicas
4. Retorne a letra em português (se for música brasileira)
5. Inclua quebras de linha entre versos
6. NÃO adicione introduções, comentários ou formatação markdown

Retorne APENAS a letra ou "LETRA_NAO_DISPONIVEL".`;

  try {
    const apiTimer = log.startTimer();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000
          }
        }),
      }
    );

    const duration = apiTimer.end('gemini-lyrics');

    if (!response.ok) {
      log.logApiCall('gemini', 'lyrics', 'POST', response.status, duration);
      return null;
    }

    log.logApiCall('gemini', 'lyrics', 'POST', 200, duration);

    const data = await response.json();
    const lyrics = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!lyrics || lyrics === 'LETRA_NAO_DISPONIVEL' || lyrics.length < 50) {
      log.debug('Lyrics not available', { songTitle, artistName });
      return null;
    }

    return lyrics;

  } catch (error) {
    log.error('Lyrics search failed', error instanceof Error ? error : new Error(String(error)), { songTitle, artistName });
    return null;
  }
}

// AI enrichment with Lovable AI (Gemini Pro) → Google API fallback
async function enrichWithAI(
  titulo: string,
  artista: string | undefined,
  youtubeContext: any,
  geminiApiKey: string | undefined,
  lovableApiKey: string | undefined
): Promise<{ 
  artista?: string; 
  composer?: string;
  compositor?: string; 
  ano?: string; 
  releaseYear?: string; 
  observacoes?: string; 
  source?: string;
}> {
  
  let youtubeContextText = 'Nenhum vídeo do YouTube encontrado';
  if (youtubeContext) {
    const publishYear = new Date(youtubeContext.publishDate).getFullYear();
    youtubeContextText = `
🎬 CONTEXTO DO YOUTUBE:
- Vídeo: "${youtubeContext.videoTitle}"
- Canal: ${youtubeContext.channelTitle}
- Data: ${youtubeContext.publishDate} (Ano: ${publishYear})

DESCRIÇÃO DO VÍDEO (busque créditos aqui):
${youtubeContext.description.substring(0, 2000)}${youtubeContext.description.length > 2000 ? '...' : ''}

Procure por: "Composer:", "Compositor:", "℗ [ano]", "Written by:", "Provided to YouTube by"`;
  }

  const systemPrompt = `Você é um especialista em metadados musicais.
Sua tarefa é identificar o Compositor e o Ano de Lançamento da música.

Entrada:
Artista: ${artista || 'Desconhecido'}
Música: ${titulo}

${youtubeContextText}

Saída Obrigatória (JSON):
{
  "composer": "Nome(s) do(s) Compositor(es) separados por ' / ' se houver mais de um. Exemplo: 'Luiz Marenco / Gujo Teixeira'. Retorne null se desconhecido.",
  "release_year": "Ano YYYY (ou null se desconhecido)",
  "confidence": "high/medium/low"
}

REGRAS CRÍTICAS:
- Se houver MÚLTIPLOS compositores, liste TODOS separados por " / "
- Não confunda intérprete com compositor
- Priorize a composição original, não arranjos
- Formato: "Compositor 1 / Compositor 2 / Compositor 3"
- NUNCA retorne "Não Identificado", "Desconhecido" ou similares - use null
- Se não tiver certeza absoluta, retorne null

Não adicione markdown \`\`\`json ou explicações. Apenas o objeto JSON cru.`;

  // Use Google API directly
  if (geminiApiKey) {
    try {
      console.log(`[enrichWithAI] 🔍 Processing: "${titulo}" - "${artista}"`);
      
      const geminiTimer = performance.now();
      const geminiResponse = await geminiLimiter.schedule(() =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 200,
                responseMimeType: "application/json"
              }
            }),
          }
        )
      );

      const geminiDuration = performance.now() - geminiTimer;
      console.log(`[enrichWithAI] ⏱️ API Response in ${geminiDuration.toFixed(0)}ms`);

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // 🔍 LOG DETALHADO
        console.log('[enrichWithAI] 📝 Raw Response:', rawText.substring(0, 200));
        
        if (rawText) {
          const metadata = JSON.parse(rawText);
          
          // 🔍 LOG DETALHADO
          console.log('[enrichWithAI] ✅ Parsed Result:', JSON.stringify({
            composer: metadata.composer,
            release_year: metadata.release_year,
            confidence: metadata.confidence
          }));
          
          // Verificar se retornou dados válidos
          const hasValidComposer = metadata.composer && 
            metadata.composer !== 'null' && 
            metadata.composer.toLowerCase() !== 'não identificado' &&
            metadata.composer.toLowerCase() !== 'desconhecido';
            
          const hasValidYear = metadata.release_year && 
            metadata.release_year !== 'null' &&
            metadata.release_year !== '0000';
          
          if (!hasValidComposer && !hasValidYear) {
            console.warn('[enrichWithAI] ⚠️ No valid data returned (both null or invalid)');
          }
          
          return {
            artista: artista,
            composer: hasValidComposer ? metadata.composer : undefined,
            compositor: hasValidComposer ? metadata.composer : undefined,
            releaseYear: hasValidYear ? metadata.release_year : undefined,
            ano: hasValidYear ? metadata.release_year : undefined,
            observacoes: '',
            source: 'google_api_gemini_pro'
          };
        }
      } else {
        console.error('[enrichWithAI] ❌ API error:', geminiResponse.status);
      }
    } catch (geminiError) {
      console.error('[enrichWithAI] 💥 Failed:', geminiError);
    }
  }

  // ✅ NÃO retornar "Não Identificado" - retornar undefined
  return {
    compositor: undefined,
    ano: undefined,
    observacoes: 'AI enrichment failed - no data available'
  };
}
