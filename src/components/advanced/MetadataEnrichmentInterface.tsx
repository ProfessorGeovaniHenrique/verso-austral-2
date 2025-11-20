import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Play, Pause, Check, X, Edit2, Sparkles, Database, History, HardDrive, Wifi, WifiOff, Lightbulb, TrendingUp, Clock, Zap } from 'lucide-react';
import { loadFullTextCorpus } from '@/lib/fullTextParser';
import type { CorpusType } from '@/data/types/corpus-tools.types';
import type { SongMetadata } from '@/data/types/full-text-corpus.types';
import { EnrichmentMetrics } from './EnrichmentMetrics';
import { SaveIndicator } from '@/components/ui/save-indicator';
import { StorageSourceBadge, type StorageSource } from '@/components/ui/storage-source-badge';
import { SessionRestoreDialog } from './SessionRestoreDialog';
import { SessionHistoryTab } from './SessionHistoryTab';
import { RoadmapTab } from './RoadmapTab';
import { MetadataQualityDashboard } from './MetadataQualityDashboard';
import { BatchEnrichmentPanel } from './BatchEnrichmentPanel';
import { VirtualizedSongList } from './VirtualizedSongList';
import { useEnrichmentPersistence } from '@/hooks/useEnrichmentPersistence';
import { useMultiTabSync } from '@/hooks/useMultiTabSync';
import { useSaveIndicator } from '@/hooks/useSaveIndicator';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { EnrichmentSession, validateEnrichmentSession } from '@/lib/enrichmentSchemas';
import { saveSessionToCloud, loadSessionFromCloud, resolveConflict } from '@/services/enrichmentPersistence';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { fetchWithTimeoutRetry } from '@/lib/fetch';
import { debounce } from '@/lib/performanceUtils';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EnrichedSongData extends SongMetadata {
  status: 'pending' | 'enriching' | 'enriched' | 'validated' | 'rejected' | 'error' | 'applied';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'enriched' | 'validated' | 'applied' | 'rejected'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [massActionDialog, setMassActionDialog] = useState<{
    open: boolean;
    action: 'validate-high' | 'validate-all' | 'reject-all';
    count: number;
    indices: number[];
  } | null>(null);
  
  // Estados de persistência
  const [cloudSessionId, setCloudSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string>(new Date().toISOString());
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [hasAttemptedRestore, setHasAttemptedRestore] = useState(false); // FASE 1: Guard para evitar loop
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null); // FASE 4: Role do usuário
  const [isCheckingRole, setIsCheckingRole] = useState(false); // FASE 4: Loading state
  const [localSessionToRestore, setLocalSessionToRestore] = useState<EnrichmentSession | null>(null);
  const [cloudSessionToRestore, setCloudSessionToRestore] = useState<EnrichmentSession | null>(null);
  
  // FASE 2: Estados do fine-tuning de carregamento
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionLoadSource, setSessionLoadSource] = useState<StorageSource>(null);
  
  // FASES DO FINE-TUNING COMPLETO
  // Fase 2: Seletor de quantidade e ordenação
  const [quantityToEnrich, setQuantityToEnrich] = useState(20);
  const [sortBy, setSortBy] = useState<'sequential' | 'alphabetical' | 'missing-composer' | 'random'>('sequential');
  
  // Fase 3: Aplicação ao corpus
  const [isApplying, setIsApplying] = useState(false);
  
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

  // Calculate status counts
  const statusCounts = useMemo(() => ({
    all: songs.length,
    pending: songs.filter(s => s.status === 'pending').length,
    enriched: songs.filter(s => s.sugestao && s.status !== 'validated' && s.status !== 'rejected' && s.status !== 'pending' && s.status !== 'applied').length,
    validated: songs.filter(s => s.status === 'validated').length,
    applied: songs.filter(s => s.status === 'applied').length,
    rejected: songs.filter(s => s.status === 'rejected').length,
  }), [songs]);

  // Filter songs based on status and confidence
  const displaySongs = useMemo(() => {
    let filtered = songs;
    
    // Filter by status
    if (statusFilter === 'pending') {
      filtered = filtered.filter(s => s.status === 'pending');
    } else if (statusFilter === 'enriched') {
      filtered = filtered.filter(s => s.sugestao && s.status !== 'validated' && s.status !== 'rejected' && s.status !== 'pending' && s.status !== 'applied');
    } else if (statusFilter === 'validated') {
      filtered = filtered.filter(s => s.status === 'validated');
    } else if (statusFilter === 'applied') {
      filtered = filtered.filter(s => s.status === 'applied');
    } else if (statusFilter === 'rejected') {
      filtered = filtered.filter(s => s.status === 'rejected');
    }
    
    // Apply confidence filter (not applicable for pending)
    if (confidenceFilter !== 'all' && statusFilter !== 'pending') {
      filtered = filtered.filter(song => {
        const confidence = song.sugestao?.confianca || 0;
        if (confidenceFilter === 'high') return confidence >= 0.85;
        if (confidenceFilter === 'medium') return confidence >= 0.70 && confidence < 0.85;
        if (confidenceFilter === 'low') return confidence < 0.70;
        return true;
      });
    }
    
    return filtered;
  }, [songs, statusFilter, confidenceFilter]);

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
   * FASE 4: Debounced para evitar salvamentos excessivos
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

  // FASE 4: Versão debounced do saveCurrentSession (5s de delay)
  const debouncedSave = useMemo(
    () => debounce(saveCurrentSession, 5000),
    [saveCurrentSession]
  );

  // Carregar sessão ao montar (FASE 1: Com guard para evitar loop)
  useEffect(() => {
    // ✅ Guard: executar apenas uma vez
    if (hasAttemptedRestore) return;

    const loadSavedSession = async () => {
      try {
        const localSession = persistence.loadSession();
        const cloudSession = user ? await loadSessionFromCloud() : null;

        if (localSession || cloudSession) {
          setLocalSessionToRestore(localSession);
          setCloudSessionToRestore(cloudSession);
          setShowRestoreDialog(true);
        }
      } finally {
        setHasAttemptedRestore(true); // ✅ Marcar como executado
      }
    };

    loadSavedSession();
  }, [user]); // ✅ Remover 'persistence' das dependências

  // FASE 4: Verificar role do usuário
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setUserRole(null);
        return;
      }
      
      setIsCheckingRole(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle(); // ✅ maybeSingle() para evitar erro se não existir
        
        if (error) {
          logger.warn('⚠️ Erro ao buscar role', { error: error.message, code: error.code });
          setUserRole('user'); // ✅ Fallback seguro
          return;
        }
        
        setUserRole(data?.role === 'admin' ? 'admin' : 'user');
        logger.info(`👤 User role: ${data?.role || 'user'}`);
      } catch (err) {
        logger.error('❌ Erro ao verificar role:', err);
        setUserRole('user');
      } finally {
        setIsCheckingRole(false);
      }
    };
    
    checkUserRole();
  }, [user]);


  const handleRestoreSession = (source: 'local' | 'cloud') => {
    const session = source === 'local' ? localSessionToRestore : cloudSessionToRestore;
    if (!session) return;

    setSongs(session.songs as any);
    setCorpusType(session.corpusType);
    setCurrentIndex(session.currentIndex);
    setSessionStartTime(session.startedAt);
    
    // ✅ CRÍTICO: Limpar storage APÓS restaurar dados
    persistence.clearSession();
    setLocalSessionToRestore(null);
    setCloudSessionToRestore(null);
    setShowRestoreDialog(false);
    
    toast.success('Sessão restaurada com sucesso!');
  };

  const handleDiscardSession = () => {
    persistence.clearSession();
    setLocalSessionToRestore(null);
    setCloudSessionToRestore(null);
    setShowRestoreDialog(false); // FASE 3: Fechar dialog
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

      // ✅ USAR FETCH COM TIMEOUT + RETRY
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetchWithTimeoutRetry(
        `${supabaseUrl}/functions/v1/enrich-corpus-metadata`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            artista: song.artista,
            musica: song.musica,
            album: song.album,
            ano: song.ano,
            corpusType: corpusType,
            lyricsPreview: song.letra?.slice(0, 300)
          })
        },
        45_000, // 45s timeout
        2       // 2 retries
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // FASE 1: Status correto + auto-validação atômica
      setSongs(prev => prev.map((s, i) => {
        if (i !== index) return s;
        
        // Auto-validar se alta confiança (≥90%) e não é not-found
        if (data.confianca >= 90 && data.fonte !== 'not-found') {
          return {
            ...s,
            status: 'validated' as const,
            compositor: data.compositor || s.compositor,
            album: data.album || s.album,
            ano: data.ano || s.ano,
            fonte: data.fonte,
            fonteValidada: data.fonte,
            sugestao: data
          };
        }
        
        // Senão, marcar como enriched (aguardando validação manual)
        return { 
          ...s, 
          status: 'enriched' as const, 
          sugestao: data 
        };
      }));

    } catch (error: any) {
      console.error(`Erro ao enriquecer "${song.musica}":`, error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setSongs(prev => prev.map((s, i) => 
        i === index ? { 
          ...s, 
          status: 'error' as const,
          sugestao: {
            fonte: 'not-found' as const,
            confianca: 0,
            detalhes: errorMessage
          }
        } : s
      ));
      
      toast.error(`Erro: ${song.musica}`, { 
        description: errorMessage.includes('timeout') 
          ? 'Timeout - tente novamente' 
          : errorMessage
      });
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

  // FASE 1: Processamento Concorrente (5x mais rápido)
  const startEnrichment = async () => {
    setIsEnriching(true);
    setIsPaused(false);
    
    const startTime = Date.now();
    const processedTimes: number[] = [];
    let songsSinceLastSave = 0;
    const SAVE_INTERVAL = 5;
    const BATCH_SIZE = 5; // Processar 5 músicas em paralelo
    
    // FASE 2: Obter músicas para enriquecer baseado na quantidade e ordenação
    const songsToEnrich = getSongsToEnrich();
    
    // Processar em batches paralelos
    for (let i = 0; i < songsToEnrich.length && !isPaused; i += BATCH_SIZE) {
      const batch = songsToEnrich.slice(i, i + BATCH_SIZE);
      const batchStartTime = Date.now();
      
      // Processar batch em paralelo
      await Promise.all(
        batch.map((song, batchIdx) => {
          const globalIdx = songs.findIndex(s => s.artista === song.artista && s.musica === song.musica);
          setCurrentIndex(globalIdx);
          return enrichSongWithRetry(song, globalIdx);
        })
      );
      
      const batchTime = Date.now() - batchStartTime;
      processedTimes.push(batchTime / batch.length); // Tempo médio por música no batch
      
      songsSinceLastSave += batch.length;
      
      // Salvamento periódico (FASE 4: debounced)
      if (songsSinceLastSave >= SAVE_INTERVAL) {
        debouncedSave();
        songsSinceLastSave = 0;
        logger.info(`💾 Checkpoint: ${i + batch.length}/${songsToEnrich.length} músicas processadas`);
      }
      
      // Atualizar métricas
      const elapsed = Date.now() - startTime;
      const processed = i + batch.length;
      const avgTime = elapsed / processed;
      const remaining = songsToEnrich.length - processed;
      const eta = (avgTime * remaining) / BATCH_SIZE; // Ajustado para paralelismo
      
      setAvgTimePerSong(avgTime);
      setEstimatedTimeRemaining(eta);
      setProgress((processed / songsToEnrich.length) * 100);
      
      const totalTime = processedTimes.reduce((sum, t) => sum + t, 0);
      setAvgProcessingTime(totalTime / processedTimes.length);
    }
    
    await saveCurrentSession();
    logger.success('💾 Enriquecimento concluído e salvo');
    
    setIsEnriching(false);
    toast.success(`${songsToEnrich.length} músicas enriquecidas em ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
  };
  
  // FASE 2: Função para obter músicas a enriquecer baseado na quantidade e ordenação
  const getSongsToEnrich = useCallback(() => {
    let filtered = songs.filter(s => s.status === 'pending' && !s.sugestao);
    
    // Aplicar ordenação
    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => a.musica.localeCompare(b.musica));
        break;
      case 'missing-composer':
        filtered.sort((a, b) => {
          const aHasComposer = !!a.compositor;
          const bHasComposer = !!b.compositor;
          if (aHasComposer === bHasComposer) return 0;
          return aHasComposer ? 1 : -1;
        });
        break;
      case 'random':
        filtered = filtered.sort(() => Math.random() - 0.5);
        break;
      // 'sequential' é o padrão (sem ordenação adicional)
    }
    
    return filtered.slice(0, quantityToEnrich);
  }, [songs, sortBy, quantityToEnrich]);

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
  };

  // MASS VALIDATION FUNCTIONS
  const validateMultipleSongs = useCallback((indices: number[], accept: boolean) => {
    setSongs(prev => prev.map((song, i) => {
      if (!indices.includes(i)) return song;
      
      if (accept && song.sugestao && song.sugestao.fonte !== 'not-found') {
        return {
          ...song,
          compositor: song.compositorEditado || song.sugestao.compositor,
          album: song.sugestao.album || song.album,
          ano: song.sugestao.ano || song.ano,
          fonte: song.compositorEditado ? 'manual' as const : song.sugestao.fonte as ('musicbrainz' | 'ai-inferred'),
          fonteValidada: song.sugestao.fonte,
          status: 'validated' as const
        };
      }
      
      return { ...song, status: 'rejected' as const };
    }));
    
    toast.success(`${indices.length} músicas ${accept ? 'validadas' : 'rejeitadas'} com sucesso!`);
    debouncedSave(); // FASE 4: debounced save
  }, [debouncedSave]);

  const validateAllHighConfidence = useCallback(() => {
    const highConfidenceIndices = songs
      .map((song, index) => ({ song, index }))
      .filter(({ song }) => 
        song.sugestao && 
        song.sugestao.confianca >= 85 &&
        song.status !== 'validated' &&
        song.status !== 'rejected' &&
        song.status !== 'applied'
      )
      .map(({ index }) => index);
    
    if (highConfidenceIndices.length === 0) {
      toast.info('Nenhuma música com alta confiança para validar');
      return;
    }
    
    setMassActionDialog({
      open: true,
      action: 'validate-high',
      count: highConfidenceIndices.length,
      indices: highConfidenceIndices
    });
  }, [songs]);

  const validateAllFiltered = useCallback(() => {
    const validatableIndices = displaySongs
      .map(song => songs.indexOf(song))
      .filter(index => {
        const song = songs[index];
        return song.sugestao && 
               song.status !== 'validated' && 
               song.status !== 'rejected' &&
               song.status !== 'applied';
      });
    
    if (validatableIndices.length === 0) {
      toast.info('Nenhuma música disponível para validar');
      return;
    }
    
    setMassActionDialog({
      open: true,
      action: 'validate-all',
      count: validatableIndices.length,
      indices: validatableIndices
    });
  }, [songs, displaySongs]);

  const rejectAllFiltered = useCallback(() => {
    const rejectableIndices = displaySongs
      .map(song => songs.indexOf(song))
      .filter(index => {
        const song = songs[index];
        return song.sugestao && 
               song.status !== 'validated' && 
               song.status !== 'rejected' &&
               song.status !== 'applied';
      });
    
    if (rejectableIndices.length === 0) {
      toast.info('Nenhuma música disponível para rejeitar');
      return;
    }
    
    setMassActionDialog({
      open: true,
      action: 'reject-all',
      count: rejectableIndices.length,
      indices: rejectableIndices
    });
  }, [songs, displaySongs]);

  const confirmMassAction = useCallback(() => {
    if (!massActionDialog) return;
    
    const { action, indices } = massActionDialog;
    
    switch (action) {
      case 'validate-high':
      case 'validate-all':
        validateMultipleSongs(indices, true);
        break;
      case 'reject-all':
        validateMultipleSongs(indices, false);
        break;
    }
    
    setMassActionDialog(null);
  }, [massActionDialog, validateMultipleSongs]);
  
  // FASE 3: Aplicar metadados ao corpus
  const applyToCorpus = async () => {
    if (!user) {
      toast.error('Você precisa estar autenticado');
      return;
    }
    
    const validatedSongs = songs.filter(s => s.status === 'validated');
    
    if (validatedSongs.length === 0) {
      toast.error('Nenhuma música validada para aplicar');
      return;
    }
    
    setShowApplyDialog(true);
  };
  
  const confirmApplyToCorpus = async () => {
    setShowApplyDialog(false);
    setIsApplying(true);
    
    const validatedSongs = songs.filter(s => s.status === 'validated');
    
    try {
      logger.info(`🎯 Aplicando ${validatedSongs.length} metadados ao corpus ${corpusType}`);
      
      const { data, error } = await supabase.functions.invoke('apply-corpus-metadata', {
        body: {
          corpusType,
          validatedSongs: validatedSongs.map(s => ({
            artista: s.artista,
            musica: s.musica,
            compositor: s.compositor,
            album: s.album,
            ano: s.ano,
            letra: s.letra,
          })),
          createBackup: true,
        },
      });
      
      if (error) throw error;
      
      logger.success(`✅ ${data.songsUpdated} metadados aplicados com sucesso!`);
      
      // Baixar o corpus atualizado
      const blob = new Blob([data.updatedContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${corpusType}-completo-ATUALIZADO.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Marcar músicas como aplicadas e remover da fila
      setSongs(prev => prev.map(s => 
        s.status === 'validated' 
          ? { ...s, status: 'applied' as const }
          : s
      ));
      
      // Salvar sessão atualizada
      await saveCurrentSession();
      
      toast.success(
        `✅ ${data.songsUpdated} metadados aplicados ao corpus!\n` +
        `${data.backupCreated ? '💾 Backup criado automaticamente\n' : ''}` +
        `📥 Arquivo atualizado baixado`
      );
      
    } catch (error) {
      logger.error('❌ Erro ao aplicar metadados:', error);
      toast.error('Erro ao aplicar metadados ao corpus');
    } finally {
      setIsApplying(false);
    }
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

      <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar Metadados ao Corpus?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a atualizar <strong>{songs.filter(s => s.status === 'validated').length} músicas</strong> no corpus <strong>{corpusType}</strong>.
              <br /><br />
              <strong>✅ Um backup automático será criado antes da aplicação.</strong>
              <br />
              • Músicas validadas serão marcadas como "aplicadas"
              <br />
              • O arquivo atualizado será baixado automaticamente
              <br />
              • Esta ação não pode ser desfeita (mas pode ser revertida via backup)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyToCorpus}>
              Aplicar Metadados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="enrich" className="space-y-6">
        <TabsList>
          <TabsTrigger value="enrich">
            <Sparkles className="h-4 w-4 mr-2" />
            Enriquecimento
          </TabsTrigger>
          <TabsTrigger value="batch">
            <Zap className="h-4 w-4 mr-2" />
            Batch Automático
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <TrendingUp className="h-4 w-4 mr-2" />
            Análise
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
          
          {/* FASE 2: Seletor de Quantidade e Ordenação */}
          {songs.length > 0 && stats.pending > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/10 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantidade a Enriquecer</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={stats.pending}
                    value={quantityToEnrich}
                    onChange={(e) => setQuantityToEnrich(Math.min(stats.pending, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-24"
                  />
                  <Badge variant="outline" className="self-center">
                    de {stats.pending} pendentes
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Ordenação</label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequencial</SelectItem>
                    <SelectItem value="alphabetical">Alfabética</SelectItem>
                    <SelectItem value="missing-composer">Sem Compositor Primeiro</SelectItem>
                    <SelectItem value="random">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Stats */}
          {songs.length > 0 && (
            <>
              <div className="grid grid-cols-6 gap-2">
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
                <div className="text-center p-2 bg-secondary/20 rounded">
                  <div className="text-2xl font-bold text-purple-600">{songs.filter(s => s.status === 'applied').length}</div>
                  <div className="text-xs text-muted-foreground">Aplicadas</div>
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
                  Iniciar Enriquecimento ({Math.min(quantityToEnrich, stats.pending)})
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
              
              {/* FASE 4: Botão Aplicar ao Corpus (com validação de role) */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={applyToCorpus} 
                  variant="default"
                  disabled={stats.validated === 0 || isApplying || userRole !== 'admin'}
                  className={userRole === 'admin' 
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    : "opacity-50 cursor-not-allowed"
                  }
                >
                  {isApplying ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Aplicar ao Corpus ({stats.validated})
                    </>
                  )}
                </Button>
                
                {/* ✅ Feedback visual para não-admins */}
                {userRole !== 'admin' && stats.validated > 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    <span>⚠️</span>
                    Apenas administradores podem aplicar metadados ao corpus. 
                    Use a exportação CSV para compartilhar seus dados validados.
                  </p>
                )}
              </div>
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
            <div className="flex items-center justify-between mb-4">
              <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    Todas
                    <Badge variant="secondary" className="ml-1">{statusCounts.all}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    Pendentes
                    <Badge variant="destructive" className="ml-1">{statusCounts.pending}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="enriched" className="flex items-center gap-2">
                    Aguardando
                    <Badge variant="outline" className="ml-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">{statusCounts.enriched}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="validated" className="flex items-center gap-2">
                    Validadas
                    <Badge variant="outline" className="ml-1 bg-green-500/20 text-green-700 dark:text-green-300">{statusCounts.validated}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="applied" className="flex items-center gap-2">
                    Aplicadas
                    <Badge variant="secondary" className="ml-1">{statusCounts.applied}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="flex items-center gap-2">
                    Rejeitadas
                    <Badge variant="outline" className="ml-1">{statusCounts.rejected}</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {statusFilter !== 'pending' && (
              <>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfidenceFilter('all')}
                    className={confidenceFilter === 'all' ? 'bg-accent' : ''}
                  >
                    Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfidenceFilter('high')}
                    className={confidenceFilter === 'high' ? 'bg-green-500/20' : ''}
                  >
                    Alta (≥85%)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfidenceFilter('medium')}
                    className={confidenceFilter === 'medium' ? 'bg-yellow-500/20' : ''}
                  >
                    Média (70-84%)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfidenceFilter('low')}
                    className={confidenceFilter === 'low' ? 'bg-red-500/20' : ''}
                  >
                    Baixa (&lt;70%)
                  </Button>
                </div>

                {/* Mass Actions Section - FASE 6: Botões sempre visíveis quando há músicas enriched */}
                {songs.some(s => s.status === 'enriched' && s.sugestao) && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Ações em Massa
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={validateAllHighConfidence}
                        disabled={isEnriching}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Validar Alta Confiança (≥85%)
                        <Badge variant="secondary" className="ml-2 bg-white/20">
                          {songs.filter(s => 
                            s.sugestao && 
                            s.sugestao.confianca >= 85 && 
                            s.status !== 'validated' && 
                            s.status !== 'rejected' &&
                            s.status !== 'applied'
                          ).length}
                        </Badge>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={validateAllFiltered}
                        disabled={isEnriching}
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Validar Todas Visíveis
                        <Badge variant="secondary" className="ml-2">
                          {displaySongs.filter(s => 
                            s.sugestao && 
                            s.status !== 'validated' && 
                            s.status !== 'rejected' &&
                            s.status !== 'applied'
                          ).length}
                        </Badge>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={rejectAllFiltered}
                        disabled={isEnriching}
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Rejeitar Todas Visíveis
                        <Badge variant="secondary" className="ml-2">
                          {displaySongs.filter(s => 
                            s.sugestao && 
                            s.status !== 'validated' && 
                            s.status !== 'rejected' &&
                            s.status !== 'applied'
                          ).length}
                        </Badge>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {displaySongs.length === 0 ? (
                  <div className="text-center py-12">
                    {statusFilter === 'pending' && (
                      <>
                        <p className="text-muted-foreground">Nenhuma música pendente</p>
                        <p className="text-sm text-muted-foreground/70">Todas já foram enriquecidas!</p>
                      </>
                    )}
                    {statusFilter === 'enriched' && (
                      <>
                        <p className="text-muted-foreground">Nenhuma música aguardando validação</p>
                        <p className="text-sm text-muted-foreground/70">Valide as sugestões para liberar aplicação</p>
                      </>
                    )}
                    {statusFilter === 'validated' && (
                      <>
                        <p className="text-muted-foreground">Nenhuma música validada</p>
                        <p className="text-sm text-muted-foreground/70">Valide algumas sugestões primeiro</p>
                      </>
                    )}
                    {statusFilter === 'applied' && (
                      <>
                        <p className="text-muted-foreground">Nenhuma música aplicada ainda</p>
                        <p className="text-sm text-muted-foreground/70">Use o botão "Aplicar ao Corpus" após validar</p>
                      </>
                    )}
                    {statusFilter === 'rejected' && (
                      <>
                        <p className="text-muted-foreground">Nenhuma música rejeitada</p>
                        <p className="text-sm text-muted-foreground/70">Sugestões ruins serão exibidas aqui</p>
                      </>
                    )}
                    {statusFilter === 'all' && (
                      <p className="text-muted-foreground">Nenhuma música encontrada</p>
                    )}
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

        <TabsContent value="batch">
          <BatchEnrichmentPanel corpusType={corpusType} />
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
      
      {/* Mass Action Confirmation Dialog */}
      <AlertDialog open={massActionDialog?.open ?? false} onOpenChange={(open) => !open && setMassActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {massActionDialog?.action === 'reject-all' ? 'Rejeitar Músicas em Massa?' : 'Validar Músicas em Massa?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {massActionDialog?.action === 'validate-high' && (
                <>
                  Você está prestes a <strong>validar {massActionDialog.count} músicas</strong> com alta confiança (≥85%).
                  <br /><br />
                  ✅ Todas as sugestões serão aplicadas automaticamente
                </>
              )}
              {massActionDialog?.action === 'validate-all' && (
                <>
                  Você está prestes a <strong>validar {massActionDialog.count} músicas visíveis</strong> na lista atual.
                  <br /><br />
                  ✅ Todas as sugestões serão aplicadas automaticamente
                </>
              )}
              {massActionDialog?.action === 'reject-all' && (
                <>
                  Você está prestes a <strong>rejeitar {massActionDialog.count} músicas visíveis</strong> na lista atual.
                  <br /><br />
                  ⚠️ Esta ação não pode ser desfeita facilmente
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmMassAction}
              className={massActionDialog?.action === 'reject-all' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {massActionDialog?.action === 'reject-all' ? 'Rejeitar Todas' : 'Validar Todas'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* FASE 3: AlertDialog para confirmar aplicação */}
      <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar Metadados ao Corpus?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a atualizar <strong>{songs.filter(s => s.status === 'validated').length} músicas</strong> no corpus <strong>{corpusType}</strong>.
              <br /><br />
              ✅ Um backup automático será criado<br />
              📥 O arquivo atualizado será baixado automaticamente<br />
              🗑️ As músicas aplicadas serão removidas da fila
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyToCorpus}>
              Aplicar Metadados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
