import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('MusicCatalog');
import { useCatalogData } from '@/hooks/useCatalogData';
import { useArtistSongs } from '@/hooks/useArtistSongs';
import { useSemanticAnnotationCatalog } from '@/hooks/useSemanticAnnotationCatalog';
import {
  EnrichedDataTable,
  SongCard,
  ArtistCard,
  StatsCard,
  AdvancedExportMenu 
} from '@/components/music';
import { useEnrichment } from '@/hooks/useEnrichment';
import { useYouTubeEnrichment } from '@/hooks/useYouTubeEnrichment';
import { enrichmentService } from '@/services/enrichmentService';
import { ArtistDetailsSheet } from '@/components/music/ArtistDetailsSheet';
import { EnrichmentBatchModal } from '@/components/music/EnrichmentBatchModal';
import { YouTubeEnrichmentModal } from '@/components/music/YouTubeEnrichmentModal';
import { EnrichmentMetricsDashboard } from '@/components/music/EnrichmentMetricsDashboard';
import { EnrichmentValidationPanel } from '@/components/EnrichmentValidationPanel';
import { Song } from '@/components/music/SongCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LayoutGrid, LayoutList, Search, Sparkles, AlertCircle, Download, Filter, RefreshCw, Trash2, Loader2, Folder, Youtube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { debounce } from '@/lib/performanceUtils';

interface LocalArtist {
  id: string;
  name: string;
  genre: string | null;
  corpus_id: string | null;
  normalized_name: string | null;
  biography?: string | null;
  biography_source?: string | null;
  // Relação do Supabase (join)
  corpora?: {
    id: string;
    name: string;
    color: string | null;
  };
}

export default function MusicCatalog() {
  const { enrichBatch } = useEnrichment();
  const { enrichYouTubeUI, enrichYouTubeBatch } = useYouTubeEnrichment();
  
  // Hook de anotação semântica para o catálogo
  const {
    annotateSong,
    annotateArtist,
    checkSongCoverage,
    isAnnotatingSong,
    isAnnotatingArtist,
    songProgress,
    artistJob,
  } = useSemanticAnnotationCatalog();
  
  // States de UI
  const [view, setView] = useState<'songs' | 'artists' | 'stats' | 'metrics' | 'validation'>('songs');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCorpusFilter, setSelectedCorpusFilter] = useState<string>('all');
  
  // Pagination state for artists
  const [currentArtistPage, setCurrentArtistPage] = useState(1);
  const ARTISTS_PER_PAGE = 24;

  // ✅ Debounce search query para performance
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchQuery(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetSearch(searchQuery);
  }, [searchQuery, debouncedSetSearch]);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  
  // ✅ Hook carrega artistas e stats (sempre)
  const { 
    songs: catalogSongs,
    artists: artistsWithStats, 
    stats: catalogStats, 
    loading: catalogLoading, 
    reload 
  } = useCatalogData();
  
  // ✅ Hook carrega músicas do artista selecionado (sob demanda)
  const { songs: artistSongs, loading: artistSongsLoading } = useArtistSongs(selectedArtistId);
  
  // States de dados locais (sincronizados com hook)
  const [songs, setSongs] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [songsWithoutYouTube, setSongsWithoutYouTube] = useState<Song[]>([]);
  const [corpora, setCorpora] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // States de modais e UI
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
  const [pendingSongsForBatch, setPendingSongsForBatch] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClearingCatalog, setIsClearingCatalog] = useState(false);
  const [enrichingByLetter, setEnrichingByLetter] = useState(false);
  
  // State for Artist-specific EnrichmentBatchModal
  const [isEnrichmentModalOpen, setIsEnrichmentModalOpen] = useState(false);
  const [songsToEnrich, setSongsToEnrich] = useState<Array<{ id: string; title: string; artist: string }>>([]);
  
  const [artistStatsOverrides, setArtistStatsOverrides] = useState<Map<string, {
    pendingSongs: number;
    enrichedPercentage: number;
  }>>(new Map());
  const [artistBioOverrides, setArtistBioOverrides] = useState<Map<string, {
    biography: string;
    biography_source: string;
    biography_updated_at: string;
  }>>(new Map());
  const { toast } = useToast();

  // 🔍 Função helper para converter SongWithRelations → Song com type safety
  const convertToSongCard = (songWithRelations: any): Song => {
    return {
      id: songWithRelations.id,
      title: songWithRelations.title,
      normalized_title: songWithRelations.normalized_title,
      artist_id: songWithRelations.artist_id,
      composer: songWithRelations.composer,
      release_year: songWithRelations.release_year,
      lyrics: songWithRelations.lyrics,
      status: songWithRelations.status,
      confidence_score: songWithRelations.confidence_score,
      enrichment_source: songWithRelations.enrichment_source,
      youtube_url: songWithRelations.youtube_url,
      corpus_id: songWithRelations.corpus_id,
      upload_id: songWithRelations.upload_id,
      raw_data: songWithRelations.raw_data,
      created_at: songWithRelations.created_at,
      updated_at: songWithRelations.updated_at,
      artists: songWithRelations.artists,
      corpora: songWithRelations.corpora
    };
  };

  // Sincronizar dados do hook com estados locais
  useEffect(() => {
    const converted = catalogSongs.map(convertToSongCard);
    
    // Filtrar por corpus
    let filtered = converted;
    if (selectedCorpusFilter !== 'all') {
      if (selectedCorpusFilter === 'null') {
        filtered = filtered.filter(s => !s.corpus_id);
      } else {
        filtered = filtered.filter(s => s.corpus_id === selectedCorpusFilter);
      }
    }
    
    // Aplicar filtro de status
    const displayedSongs = statusFilter === 'all' 
      ? filtered 
      : filtered.filter(s => s.status === statusFilter);
    
    setAllSongs(converted);
    setSongs(displayedSongs);
    setSongsWithoutYouTube(filtered.filter(s => !s.youtube_url));
  }, [catalogSongs, statusFilter, selectedCorpusFilter]);

  useEffect(() => {
    loadCorpora();
  }, []);

  const loadCorpora = async () => {
    try {
      const { data, error } = await supabase
        .from('corpora')
        .select('id, name, color')
        .order('name');

      if (error) throw error;
      setCorpora(data || []);
    } catch (error: any) {
      log.error('Failed to load corpora', error);
    }
  };

  // ✅ REMOVIDO - Agora usa exclusivamente useCatalogData hook

  const handleEnrichSong = async (songId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    log.info('Starting song enrichment', { songId });
    
    try {
      log.debug('Invoking enrich-music-data edge function', { 
        songId,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL 
      });
      
      // Timeout de 30s
      const enrichPromise = supabase.functions.invoke('enrich-music-data', {
        body: { songId }
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: operação demorou mais de 30s')), 30000)
      );
      
      log.debug('Awaiting enrichment response (30s timeout)', { songId });
      const { data, error } = await Promise.race([enrichPromise, timeoutPromise]) as any;
      
      log.debug('Enrichment response received', { songId, data, hasError: !!error });
      
      if (error) {
        log.error('Enrichment request failed', error, { songId });
        throw error;
      }
      
      if (data?.success) {
        log.success('Song enriched successfully', { 
          songId, 
          composer: data.enrichedData?.composer,
          confidenceScore: data.confidenceScore 
        });
        return {
          success: true,
          message: `${data.enrichedData?.composer || 'Compositor'} - ${data.confidenceScore}%`
        };
      } else {
        log.error('Enrichment returned failure', undefined, { songId, errorData: data });
        throw new Error(data?.error || 'Erro desconhecido ao enriquecer');
      }
    } catch (error: any) {
      log.error('Exception in handleEnrichSong', error, { songId });
      
      // Reverter status em caso de erro
      log.info('Reverting song status to pending', { songId });
      await supabase
        .from('songs')
        .update({ status: 'pending' })
        .eq('id', songId);
      
      return {
        success: false,
        error: error.message || 'Falha ao buscar metadados'
      };
    }
  };

  const handleEnrichSongUI = async (songId: string) => {
    if (enrichingIds.has(songId)) {
      log.warn('Enrichment already in progress', { songId });
      return;
    }
    
    log.info('Starting UI enrichment flow', { songId });
    setEnrichingIds(prev => new Set(prev).add(songId));
    
    try {
      const result = await handleEnrichSong(songId);
      log.debug('Enrichment result received', { songId, success: result.success });
      
      if (result.success) {
        log.success('UI enrichment completed', { songId });
        toast({
          title: "✨ Música enriquecida!",
          description: result.message
        });
        await reload();
      } else {
        log.error('Enrichment failed in result', undefined, { songId, errorMsg: result.error });
        toast({
          title: "Erro ao enriquecer",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      log.error('Exception in UI enrichment flow', error, { songId });
      toast({
        title: "Erro inesperado",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      log.debug('Releasing enrichment lock', { songId });
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const handleBatchEnrich = async () => {
    try {
      setLoading(true);
      
      toast({
        title: "Buscando músicas pendentes...",
        description: "Consultando banco de dados para todas as músicas pendentes.",
      });

      // ✅ Query direta ao Supabase: busca TODAS as músicas pendentes (sem limite de 1000)
      const { data: pendingSongsData, error } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          artists (
            name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pendingFormatted = pendingSongsData?.map(s => ({
        id: s.id,
        title: s.title,
        artist: (s.artists as any)?.name || 'Desconhecido'
      })) || [];

      log.info('Pending songs for batch enrichment found', { count: pendingFormatted.length });

      if (pendingFormatted.length === 0) {
        toast({
          title: "Nenhuma música pendente",
          description: "Todas as músicas já foram enriquecidas!",
        });
        return;
      }

      setPendingSongsForBatch(pendingFormatted);
      setBatchModalOpen(true);
      
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (error: any) {
      log.error('Failed to fetch pending songs for batch', error);
      toast({
        title: "Erro ao buscar músicas",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchEnrichYouTube = () => {
    const withoutYouTube = songs.filter(s => !s.youtube_url);
    setSongsWithoutYouTube(withoutYouTube);
    setYoutubeModalOpen(true);
  };

  const handleBatchComplete = async () => {
    await reload();
    toast({
      title: "🎉 Enriquecimento concluído!",
      description: "Todas as músicas foram processadas."
    });
  };

  const handleExportReport = () => {
    if (!metricsData) return;

    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalSongs: metricsData.totalSongs,
        enriched: metricsData.enriched,
        pending: metricsData.pending,
        errors: metricsData.errors,
        successRate: metricsData.successRate,
        avgConfidence: metricsData.avgConfidence
      },
      enrichmentHistory: metricsData.enrichmentHistory,
      sourceDistribution: metricsData.sourceDistribution,
      confidenceDistribution: metricsData.confidenceDistribution,
      recentEnrichments: metricsData.recentEnrichments
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-enriquecimento-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "✅ Relatório exportado!",
      description: "Arquivo JSON baixado com sucesso."
    });
  };

  // Handler para editar música manualmente
  const handleEditSong = (song: any) => {
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de edição manual em breve.",
    });
  };

  // Handler para re-enriquecer música
  const handleReEnrichSong = async (songId: string) => {
    if (enrichingIds.has(songId)) return;
    
    setEnrichingIds(prev => new Set(prev).add(songId));
    
    try {
      toast({
        title: "Re-enriquecendo",
        description: "Buscando metadados atualizados...",
      });
      
      const result = await handleEnrichSong(songId);
      
      if (result.success) {
        toast({
          title: "✨ Re-enriquecimento concluído!",
          description: result.message
        });
        await reload();
      } else {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive"
        });
      }
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  // Handler para marcar como revisado
  const handleMarkReviewed = async (songId: string) => {
    try {
      const { error } = await supabase
        .from('songs')
        .update({ status: 'approved' })
        .eq('id', songId);
      
      if (error) throw error;
      
      toast({
        title: "✓ Aprovado",
        description: "Música marcada como revisada e aprovada."
      });
      await reload();
    } catch (error: any) {
      log.error('Failed to mark song as reviewed', error, { songId });
      toast({
        title: "Erro",
        description: "Falha ao atualizar status da música.",
        variant: "destructive"
      });
    }
  };

  // Handler para deletar música
  const handleDeleteSong = async (songId: string) => {
    try {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);
      
      if (error) throw error;
      
      toast({
        title: "🗑️ Música deletada",
        description: "A música foi removida do catálogo."
      });
      await reload();
    } catch (error: any) {
      log.error('Failed to delete song', error, { songId });
      toast({
        title: "Erro",
        description: "Falha ao deletar música.",
        variant: "destructive"
      });
    }
  };

  // Handler para quando a biografia for enriquecida
  const handleBioEnriched = async (artistId: string) => {
    try {
      log.info('Reloading artist biography', { artistId });
      
      // 🔄 FORÇAR LIMPEZA do cache local ANTES de buscar novos dados
      setArtistBioOverrides(prev => {
        const newMap = new Map(prev);
        newMap.delete(artistId);
        return newMap;
      });
      
      // Query completa do artista com biografia atualizada
      const { data: artistData, error } = await supabase
        .from('artists')
        .select('biography, biography_source, biography_updated_at')
        .eq('id', artistId)
        .single();
      
      if (error) throw error;
      
      if (artistData && artistData.biography) {
        // ✅ Atualizar o override de biografia localmente com dados FRESCOS
        setArtistBioOverrides(prev => {
          const newMap = new Map(prev);
          newMap.set(artistId, {
            biography: artistData.biography,
            biography_source: artistData.biography_source || 'unknown',
            biography_updated_at: artistData.biography_updated_at || new Date().toISOString()
          });
          return newMap;
        });
        
        log.success('Artist biography updated locally', {
          artistId,
          biographyLength: artistData.biography.length,
          source: artistData.biography_source
        });
        
        toast({
          title: "Biografia atualizada",
          description: "A biografia do artista foi carregada com sucesso."
        });
      }
    } catch (error: any) {
      log.error('Failed to reload artist biography', error, { artistId });
      toast({
        title: "Erro ao atualizar biografia",
        description: "Tente fechar e reabrir o painel do artista.",
        variant: "destructive"
      });
    }
  };

  const handleClearCatalog = async () => {
    setIsClearingCatalog(true);
    try {
      const { data, error } = await supabase.functions.invoke('clear-music-catalog');
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "🧹 Catálogo limpo!",
          description: `${data.deleted.songs} músicas, ${data.deleted.artists} artistas e ${data.deleted.uploads} uploads foram removidos.`
        });
        await reload();
      }
    } catch (error: any) {
      log.error('Failed to clear catalog', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao limpar o catálogo.",
        variant: "destructive"
      });
    } finally {
      setIsClearingCatalog(false);
    }
  };

  const filteredSongs = songs.filter(song => {
    if (!debouncedSearchQuery) return true;
    const query = debouncedSearchQuery.toLowerCase();
    return (
      song.title?.toLowerCase().includes(query) ||
      song.artists?.name?.toLowerCase().includes(query) ||
      song.composer?.toLowerCase().includes(query)
    );
  });

  // ✅ Filtrar artistas por corpus, letra e busca
  const filteredArtists = useMemo(() => {
    let filtered = artistsWithStats;
    
    // Filtrar por corpus
    if (selectedCorpusFilter !== 'all') {
      if (selectedCorpusFilter === 'null') {
        filtered = filtered.filter(artist => !artist.corpus_id);
      } else {
        filtered = filtered.filter(artist => artist.corpus_id === selectedCorpusFilter);
      }
    }
    
    // Filtrar por letra
    if (selectedLetter !== 'all') {
      filtered = filtered.filter(artist => 
        artist.name.charAt(0).toUpperCase() === selectedLetter
      );
    }
    
    // Filtrar por busca (usando debounced query)
    if (debouncedSearchQuery) {
      filtered = filtered.filter(artist =>
        artist.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }
    
    log.debug('Artists filtered', { 
      count: filtered.length, 
      selectedLetter,
      selectedCorpusFilter 
    });
    return filtered;
  }, [artistsWithStats, selectedLetter, debouncedSearchQuery, selectedCorpusFilter]);

  // ✅ Paginated artists
  const paginatedArtists = useMemo(() => {
    const startIndex = (currentArtistPage - 1) * ARTISTS_PER_PAGE;
    const endIndex = startIndex + ARTISTS_PER_PAGE;
    return filteredArtists.slice(startIndex, endIndex);
  }, [filteredArtists, currentArtistPage, ARTISTS_PER_PAGE]);

  const totalArtistPages = Math.ceil(filteredArtists.length / ARTISTS_PER_PAGE);

  // ✅ Reset to page 1 when filters change
  useEffect(() => {
    setCurrentArtistPage(1);
  }, [selectedLetter, debouncedSearchQuery, selectedCorpusFilter]);

  // ✅ CORRIGIDO: Conta músicas pendentes via query direta (não limitada a 1000)
  const [pendingCountForLetter, setPendingCountForLetter] = useState<number>(0);

  // Atualiza contador quando letra ou artistas mudam
  useEffect(() => {
    if (selectedLetter === 'all' || filteredArtists.length === 0) {
      setPendingCountForLetter(0);
      return;
    }

    const fetchPendingCount = async () => {
      try {
        const artistIds = filteredArtists.map(a => a.id);
        
        const { count, error } = await supabase
          .from('songs')
          .select('id', { count: 'exact', head: true })
          .in('artist_id', artistIds)
          .eq('status', 'pending');

        if (error) throw error;
        
        setPendingCountForLetter(count || 0);
      } catch (error: any) {
        log.error('Failed to get pending songs count for letter', error, { selectedLetter });
        setPendingCountForLetter(0);
      }
    };

    fetchPendingCount();
  }, [selectedLetter, filteredArtists]);

  // Handler: enriquece todas as músicas pendentes dos artistas da letra selecionada
  const handleEnrichByLetter = async () => {
    try {
      setEnrichingByLetter(true);
      
      // 1. Coletar IDs dos artistas filtrados pela letra
      const artistIds = filteredArtists.map(a => a.id);
      
      log.info('Starting enrichment by letter', { 
        selectedLetter, 
        artistCount: artistIds.length 
      });
      
      toast({
        title: "Buscando músicas pendentes...",
        description: `Consultando todas as músicas dos ${artistIds.length} artistas com "${selectedLetter}"`,
      });

      // ✅ Query direta ao Supabase: busca TODAS as músicas pendentes desses artistas (sem limite de 1000)
      const { data: pendingSongsData, error } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          artists (
            name
          )
        `)
        .in('artist_id', artistIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      log.success('Pending songs found for letter', { 
        selectedLetter, 
        count: pendingSongsData?.length || 0 
      });
      
      if (!pendingSongsData || pendingSongsData.length === 0) {
        toast({
          title: "Nenhuma música pendente",
          description: `Todas as músicas dos artistas com "${selectedLetter}" já estão enriquecidas.`,
        });
        return;
      }
      
      // 3. Preparar dados para o modal de enriquecimento
      const songsForBatch = pendingSongsData.map(song => ({
        id: song.id,
        title: song.title,
        artist: (song.artists as any)?.name || 'Desconhecido'
      }));
      
      // 4. Abrir modal de enriquecimento em lote
      setPendingSongsForBatch(songsForBatch);
      setBatchModalOpen(true);
      
      toast({
        title: `Enriquecimento iniciado`,
        description: `Processando ${songsForBatch.length} músicas de ${artistIds.length} artistas com "${selectedLetter}"`,
      });
      
    } catch (error: any) {
      log.error('Failed to enrich by letter', error, { selectedLetter });
      toast({
        title: "Erro ao buscar músicas",
        description: error instanceof Error ? error.message : "Falha ao iniciar enriquecimento em lote.",
        variant: "destructive"
      });
    } finally {
      setEnrichingByLetter(false);
    }
  };

  return (
    <div className="space-y-0">
      {/* GitHub-style Toolbar */}
      <div className="border-b bg-muted/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left actions */}
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar músicas, artistas, compositores..."
                  className="pl-9 h-9 bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button variant="ghost" size="sm" className="h-9 gap-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
              </Button>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2"
                onClick={() => reload()}
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
              
              <div className="flex items-center gap-1 border rounded-md p-0.5 bg-background/50">
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('table')}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              <AdvancedExportMenu 
                onExport={(format, options) => {
                  toast({
                    title: "Exportação iniciada",
                    description: `Preparando arquivo ${format.toUpperCase()} para download.`,
                  });
                }}
              />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-2 text-destructive hover:text-destructive"
                    disabled={isClearingCatalog}
                  >
                    {isClearingCatalog ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Limpar Catálogo</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá excluir permanentemente <strong>todas as {catalogStats?.totalSongs || 0} músicas</strong>, 
                      <strong> todos os {catalogStats?.totalArtists || 0} artistas</strong> e seus uploads do catálogo.
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearCatalog}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-start">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Catálogo de Músicas</h1>
            <p className="text-muted-foreground">
              {catalogStats?.totalSongs || 0} músicas | {catalogStats?.totalArtists || 0} artistas | 
              Confiança média: {(catalogStats?.avgConfidence || 0).toFixed(1)}/100
              {(catalogStats?.pendingSongs || 0) > 0 && ` | ${catalogStats?.pendingSongs} aguardando enriquecimento`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrar por status:</span>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todas
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Pendentes
              </Button>
              <Button
                variant={statusFilter === 'enriched' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('enriched')}
              >
                Enriquecidas
              </Button>
              <Button
                variant={statusFilter === 'processed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('processed')}
              >
                Processadas
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtrar por corpus:</span>
            <Select
              value={selectedCorpusFilter}
              onValueChange={setSelectedCorpusFilter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por corpus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Corpus</SelectItem>
                {corpora.map((corpus) => (
                  <SelectItem key={corpus.id} value={corpus.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: corpus.color }}
                      />
                      <span>{corpus.name}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="null">Sem classificação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>

      {/* FASE 4: Alert de Filtros Ativos */}
      {(statusFilter !== 'all' || selectedCorpusFilter !== 'all') && (
        <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <Filter className="h-4 w-4 text-blue-500" />
          <AlertTitle>Filtros Ativos</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-sm">
                As visualizações estão filtradas.
                {statusFilter !== 'all' && <strong> Status: {statusFilter}</strong>}
                {selectedCorpusFilter !== 'all' && (
                  <strong> Corpus: {selectedCorpusFilter === 'null' ? 'Sem classificação' : corpora.find(c => c.id === selectedCorpusFilter)?.name}</strong>
                )}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setSelectedCorpusFilter('all');
                }}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Batch Enrichment Alert */}
      {(catalogStats?.pendingSongs || 0) > 0 && (
        <Alert className="border-primary/50 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Músicas Aguardando Enriquecimento de Metadados</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>
                {catalogStats?.pendingSongs || 0} música{(catalogStats?.pendingSongs || 0) > 1 ? 's' : ''} precisa
                {(catalogStats?.pendingSongs || 0) > 1 ? 'm' : ''} ser enriquecida{(catalogStats?.pendingSongs || 0) > 1 ? 's' : ''} com compositor e ano.
              </span>
              <Button 
                size="sm" 
                onClick={handleBatchEnrich}
                className="w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enriquecer Metadados ({catalogStats?.pendingSongs || 0})
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* YouTube Enrichment Alert */}
      {songsWithoutYouTube.length > 0 && (
        <Alert className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
          <Youtube className="h-4 w-4 text-red-500" />
          <AlertTitle>Músicas sem Link do YouTube</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>
                {songsWithoutYouTube.length} música{songsWithoutYouTube.length > 1 ? 's' : ''} sem link do YouTube.
                <span className="text-xs block mt-1 text-muted-foreground">
                  ⚠️ Limite diário: 10.000 consultas
                </span>
              </span>
              <Button 
                size="sm" 
                onClick={handleBatchEnrichYouTube}
                variant="outline"
                className="w-full sm:w-auto border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Youtube className="h-4 w-4 mr-2" />
                Enriquecer YouTube ({songsWithoutYouTube.length})
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, artista ou compositor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="songs">Músicas</TabsTrigger>
          <TabsTrigger value="artists">
            Artistas {selectedLetter !== 'all' && `(${selectedLetter})`}
          </TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="validation">🧪 Validação</TabsTrigger>
        </TabsList>

        <TabsContent value="songs" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando músicas...</p>
            </div>
          ) : viewMode === 'table' ? (
            <EnrichedDataTable 
              songs={filteredSongs.map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artists?.name || 'Desconhecido',
                composer: s.composer,
                year: s.release_year,
                genre: s.artists?.genre,
                confidence: s.confidence_score || 0,
                status: s.status || 'pending'
              }))}
              onExport={() => {}}
              onEnrich={handleEnrichSongUI}
              enrichingIds={enrichingIds}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSongs.map((song) => (
                <SongCard 
                  key={song.id}
                  song={{
                    id: song.id,
                    title: song.title,
                    artist: song.artists?.name || 'Desconhecido',
                    album: song.raw_data?.album,
                    year: song.release_year,
                    genre: song.artists?.genre,
                    confidence: song.confidence_score || 0,
                    status: song.status || 'pending',
                    corpusName: song.corpora?.name,
                    corpusColor: song.corpora?.color,
                    youtubeUrl: song.youtube_url
                  }}
                  onEdit={(s) => handleEditSong(s.id)}
                  onEnrich={handleEnrichSongUI}
                  onReEnrich={handleReEnrichSong}
                  onMarkReviewed={handleMarkReviewed}
                  onDelete={handleDeleteSong}
                  isEnriching={enrichingIds.has(song.id)}
                />
              ))}
            </div>
          )}

          {!loading && filteredSongs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Nenhuma música encontrada com esses filtros."
                  : "Nenhuma música enriquecida ainda. Comece fazendo upload!"
                }
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="artists" className="space-y-4">
          {/* Filtro Alfabético */}
          <div className="flex flex-wrap gap-1 p-4 bg-card rounded-lg border mb-4">
            <Button
              size="sm"
              variant={selectedLetter === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedLetter('all')}
              className="h-8 px-3 text-xs"
            >
              Todos
            </Button>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
              <Button
                key={letter}
                size="sm"
                variant={selectedLetter === letter ? 'default' : 'outline'}
                onClick={() => setSelectedLetter(letter)}
                className="h-8 w-8 p-0 text-xs font-mono"
              >
                {letter}
              </Button>
            ))}
          </div>

          {/* Botão de Enriquecimento em Lote por Letra */}
          {selectedLetter !== 'all' && filteredArtists.length > 0 && pendingCountForLetter > 0 && (
            <div className="p-4 bg-card rounded-lg border">
              <Button
                onClick={handleEnrichByLetter}
                className="w-full gap-2"
                variant="default"
                disabled={enrichingByLetter}
              >
                {enrichingByLetter ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enriquecendo artistas com {selectedLetter}...
                  </>
                  ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Enriquecer todos com "{selectedLetter}" ({pendingCountForLetter} músicas pendentes)
                  </>
                )}
              </Button>
            </div>
          )}

          {catalogLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Carregando artistas...</p>
            </div>
          ) : filteredArtists.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {selectedLetter !== 'all' 
                  ? `Nenhum artista encontrado com a letra ${selectedLetter}`
                  : 'Nenhum artista encontrado'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    {filteredArtists.length} {filteredArtists.length === 1 ? 'Artista' : 'Artistas'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {catalogStats?.totalSongs || 0} músicas no total
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedArtists.map((artist) => {
                  const artistSongs = allSongs.filter(s => s.artist_id === artist.id);
                  
                  // ✅ Aplicar override de stats se existir
                  const statsOverride = artistStatsOverrides.get(artist.id);
                  const displayPendingSongs = statsOverride?.pendingSongs ?? (artist as any).pendingSongs ?? 0;
                  const displayEnrichedPercentage = statsOverride?.enrichedPercentage ?? (artist as any).enrichedPercentage ?? 0;
                  
                  return (
                    <ArtistCard 
                      key={artist.id}
                      id={artist.id}
                      name={artist.name}
                      genre={artist.genre}
                      corpusName={artist.corpora?.name}
                      corpusColor={artist.corpora?.color}
                      totalSongs={(artist as any).totalSongs || 0}
                      pendingSongs={displayPendingSongs}
                      enrichedPercentage={displayEnrichedPercentage}
                      isAnnotatingSemantic={isAnnotatingArtist(artist.id)}
                      onViewDetails={() => {
                        log.debug('Abrindo sheet do artista', { 
                          artistId: artist.id, 
                          artistName: artist.name, 
                          totalSongsInAllSongs: allSongs.length,
                          artistSongsCount: allSongs.filter(s => s.artist_id === artist.id).length
                        });
                        
                        setSelectedArtistId(artist.id);
                        setIsSheetOpen(true);
                      }}
                onAnnotateSemantic={async () => {
                  try {
                    // Verificar se há cobertura existente
                    const { count: totalWords } = await supabase
                      .from('semantic_disambiguation_cache')
                      .select('*', { count: 'exact', head: true })
                      .eq('artist_id', artist.id);
                    
                    if (totalWords && totalWords > 0) {
                      // Já tem algumas palavras anotadas
                      const confirmed = window.confirm(
                        `${artist.name} já possui ${totalWords} palavras anotadas no cache.\n\n` +
                        'Deseja continuar a anotação? (Isso irá processar apenas palavras ainda não classificadas)'
                      );
                      
                      if (!confirmed) return;
                    }
                    
                    await annotateArtist(artist.id, artist.name);
                  } catch (error) {
                    log.error('Error starting artist annotation', error as Error, { artistId: artist.id });
                  }
                }}
                onEnrich={async () => {
                  try {
                    // Query músicas pendentes do artista
                    const { data: pendingSongsData, error } = await supabase
                      .from('songs')
                      .select('id, title')
                      .eq('artist_id', artist.id)
                      .eq('status', 'pending')
                      .order('created_at', { ascending: false });

                    if (error) throw error;

                    if (!pendingSongsData || pendingSongsData.length === 0) {
                      toast({
                        title: "Nenhuma música pendente",
                        description: `Todas as músicas de ${artist.name} já estão enriquecidas.`,
                      });
                      return;
                    }

                    // ✅ Abrir modal ao invés de processar diretamente
                    setSongsToEnrich(pendingSongsData.map(s => ({
                      ...s,
                      artist: artist.name
                    })));
                    setIsEnrichmentModalOpen(true);
                    
                  } catch (error) {
                    log.error('Erro ao buscar músicas pendentes do artista', error as Error, { 
                      artistId: artist.id,
                      artistName: artist.name 
                    });
                    toast({
                      title: "Erro ao buscar músicas",
                      description: error instanceof Error ? error.message : 'Erro desconhecido',
                      variant: "destructive",
                    });
                  }
                 }}
                      onEnrichYouTube={async () => {
                        try {
                          toast({
                            title: "Buscando links do YouTube...",
                            description: `Consultando músicas de ${artist.name}...`,
                          });

                          // Busca músicas sem YouTube link
                          const { data: songsWithoutYT, error } = await supabase
                            .from('songs')
                            .select('id, title')
                            .eq('artist_id', artist.id)
                            .is('youtube_url', null)
                            .order('created_at', { ascending: false });

                          if (error) throw error;

                          const songIds = songsWithoutYT?.map(s => s.id) || [];
                          
                          log.info(`Músicas sem YouTube para enriquecer`, { count: songIds.length, artistName: artist.name, artistId: artist.id });
                          
                          if (songIds.length === 0) {
                            toast({
                              title: "Nenhuma música sem YouTube",
                              description: `Todas as músicas de ${artist.name} já possuem link.`,
                            });
                            return;
                          }

                          toast({
                            title: "Buscando no YouTube",
                            description: `Processando ${songIds.length} músicas...`,
                          });
                          
                          // 🔥 CORREÇÃO CRÍTICA: Capturar resultados do batch
                          const results = await enrichYouTubeBatch(songIds, undefined, (progress) => {
                            log.debug(`YouTube Batch progress`, { current: progress.current, total: progress.total, percentage: Math.round((progress.current / progress.total) * 100) });
                          });
                          
                          // ✅ results é um objeto com contadores, não array
                          const successCount = results?.success || 0;
                          const notFoundCount = results?.notFound || 0;
                          const errorCount = results?.error || 0;
                          
                          // Verificar se TODOS falharam (indica problema de quota)
                          if (successCount === 0 && notFoundCount === 0 && errorCount === songIds.length) {
                            toast({
                              title: "⚠️ Limite de API do YouTube atingido",
                              description: "A quota diária foi excedida. Tente novamente amanhã.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          if (successCount === 0 && notFoundCount > 0) {
                            toast({
                              title: "⚠️ Links não encontrados",
                              description: `Nenhum link encontrado no YouTube para as ${notFoundCount} músicas consultadas.`,
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          toast({
                            title: "✅ Enriquecimento YouTube concluído",
                            description: `${successCount} links encontrados, ${notFoundCount} não encontradas, ${errorCount} erros.`,
                          });
                        } catch (error) {
                          log.error('Erro ao enriquecer YouTube do artista', error as Error, { 
                            artistId: artist.id,
                            artistName: artist.name 
                          });
                          toast({
                            title: "Erro ao buscar YouTube",
                            description: error instanceof Error ? error.message : 'Erro ao buscar links',
                            variant: "destructive",
                          });
                        }
                      }}
                      onDelete={async () => {
                        try {
                          const { error: songsError } = await supabase
                            .from('songs')
                            .delete()
                            .eq('artist_id', artist.id);
                            
                          if (songsError) throw songsError;
                          
                          const { error: artistError } = await supabase
                            .from('artists')
                            .delete()
                            .eq('id', artist.id);
                            
                          if (artistError) throw artistError;
                          
                          await reload();
                          toast({
                            title: "Sucesso!",
                            description: `Artista ${artist.name} excluído com sucesso`,
                          });
                        } catch (error) {
                          toast({
                            title: "Erro",
                            description: 'Erro ao excluir artista',
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  );
                })}
              </div>

              {/* ✅ Pagination Controls */}
              {totalArtistPages > 1 && filteredArtists.length > 0 && (
                <div className="flex justify-center items-center gap-4 mt-8 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentArtistPage(p => Math.max(1, p - 1))}
                    disabled={currentArtistPage === 1}
                  >
                    ← Anterior
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Página {currentArtistPage} de {totalArtistPages}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({filteredArtists.length} artistas)
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentArtistPage(p => Math.min(totalArtistPages, p + 1))}
                    disabled={currentArtistPage === totalArtistPages}
                  >
                    Próxima →
                  </Button>
                </div>
              )}
              
              {/* ✅ FASE 6: Estado vazio */}
              {artistsWithStats.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Nenhum artista encontrado com músicas no catálogo.
                  </p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard 
              title="Total de Músicas"
              value={catalogStats?.totalSongs || 0}
              subtitle="no catálogo"
            />
            <StatsCard 
              title="Total de Artistas"
              value={catalogStats?.totalArtists || 0}
              subtitle="artistas únicos"
            />
            <StatsCard 
              title="Confiança Média"
              value={`${(catalogStats?.avgConfidence || 0).toFixed(1)}/100`}
              subtitle="score de qualidade"
            />
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metricsData && (
            <EnrichmentMetricsDashboard 
              metrics={metricsData}
              onExportReport={handleExportReport}
            />
          )}
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Validação do Pipeline de Enrichment</h2>
                <p className="text-muted-foreground">
                  Teste a persistência de dados e atualização da UI para Biography, YouTube e Metadata
                </p>
              </div>
              
              <EnrichmentValidationPanel />
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Dica:</strong> Esta aba é temporária para validação do MVP. 
                  Será removida após confirmação de que o pipeline de enrichment está funcionando corretamente.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Batch Enrichment Modal */}
      <EnrichmentBatchModal
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
        songs={pendingSongsForBatch.map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artists?.name || 'Desconhecido'
        }))}
        onEnrich={handleEnrichSong}
        onComplete={handleBatchComplete}
      />

      {/* YouTube Enrichment Modal */}
      <YouTubeEnrichmentModal
        open={youtubeModalOpen}
        onOpenChange={setYoutubeModalOpen}
        pendingSongs={songsWithoutYouTube}
        onComplete={handleBatchComplete}
      />

      {/* Artist-specific EnrichmentBatchModal */}
      <EnrichmentBatchModal
        open={isEnrichmentModalOpen}
        onOpenChange={setIsEnrichmentModalOpen}
        songs={songsToEnrich}
        onEnrich={async (songId: string) => {
          const result = await enrichmentService.enrichSong(songId, 'metadata-only');
          return {
            success: result.success,
            message: result.success ? 'Música enriquecida com sucesso' : undefined,
            error: result.error
          };
        }}
        onComplete={async () => {
          // Atualizar stats dos artistas afetados
          const uniqueArtistIds = [...new Set(
            songsToEnrich.map(s => {
              const song = songs.find(song => song.id === s.id);
              return song?.artist_id;
            }).filter(Boolean)
          )];

          for (const artistId of uniqueArtistIds) {
            const { data: updatedStats } = await supabase
              .from('songs')
              .select('status')
              .eq('artist_id', artistId);
            
            if (updatedStats) {
              const total = updatedStats.length;
              const enriched = updatedStats.filter(s => s.status === 'enriched').length;
              const pending = updatedStats.filter(s => s.status === 'pending').length;
              const newPercentage = total > 0 ? Math.round((enriched / total) * 100) : 0;
              
              setArtistStatsOverrides(prev => {
                const newMap = new Map(prev);
                newMap.set(artistId as string, {
                  pendingSongs: pending,
                  enrichedPercentage: newPercentage
                });
                return newMap;
              });
            }
          }
          
          setIsEnrichmentModalOpen(false);
          setSongsToEnrich([]);
        }}
      />

      {/* Artist Details Sheet - LAZY LOADING */}
      <ArtistDetailsSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        artistId={selectedArtistId}
        artist={selectedArtistId ? {
          ...artistsWithStats.find(a => a.id === selectedArtistId),
          ...artistBioOverrides.get(selectedArtistId)
        } : null}
        songs={artistSongs.map(song => ({
          id: song.id,
          title: song.title,
          normalized_title: song.normalized_title || null,
          artist_id: song.artist_id,
          composer: song.composer,
          release_year: song.release_year,
          lyrics: song.lyrics,
          status: song.status || 'pending',
          confidence_score: song.confidence_score,
          enrichment_source: song.enrichment_source,
          youtube_url: song.youtube_url,
          corpus_id: song.corpus_id,
          upload_id: song.upload_id,
          raw_data: song.raw_data || {},
          created_at: song.created_at || '',
          updated_at: song.updated_at || '',
          artists: song.artists ? {
            id: song.artists.id,
            name: song.artists.name,
            genre: song.artists.genre,
            corpus_id: null
          } : null,
          corpora: song.corpora
        }))}
        onEnrichSong={handleEnrichSong}
        onEditSong={handleEditSong}
        onReEnrichSong={handleReEnrichSong}
        onMarkReviewed={handleMarkReviewed}
        onDeleteSong={handleDeleteSong}
        onAnnotateSong={async (songId: string) => {
          const song = artistSongs.find(s => s.id === songId);
          if (!song) return;
          
          // Verificar cobertura existente
          const coverage = await checkSongCoverage(songId);
          if (coverage && coverage.coverage >= 95) {
            const confirmed = window.confirm(
              `"${song.title}" já possui ${coverage.coverage.toFixed(1)}% de cobertura (${coverage.cachedWords}/${coverage.totalWords} palavras).\n\n` +
              'Deseja reprocessar esta música?'
            );
            
            if (!confirmed) return;
          }
          
          await annotateSong(songId, song.title);
        }}
        annotatingSongIds={new Set(Array.from(songProgress.keys()))}
        onBioEnriched={handleBioEnriched}
      />
      </div>
    </div>
  );
}
