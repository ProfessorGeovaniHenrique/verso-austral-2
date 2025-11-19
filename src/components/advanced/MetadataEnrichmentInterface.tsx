import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Play, Pause, Check, X, Edit2, Sparkles, Database, History, HardDrive, Wifi, WifiOff, Lightbulb } from 'lucide-react';
import { loadFullTextCorpus } from '@/lib/fullTextParser';
import type { CorpusType } from '@/data/types/corpus-tools.types';
import type { SongMetadata } from '@/data/types/full-text-corpus.types';
import { EnrichmentMetrics } from './EnrichmentMetrics';
import { SaveIndicator } from '@/components/ui/save-indicator';
import { SessionRestoreDialog } from './SessionRestoreDialog';
import { SessionHistoryTab } from './SessionHistoryTab';
import { RoadmapTab } from './RoadmapTab';
import { useEnrichmentPersistence } from '@/hooks/useEnrichmentPersistence';
import { useMultiTabSync } from '@/hooks/useMultiTabSync';
import { useSaveIndicator } from '@/hooks/useSaveIndicator';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { EnrichmentSession, validateEnrichmentSession } from '@/lib/enrichmentSchemas';
import { saveSessionToCloud, loadSessionFromCloud, resolveConflict } from '@/services/enrichmentPersistence';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

interface EnrichedSongData extends SongMetadata {
  status: 'pending' | 'enriching' | 'validated' | 'rejected' | 'error';
  sugestao?: {
    compositor?: string;
    artista?: string;
    album?: string;
    ano?: string;
    fonte: 'musicbrainz' | 'ai-inferred' | 'not-found';
    confianca: number;
    detalhes?: string;
  };
  compositorEditado?: string;
  fonteValidada?: 'musicbrainz' | 'ai-inferred' | 'manual';
  letra?: string;
}

export function MetadataEnrichmentInterface() {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus(); // FASE 4.1: Network Status Detection
  
  // Estados existentes
  const [corpusType, setCorpusType] = useState<CorpusType>('gaucho');
  const [songs, setSongs] = useState<EnrichedSongData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [avgTimePerSong, setAvgTimePerSong] = useState<number>(0);
  const [avgProcessingTime, setAvgProcessingTime] = useState(0);
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [viewMode, setViewMode] = useState<'validation-queue' | 'all'>('validation-queue');
  
  // Estados de persistência
  const [cloudSessionId, setCloudSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string>(new Date().toISOString());
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [localSessionToRestore, setLocalSessionToRestore] = useState<EnrichmentSession | null>(null);
  const [cloudSessionToRestore, setCloudSessionToRestore] = useState<EnrichmentSession | null>(null);
  
  // FASE 2.1: Mutex para saveCurrentSession (prevenir race conditions)
  const saveMutexRef = useRef<boolean>(false);
  const saveQueueRef = useRef<EnrichmentSession[]>([]);
  
  // Hooks de persistência
  const persistence = useEnrichmentPersistence();
  const { status: saveStatus, startSaving, completeSaving, setSaveError } = useSaveIndicator();
  
  // Métricas calculadas
  const metrics = useMemo(() => ({
    totalSongs: songs.length,
    pendingSongs: songs.filter(s => s.status === 'pending' && !s.sugestao).length,
    enrichedSongs: songs.filter(s => s.sugestao && s.status !== 'validated' && s.status !== 'rejected').length,
    validatedSongs: songs.filter(s => s.status === 'validated').length,
    rejectedSongs: songs.filter(s => s.status === 'rejected').length,
    errorCount: songs.filter(s => s.status === 'error').length,
    averageConfidence: songs.filter(s => s.sugestao?.confianca).reduce((sum, s) => sum + (s.sugestao?.confianca || 0), 0) / songs.filter(s => s.sugestao?.confianca).length || 0,
    totalProcessingTime: avgProcessingTime * songs.filter(s => s.sugestao).length,
    averageTimePerSong: avgProcessingTime,
  }), [songs, avgProcessingTime]);

  // Filtro inteligente de visualização (FASE 1.1: Validation Queue)
  const getDisplaySongs = useCallback(() => {
    if (viewMode === 'validation-queue') {
      // Mostrar apenas músicas que precisam de validação humana
      return songs.filter(s => 
        s.sugestao && 
        s.status !== 'validated' && 
        s.status !== 'rejected' &&
        s.status !== 'pending' &&
        s.status !== 'enriching'
      );
    }
    return songs; // Modo 'all'
  }, [songs, viewMode]);

  const displaySongs = useMemo(() => getDisplaySongs(), [getDisplaySongs]);

  // Multi-tab sync
  const handleSessionUpdate = useCallback((session: EnrichmentSession) => {
    setSongs(session.songs as any);
    setCurrentIndex(session.currentIndex);
    setCorpusType(session.corpusType);
    toast.info('Sessão sincronizada de outra aba');
  }, []);

  const handleSessionClear = useCallback(() => {
    setSongs([]);
    setCurrentIndex(0);
    toast.info('Sessão limpa em outra aba');
  }, []);

  const { broadcastSessionUpdate, broadcastSessionClear } = useMultiTabSync(handleSessionUpdate, handleSessionClear);

  /**
   * Salvar sessão com MUTEX (FASE 2.1)
   * Previne race conditions de múltiplas chamadas simultâneas
   */
  const saveCurrentSession = useCallback(async () => {
    if (songs.length === 0) return;
    
    const session: EnrichmentSession = {
      corpusType,
      songs: songs as any,
      currentIndex,
      isEnriching,
      isPaused,
      metrics,
      startedAt: sessionStartTime,
      lastSavedAt: new Date().toISOString(),
      schemaVersion: 1,
    };

    // Se mutex travado, enfileirar para processar depois
    if (saveMutexRef.current) {
      logger.debug('🔒 Save mutex travado, enfileirando...');
      saveQueueRef.current.push(session);
      return;
    }

    // Acquire lock
    saveMutexRef.current = true;
    logger.debug('🔓 Save mutex adquirido');

    try {
      startSaving();
      
      logger.info('💾 Iniciando salvamento de sessão...');
      
      // Salvar local
      logger.info('📁 Salvando localStorage...');
      persistence.saveSession(session);
      logger.success('✅ localStorage salvo');
      
      // Salvar cloud (se autenticado e online)
      if (user && isOnline) {
        logger.info('☁️ Salvando Supabase...', { user: user.id, cloudSessionId });
        const sessionId = await saveSessionToCloud(session, cloudSessionId || undefined);
        
        if (sessionId) {
          logger.success(`✅ Supabase salvo: ${sessionId}`);
          if (!cloudSessionId) {
            setCloudSessionId(sessionId);
          }
        } else {
          logger.warn('⚠️ Supabase save retornou null');
        }
      } else if (!user) {
        logger.warn('⚠️ User não autenticado, pulando cloud save');
      } else if (!isOnline) {
        logger.warn('⚠️ Offline, pulando cloud save');
      }
      
      completeSaving();
      broadcastSessionUpdate(session);
      logger.success('✅ Salvamento completo');
    } catch (error) {
      logger.error('❌ Erro ao salvar sessão:', error);
      setSaveError('Erro ao salvar');
      toast.error('Erro ao salvar sessão', { 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    } finally {
      // Release lock
      saveMutexRef.current = false;
      logger.debug('🔓 Save mutex liberado');

      // Processar fila (se houver pendências)
      if (saveQueueRef.current.length > 0) {
        logger.info(`📋 Processando ${saveQueueRef.current.length} save(s) enfileirado(s)`);
        const queuedSession = saveQueueRef.current.shift();
        if (queuedSession) {
          // Processar próximo da fila (não-bloqueante)
          setTimeout(() => {
            saveCurrentSession();
          }, 100);
        }
      }
    }
  }, [songs, corpusType, currentIndex, isEnriching, isPaused, metrics, sessionStartTime, user, isOnline, cloudSessionId, persistence, startSaving, completeSaving, setSaveError, broadcastSessionUpdate]);

  // Carregar sessão ao montar
  useEffect(() => {
    const loadSavedSession = async () => {
      const localSession = persistence.loadSession();
      const cloudSession = user ? await loadSessionFromCloud() : null;

      if (localSession || cloudSession) {
        setLocalSessionToRestore(localSession);
        setCloudSessionToRestore(cloudSession);
        setShowRestoreDialog(true);
      }
    };

    loadSavedSession();
  }, [user, persistence]);


  const handleRestoreSession = (source: 'local' | 'cloud') => {
    const session = source === 'local' ? localSessionToRestore : cloudSessionToRestore;
    if (!session) return;

    setSongs(session.songs as any);
    setCorpusType(session.corpusType);
    setCurrentIndex(session.currentIndex);
    setSessionStartTime(session.startedAt);
    
    toast.success('Sessão restaurada com sucesso!');
  };

  const handleDiscardSession = () => {
    persistence.clearSession();
    broadcastSessionClear();
    toast.success('Sessão descartada');
  };

  // Load corpus
  const loadCorpus = async () => {
    setIsLoading(true);
    try {
      const corpus = await loadFullTextCorpus(corpusType);
      const enrichedSongs: EnrichedSongData[] = corpus.musicas.map(m => ({
        ...m.metadata,
        letra: m.letra,
        status: 'pending'
      }));
      
      setSongs(enrichedSongs);
      toast.success(`${corpus.totalMusicas} músicas carregadas`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar corpus');
    } finally {
      setIsLoading(false);
    }
  };

  // Enrich single song
  const enrichSong = async (song: EnrichedSongData, index: number): Promise<void> => {
    setSongs(prev => prev.map((s, i) => 
      i === index ? { ...s, status: 'enriching' as const } : s
    ));

    try {
      const hasInversion = song.artista && song.musica && 
        (song.artista.split(' ').length <= 3 && song.musica.split(' ').length > 5);

      const { data, error } = await supabase.functions.invoke('enrich-corpus-metadata', {
        body: {
          artista: song.artista,
          musica: song.musica,
          album: song.album,
          ano: song.ano,
          corpusType: corpusType,
          lyricsPreview: song.letra?.slice(0, 300)
        }
      });

      if (error) throw error;

      setSongs(prev => {
        const newSongs = prev.map((s, i) => 
          i === index ? { 
            ...s, 
            status: 'pending' as const, 
            sugestao: data 
          } : s
        );
        
        // FASE 3.1: Removido setTimeout bloqueante
        
        return newSongs;
      });

      // Auto-validate high confidence results
      if (data.confianca >= 90) {
        validateSong(index, true);
      }

    } catch (error: any) {
      console.error(`Erro ao enriquecer "${song.musica}":`, error);
      setSongs(prev => prev.map((s, i) => 
        i === index ? { ...s, status: 'error' as const } : s
      ));
    }
  };

  // Retry logic with exponential backoff
  const enrichSongWithRetry = async (
    song: EnrichedSongData, 
    index: number, 
    maxRetries = 3
  ): Promise<void> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await enrichSong(song, index);
        return; // Success!
      } catch (error: any) {
        lastError = error;
        
        // Retry on rate limit (429) or server error (5xx)
        if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(`⚠️ Retry ${attempt}/${maxRetries} após ${backoffMs}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          throw error; // Non-recoverable error
        }
      }
    }
    
    throw lastError; // All retries failed
  };

  // Batch enrichment com salvamento periódico inteligente (FASE 3.1)
  const startEnrichment = async () => {
    setIsEnriching(true);
    setIsPaused(false);
    
    const startIdx = currentIndex;
    const startTime = Date.now();
    const processedTimes: number[] = [];
    let songsSinceLastSave = 0;
    const SAVE_INTERVAL = 5; // Salvar a cada 5 músicas
    
    for (let i = startIdx; i < songs.length && !isPaused; i++) {
      if (songs[i].status === 'pending' && !songs[i].sugestao) {
        setCurrentIndex(i);
        
        const songStartTime = Date.now();
        await enrichSongWithRetry(songs[i], i);
        const songTime = Date.now() - songStartTime;
        processedTimes.push(songTime);
        
        songsSinceLastSave++;
        
        // Salvamento periódico (não-bloqueante)
        if (songsSinceLastSave >= SAVE_INTERVAL) {
          saveCurrentSession(); // Sem await!
          songsSinceLastSave = 0;
          logger.info(`💾 Checkpoint: salvamento periódico (a cada ${SAVE_INTERVAL} músicas)`);
        }
        
        // Calculate metrics
        const elapsed = Date.now() - startTime;
        const processed = processedTimes.length;
        const avgTime = elapsed / processed;
        const remaining = songs.filter((s, idx) => idx > i && s.status === 'pending' && !s.sugestao).length;
        const eta = avgTime * remaining;
        
        setAvgTimePerSong(avgTime);
        setEstimatedTimeRemaining(eta);
        setProgress(((i + 1) / songs.length) * 100);
        
        const totalTime = processedTimes.reduce((sum, t) => sum + t, 0);
        setAvgProcessingTime(totalTime / processedTimes.length);
        
        // Rate limiting: 5 req/s (200ms delay)
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Salvamento final (bloqueante)
    await saveCurrentSession();
    logger.success('💾 Salvamento final concluído');
    
    setIsEnriching(false);
    toast.success('Enriquecimento concluído!');
  };

  const pauseEnrichment = async () => {
    setIsPaused(true);
    setIsEnriching(false);
    // FASE 3.1: Salvar ao pausar (bloqueante)
    await saveCurrentSession();
    logger.success('💾 Sessão salva ao pausar');
  };

  const validateSong = (index: number, accept: boolean) => {
    setSongs(prev => prev.map((s, i) => {
      if (i !== index) return s;
      
      if (accept && s.sugestao && s.sugestao.fonte !== 'not-found') {
        return {
          ...s,
          compositor: s.compositorEditado || s.sugestao.compositor,
          album: s.sugestao.album || s.album,
          ano: s.sugestao.ano || s.ano,
          fonte: s.compositorEditado ? 'manual' as const : s.sugestao.fonte as ('musicbrainz' | 'ai-inferred'),
          fonteValidada: s.sugestao.fonte,
          status: 'validated' as const
        };
      }
      
      return { ...s, status: 'rejected' as const };
    }));
    // FASE 3.1: Removido setTimeout bloqueante
  };

  const editComposer = (index: number, value: string) => {
    setSongs(prev => prev.map((s, i) => 
      i === index ? { ...s, compositorEditado: value } : s
    ));
  };

  // Utility function for confidence badges
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) {
      return {
        className: 'bg-green-600 hover:bg-green-700 text-white',
        icon: '✓',
        label: 'Alta'
      };
    } else if (confidence >= 70) {
      return {
        className: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        icon: '⚠',
        label: 'Média'
      };
    } else {
      return {
        className: 'bg-red-600 hover:bg-red-700 text-white',
        icon: '⚠',
        label: 'Baixa'
      };
    }
  };

  // Export validated data
  const exportCSV = () => {
    const validatedSongs = songs.filter(s => s.status === 'validated');
    
    if (validatedSongs.length === 0) {
      toast.error('Nenhuma música validada para exportar');
      return;
    }

    const csv = [
      'artista,compositor,album,musica,ano,fonte,confianca',
      ...validatedSongs.map(s => 
        `"${s.artista}","${s.compositor || ''}","${s.album}","${s.musica}","${s.ano || ''}","${s.fonte || ''}","${s.sugestao?.confianca || 0}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metadata-enriched-${corpusType}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success(`${validatedSongs.length} músicas exportadas`);
  };

  // Export full report (CSV + Metrics JSON)
  const exportFullReport = () => {
    const validatedSongs = songs.filter(s => s.status === 'validated');
    
    if (validatedSongs.length === 0) {
      toast.error('Nenhuma música validada para exportar');
      return;
    }

    // Generate CSV with additional metrics
    const csv = [
      'artista,compositor,musica,album,ano,fonte,confianca,fonte_validada',
      ...validatedSongs.map(s => 
        `"${s.artista}","${s.compositor || ''}","${s.musica}","${s.album}","${s.ano || ''}","${s.sugestao?.fonte || ''}","${s.sugestao?.confianca || 0}","${s.fonteValidada || ''}"`
      )
    ].join('\n');

    // Generate metrics report in JSON format
    const enrichedSongs = songs.filter(s => s.sugestao);
    const metrics = {
      summary: {
        total_songs: songs.length,
        validated: validatedSongs.length,
        validation_rate: ((validatedSongs.length / songs.length) * 100).toFixed(2) + '%'
      },
      sources: {
        musicbrainz: enrichedSongs.filter(s => s.sugestao?.fonte === 'musicbrainz').length,
        gemini: enrichedSongs.filter(s => s.sugestao?.fonte === 'ai-inferred').length,
        not_found: enrichedSongs.filter(s => s.sugestao?.fonte === 'not-found').length
      },
      confidence: {
        average: (enrichedSongs.reduce((sum, s) => sum + s.sugestao!.confianca, 0) / enrichedSongs.length).toFixed(2),
        high: enrichedSongs.filter(s => s.sugestao!.confianca >= 85).length,
        medium: enrichedSongs.filter(s => s.sugestao!.confianca >= 70 && s.sugestao!.confianca < 85).length,
        low: enrichedSongs.filter(s => s.sugestao!.confianca < 70).length
      },
      performance: {
        avg_time_per_song_ms: avgProcessingTime
      },
      generated_at: new Date().toISOString()
    };

    const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const jsonBlob = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
    
    const csvUrl = URL.createObjectURL(csvBlob);
    const jsonUrl = URL.createObjectURL(jsonBlob);
    
    const date = new Date().toISOString().split('T')[0];
    
    // Download CSV
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `metadata-enriched-${corpusType}-${date}.csv`;
    csvLink.click();
    
    // Download Metrics JSON
    setTimeout(() => {
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `metrics-${corpusType}-${date}.json`;
      jsonLink.click();
    }, 100);
    
    toast.success(`Relatório completo exportado: ${validatedSongs.length} músicas + métricas`);
  };

  const stats = {
    total: songs.length,
    pending: songs.filter(s => s.status === 'pending' && !s.sugestao).length,
    enriched: songs.filter(s => s.sugestao).length,
    validated: songs.filter(s => s.status === 'validated').length,
    rejected: songs.filter(s => s.status === 'rejected').length
  };

  return (
    <>
      <SessionRestoreDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        localSession={localSessionToRestore}
        cloudSession={cloudSessionToRestore}
        onRestore={handleRestoreSession}
        onDiscard={handleDiscardSession}
      />

      <Tabs defaultValue="enrich" className="space-y-6">
        <TabsList>
          <TabsTrigger value="enrich">
            <Sparkles className="h-4 w-4 mr-2" />
            Enriquecimento
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="roadmap">
            <Lightbulb className="h-4 w-4 mr-2" />
            Roadmap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrich" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Sistema de Enriquecimento de Metadados
                  </CardTitle>
                  <CardDescription>
                    Enriqueça automaticamente os metadados do corpus com MusicBrainz API + Lovable AI
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <SaveIndicator {...saveStatus} />
                </div>
              </div>
            </CardHeader>
        <CardContent className="space-y-4">
          {/* Corpus Selector */}
          <div className="flex gap-2">
            <Button
              variant={corpusType === 'gaucho' ? 'default' : 'outline'}
              onClick={() => setCorpusType('gaucho')}
            >
              🎸 Gaúcho
            </Button>
            <Button
              variant={corpusType === 'nordestino' ? 'default' : 'outline'}
              onClick={() => setCorpusType('nordestino')}
            >
              🪘 Nordestino
            </Button>
            <Button onClick={loadCorpus} disabled={isLoading} variant="secondary">
              {isLoading ? 'Carregando...' : 'Carregar Corpus'}
            </Button>
          </div>

          {/* Stats */}
          {songs.length > 0 && (
            <>
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-2 bg-secondary/20 rounded">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-2 bg-secondary/20 rounded">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground">Pendentes</div>
                </div>
                <div className="text-center p-2 bg-secondary/20 rounded">
                  <div className="text-2xl font-bold text-blue-600">{stats.enriched}</div>
                  <div className="text-xs text-muted-foreground">Enriquecidas</div>
                </div>
                <div className="text-center p-2 bg-secondary/20 rounded">
                  <div className="text-2xl font-bold text-green-600">{stats.validated}</div>
                  <div className="text-xs text-muted-foreground">Validadas</div>
                </div>
                <div className="text-center p-2 bg-secondary/20 rounded">
                  <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                  <div className="text-xs text-muted-foreground">Rejeitadas</div>
                </div>
              </div>

              {/* Dashboard de Métricas */}
              <EnrichmentMetrics 
                songs={songs} 
                avgProcessingTime={avgProcessingTime} 
              />
            </>
          )}

          {/* Controls */}
          {songs.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {!isEnriching ? (
                <Button onClick={startEnrichment} disabled={stats.pending === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Enriquecimento
                </Button>
              ) : (
                <Button onClick={pauseEnrichment} variant="destructive">
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
              )}
              
              <Button 
                onClick={exportCSV} 
                variant="secondary"
                disabled={stats.validated === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV ({stats.validated})
              </Button>

              <Button 
                onClick={exportFullReport} 
                variant="secondary"
                disabled={stats.validated === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório Completo
              </Button>
            </div>
          )}

          {/* Progress */}
          {isEnriching && (
            <div className="space-y-2">
              <Progress value={progress} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processando: {currentIndex + 1} / {songs.length}</span>
                <span>
                  Tempo médio: {(avgTimePerSong / 1000).toFixed(1)}s/música
                </span>
                <span>
                  ETA: {Math.ceil(estimatedTimeRemaining / 1000)}s
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Songs List */}
      {songs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {viewMode === 'validation-queue' 
                  ? `Fila de Validação (${displaySongs.length})` 
                  : `Todas as Músicas (${songs.length})`}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={viewMode === 'validation-queue' ? 'default' : 'outline'}
                  onClick={() => setViewMode('validation-queue')}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Fila de Validação ({songs.filter(s => s.sugestao && s.status !== 'validated' && s.status !== 'rejected' && s.status !== 'pending' && s.status !== 'enriching').length})
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'all' ? 'default' : 'outline'}
                  onClick={() => setViewMode('all')}
                >
                  Ver Todas ({songs.length})
                </Button>
                <Button
                  size="sm"
                  variant={confidenceFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setConfidenceFilter('all')}
                >
                  Todas
                </Button>
                <Button
                  size="sm"
                  variant={confidenceFilter === 'high' ? 'default' : 'outline'}
                  onClick={() => setConfidenceFilter('high')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Alta (≥85%)
                </Button>
                <Button
                  size="sm"
                  variant={confidenceFilter === 'medium' ? 'default' : 'outline'}
                  onClick={() => setConfidenceFilter('medium')}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Média (70-85%)
                </Button>
                <Button
                  size="sm"
                  variant={confidenceFilter === 'low' ? 'default' : 'outline'}
                  onClick={() => setConfidenceFilter('low')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Baixa (&lt;70%)
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {displaySongs.length === 0 && viewMode === 'validation-queue' ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
                        <Check className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Fila de Validação Vazia</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Todas as músicas enriquecidas foram validadas ou rejeitadas.
                        {stats.pending > 0 && (
                          <span className="block mt-2">
                            Ainda há {stats.pending} música(s) aguardando enriquecimento.
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setViewMode('all')}
                    >
                      Ver Todas as Músicas
                    </Button>
                  </div>
                ) : (
                  displaySongs
                  .filter(song => {
                    if (confidenceFilter === 'all') return true;
                    if (!song.sugestao) return false;
                    const conf = song.sugestao.confianca;
                    if (confidenceFilter === 'high') return conf >= 85;
                    if (confidenceFilter === 'medium') return conf >= 70 && conf < 85;
                    if (confidenceFilter === 'low') return conf < 70;
                    return true;
                  })
                  .map((song, index) => (
                  <div 
                    key={index}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    {/* Original Data */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold">{song.musica}</div>
                        <div className="text-sm text-muted-foreground">
                          {song.artista} {song.album && `- ${song.album}`}
                        </div>
                        {song.ano && (
                          <div className="text-xs text-muted-foreground">Ano: {song.ano}</div>
                        )}
                      </div>
                      
                      <Badge variant={
                        song.status === 'validated' ? 'default' :
                        song.status === 'rejected' ? 'destructive' :
                        song.status === 'enriching' ? 'secondary' :
                        'outline'
                      }>
                        {song.status}
                      </Badge>
                    </div>

                    {/* Suggestion */}
                    {song.sugestao && song.status !== 'validated' && song.status !== 'rejected' && (
                      <div className={`p-3 rounded space-y-2 ${
                        song.sugestao.confianca < 70 
                          ? 'bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-700' 
                          : 'bg-blue-50 dark:bg-blue-950/20'
                      }`}>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {song.sugestao.fonte === 'musicbrainz' ? (
                            <Database className="h-4 w-4" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          <span>Sugestão</span>
                          <Badge className={getConfidenceBadge(song.sugestao.confianca).className}>
                            {getConfidenceBadge(song.sugestao.confianca).icon} {song.sugestao.confianca}% - {getConfidenceBadge(song.sugestao.confianca).label}
                          </Badge>
                        </div>
                        
                        {song.sugestao.compositor && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Compositor:</span>
                            <Input
                              value={song.compositorEditado ?? song.sugestao.compositor}
                              onChange={(e) => editComposer(index, e.target.value)}
                              className="h-8 flex-1"
                            />
                          </div>
                        )}
                        
                        {song.sugestao.detalhes && (
                          <div className="text-xs text-muted-foreground">
                            {song.sugestao.detalhes}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => validateSong(index, true)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Validar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => validateSong(index, false)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Validated Data */}
                    {song.status === 'validated' && song.compositor && (
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded">
                        <div className="text-sm">
                          <span className="font-medium">✓ Compositor:</span> {song.compositor}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Fonte: {song.fonteValidada || 'manual'}
                        </div>
                      </div>
                    )}
                  </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="history">
          <SessionHistoryTab onRestore={async (sessionId) => {
            const session = await loadSessionFromCloud(sessionId);
            if (session) {
              setSongs(session.songs as any);
              setCorpusType(session.corpusType);
              setCurrentIndex(session.currentIndex);
              toast.success('Sessão restaurada do histórico!');
            }
          }} />
        </TabsContent>

        <TabsContent value="roadmap">
          <RoadmapTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
