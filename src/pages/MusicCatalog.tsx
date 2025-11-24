import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  EnrichedDataTable,
  SongCard,
  ArtistCard,
  StatsCard,
  AdvancedExportMenu 
} from '@/components/music';
import { useEnrichment } from '@/hooks/useEnrichment';
import { useYouTubeEnrichment } from '@/hooks/useYouTubeEnrichment';
import { ArtistDetailsSheet } from '@/components/music/ArtistDetailsSheet';
import { EnrichmentBatchModal } from '@/components/music/EnrichmentBatchModal';
import { YouTubeEnrichmentModal } from '@/components/music/YouTubeEnrichmentModal';
import { EnrichmentMetricsDashboard } from '@/components/music/EnrichmentMetricsDashboard';
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
  const { enrichYouTubeUI } = useYouTubeEnrichment();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]); // Músicas filtradas por corpus
  const [allSongsForStats, setAllSongsForStats] = useState<any[]>([]); // TODAS as músicas sem filtro (para estatísticas)
  const [artists, setArtists] = useState<LocalArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalArtists: 0,
    avgConfidence: 0,
    pendingSongs: 0
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCorpusFilter, setSelectedCorpusFilter] = useState<string>('all');
  const [corpora, setCorpora] = useState<any[]>([]);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
  const [pendingSongsForBatch, setPendingSongsForBatch] = useState<any[]>([]);
  const [songsWithoutYouTube, setSongsWithoutYouTube] = useState<any[]>([]);
  const [showMetricsDashboard, setShowMetricsDashboard] = useState(false);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [isClearingCatalog, setIsClearingCatalog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadCorpora();
  }, [statusFilter, selectedCorpusFilter]);

  const loadCorpora = async () => {
    try {
      const { data, error } = await supabase
        .from('corpora')
        .select('id, name, color')
        .order('name');

      if (error) throw error;
      setCorpora(data || []);
    } catch (error) {
      console.error('Erro ao carregar corpora:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      console.log('🔄 [MusicCatalog] Carregando dados...');

      // ✅ FASE 3: Query UNIFICADA - Carregar TODAS as músicas com relações completas
      const { data: allSongsData, error: allSongsError } = await supabase
        .from('songs')
        .select(`
          *,
          artists (
            id,
            name,
            genre,
            normalized_name,
            corpus_id
          ),
          corpora (
            id,
            name,
            color
          )
        `)
        .limit(50000)
        .order('created_at', { ascending: false });

      if (allSongsError) throw allSongsError;

      const allSongsComplete = allSongsData || [];
      
      // Performance warning for large datasets
      if (allSongsComplete.length >= 30000) {
        toast({
          title: "⚠️ Grande Volume de Dados",
          description: `Carregando ${allSongsComplete.length.toLocaleString()} músicas. Isso pode levar alguns segundos...`,
          duration: 5000
        });
      }

      // Detailed logging
      console.log('🔍 [MusicCatalog] Detalhes do carregamento:', {
        totalSongs: allSongsComplete.length,
        limitAtingido: allSongsComplete.length >= 1000,
        avisoPerformance: allSongsComplete.length >= 30000,
        primeiras5Musicas: allSongsComplete.slice(0, 5).map(s => ({
          title: s.title,
          artist: s.artists?.name,
          status: s.status
        }))
      });

      if (allSongsComplete.length === 1000) {
        console.warn('⚠️ ATENÇÃO: Query retornou exatamente 1000 registros. Possível limitação do Supabase!');
      }

      // Aplicar filtro de corpus se necessário (apenas para exibição)
      let filteredByCorpus = allSongsComplete;
      if (selectedCorpusFilter !== 'all') {
        if (selectedCorpusFilter === 'null') {
          filteredByCorpus = allSongsComplete.filter(s => !s.corpus_id);
        } else {
          filteredByCorpus = allSongsComplete.filter(s => s.corpus_id === selectedCorpusFilter);
        }
        console.log(`🔍 [MusicCatalog] ${filteredByCorpus.length} músicas após filtro de corpus`);
      }

      // ✅ FASE 3: Usar o MESMO array para display e estatísticas
      setAllSongs(filteredByCorpus);
      setAllSongsForStats(allSongsComplete); // Sempre todas as músicas para stats

      // ✅ FASE 4: Validação de Integridade
      const uniqueArtistIdsInSongs = new Set(allSongsComplete.map(s => s.artist_id));
      console.log('🔍 [Validação de Integridade]:', {
        totalMusicas: allSongsComplete.length,
        artistIdsUnicosNasMusicas: uniqueArtistIdsInSongs.size
      });

      // Carregar artistas
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select(`
          *,
          corpora (
            id,
            name,
            color
          )
        `)
        .limit(1000)
        .order('name', { ascending: true });

      if (artistsError) throw artistsError;
      setArtists(artistsData || []);
      console.log(`✅ [MusicCatalog] ${artistsData?.length || 0} artistas carregados`);

      // ✅ FASE 4: Validação adicional - Artistas sem músicas
      const artistsWithoutSongs = artistsData?.filter(a => !uniqueArtistIdsInSongs.has(a.id)) || [];
      console.log('🔍 [Validação]:', {
        artistasCarregados: artistsData?.length || 0,
        artistasSemMusicas: artistsWithoutSongs.length,
        primeiros10SemMusicas: artistsWithoutSongs.slice(0, 10).map(a => a.name)
      });

      // Filtrar músicas baseado no filtro de status
      const displayedSongs = statusFilter === 'all' 
        ? filteredByCorpus 
        : filteredByCorpus.filter(s => s.status === statusFilter);

      setSongs(displayedSongs);

      // ✅ FASE 3: Calcular estatísticas usando allSongsComplete
      const enrichedCount = allSongsComplete.filter(s => s.status === 'enriched').length;
      const pendingCount = allSongsComplete.filter(s => s.status === 'pending').length;
      const errorCount = allSongsComplete.filter(s => s.status === 'error').length;
      const withoutYouTubeCount = allSongsComplete.filter(s => !s.youtube_url).length;

      const avgConfidence = enrichedCount > 0
        ? allSongsComplete
            .filter(s => s.status === 'enriched')
            .reduce((acc, s) => acc + (s.confidence_score || 0), 0) / enrichedCount
        : 0;

      setStats({ 
        totalSongs: allSongsComplete.length, 
        totalArtists: artistsData?.length || 0, 
        avgConfidence, 
        pendingSongs: pendingCount 
      });

      setSongsWithoutYouTube(allSongsComplete.filter(s => !s.youtube_url));

      // Calcular métricas para o dashboard
      const successRate = allSongsComplete.length > 0 
        ? (enrichedCount / allSongsComplete.length) * 100 
        : 0;

      // Histórico dos últimos 30 dias
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      const historyData = last30Days.map(date => {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const enrichedOnDay = allSongsComplete.filter(s => 
          s.updated_at && 
          new Date(s.updated_at) >= dayStart && 
          new Date(s.updated_at) < dayEnd &&
          s.status === 'enriched'
        ).length;

        const errorsOnDay = allSongsComplete.filter(s => 
          s.updated_at && 
          new Date(s.updated_at) >= dayStart && 
          new Date(s.updated_at) < dayEnd &&
          s.status === 'error'
        ).length;

        return {
          date: date.split('-').slice(1).join('/'),
          success: enrichedOnDay,
          failure: errorsOnDay
        };
      });

      const enrichedSongs = allSongsComplete.filter(s => s.status === 'enriched');
      const sourceMap = new Map<string, { count: number; totalConfidence: number }>();
      
      enrichedSongs.forEach(song => {
        const source = song.enrichment_source || 'Unknown';
        const existing = sourceMap.get(source) || { count: 0, totalConfidence: 0 };
        sourceMap.set(source, {
          count: existing.count + 1,
          totalConfidence: existing.totalConfidence + (song.confidence_score || 0)
        });
      });

      const sourceDistribution = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        count: data.count,
        avgConfidence: data.count > 0 ? (data.totalConfidence / data.count) : 0
      }));

      const confidenceRanges = [
        { range: '0-20%', min: 0, max: 20 },
        { range: '21-40%', min: 21, max: 40 },
        { range: '41-60%', min: 41, max: 60 },
        { range: '61-80%', min: 61, max: 80 },
        { range: '81-100%', min: 81, max: 100 }
      ];

      const confidenceDistribution = confidenceRanges.map(range => ({
        range: range.range,
        count: enrichedSongs.filter(s => 
          s.confidence_score >= range.min && s.confidence_score <= range.max
        ).length
      }));

      const recentEnrichments = filteredByCorpus
        .filter(s => s.status === 'enriched' || s.status === 'error')
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
        .slice(0, 10)
        .map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artists?.name || 'Unknown',
          timestamp: s.updated_at || s.created_at,
          status: s.status,
          confidence: s.confidence_score || 0,
          source: s.enrichment_source || 'Unknown'
        }));

      setMetricsData({
        totalSongs: filteredByCorpus.length,
        enriched: enrichedCount,
        pending: pendingCount,
        errors: errorCount,
        successRate,
        avgConfidence,
        enrichmentHistory: historyData,
        sourceDistribution,
        confidenceDistribution,
        recentEnrichments
      });

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar o catálogo de músicas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrichSong = async (songId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    console.log(`[DEBUG] 🎵 handleEnrichSong chamado para songId: ${songId}`);
    
    try {
      console.log(`[DEBUG] 🌐 Invocando edge function 'enrich-music-data'...`);
      console.log(`[DEBUG] 📡 URL Base: ${import.meta.env.VITE_SUPABASE_URL}`);
      
      // Timeout de 30s
      const enrichPromise = supabase.functions.invoke('enrich-music-data', {
        body: { songId }
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: operação demorou mais de 30s')), 30000)
      );
      
      console.log(`[DEBUG] ⏳ Aguardando resposta (timeout: 30s)...`);
      const { data, error } = await Promise.race([enrichPromise, timeoutPromise]) as any;
      
      console.log(`[DEBUG] 📦 Resposta recebida:`, { data, error });
      
      if (error) {
        console.error(`[DEBUG] ⚠️ Erro na resposta:`, error);
        throw error;
      }
      
      if (data?.success) {
        console.log(`[DEBUG] ✨ Enriquecimento bem-sucedido!`, data);
        return {
          success: true,
          message: `${data.enrichedData?.composer || 'Compositor'} - ${data.confidenceScore}%`
        };
      } else {
        console.error(`[DEBUG] ❌ Enriquecimento falhou:`, data);
        throw new Error(data?.error || 'Erro desconhecido ao enriquecer');
      }
    } catch (error: any) {
      console.error('[DEBUG] 💥 Exceção capturada em handleEnrichSong:', error);
      console.error('[DEBUG] 📋 Stack trace:', error.stack);
      
      // Reverter status em caso de erro
      console.log(`[DEBUG] 🔄 Revertendo status para 'pending'...`);
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
      console.log(`[DEBUG] 🔒 Enriquecimento já em andamento para songId: ${songId}`);
      return;
    }
    
    console.log(`[DEBUG] 🚀 Iniciando enriquecimento para songId: ${songId}`);
    setEnrichingIds(prev => new Set(prev).add(songId));
    
    try {
      console.log(`[DEBUG] 📞 Chamando handleEnrichSong...`);
      const result = await handleEnrichSong(songId);
      console.log(`[DEBUG] 📊 Resultado do enriquecimento:`, result);
      
      if (result.success) {
        console.log(`[DEBUG] ✅ Sucesso! Atualizando UI...`);
        toast({
          title: "✨ Música enriquecida!",
          description: result.message
        });
        await loadData();
      } else {
        console.error(`[DEBUG] ❌ Erro no enriquecimento:`, result.error);
        toast({
          title: "Erro ao enriquecer",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`[DEBUG] 💥 Exceção capturada:`, error);
      toast({
        title: "Erro inesperado",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      console.log(`[DEBUG] 🔓 Liberando lock para songId: ${songId}`);
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const handleBatchEnrich = () => {
    const pending = songs.filter(s => s.status === 'pending');
    setPendingSongsForBatch(pending);
    setBatchModalOpen(true);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleBatchEnrichYouTube = () => {
    const withoutYouTube = songs.filter(s => !s.youtube_url);
    setSongsWithoutYouTube(withoutYouTube);
    setYoutubeModalOpen(true);
  };

  const handleBatchComplete = async () => {
    await loadData();
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
        await loadData();
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
      await loadData();
    } catch (error) {
      console.error('Erro ao marcar como revisado:', error);
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
      await loadData();
    } catch (error) {
      console.error('Erro ao deletar música:', error);
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
      // Recarrega apenas o artista específico
      const { data: artistData, error } = await supabase
        .from('artists')
        .select(`
          *,
          corpora (
            id,
            name,
            color
          )
        `)
        .eq('id', artistId)
        .single();
      
      if (error) throw error;
      
      if (artistData) {
        // Atualiza o artista na lista
        setArtists(prev => prev.map(a => a.id === artistId ? artistData : a));
      }
    } catch (error) {
      console.error('Erro ao recarregar artista:', error);
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
        await loadData();
      }
    } catch (error: any) {
      console.error('Erro ao limpar catálogo:', error);
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
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      song.title?.toLowerCase().includes(query) ||
      song.artists?.name?.toLowerCase().includes(query) ||
      song.composer?.toLowerCase().includes(query)
    );
  });

  // ✅ FASE 1 & 5: Memoizar estatísticas de artistas com logs detalhados
  const artistsWithStats = useMemo(() => {
    console.log('🔄 [useMemo] Recalculando estatísticas de artistas...');
    console.log(`📊 [useMemo] Total artistas recebidos: ${artists.length}`);
    console.log(`📊 [useMemo] Total músicas para stats: ${allSongsForStats.length}`);
    
    const result = artists
      .map(artist => {
        const artistSongs = allSongsForStats.filter(s => s.artist_id === artist.id);
        const pendingSongs = artistSongs.filter(s => s.status === 'pending');
        const enrichedSongs = artistSongs.filter(s => s.status === 'enriched');
        
        return {
          ...artist,
          totalSongs: artistSongs.length,
          pendingSongs: pendingSongs.length,
          enrichedSongs: enrichedSongs.length,
          enrichedPercentage: artistSongs.length > 0
            ? Math.round((enrichedSongs.length / artistSongs.length) * 100)
            : 0
        };
      })
      .filter(a => a.totalSongs > 0)
      .sort((a, b) => b.totalSongs - a.totalSongs);

    console.log(`📊 [useMemo] Artistas com músicas: ${result.length}`);
    console.log(`📊 [useMemo] Primeiros 5 artistas:`, result.slice(0, 5).map(a => ({
      name: a.name,
      totalSongs: a.totalSongs,
      pendingSongs: a.pendingSongs
    })));
    
    return result;
  }, [artists, allSongsForStats]);

  console.log(`📊 [MusicCatalog] ${artistsWithStats.length} artistas com músicas`);

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
                onClick={loadData}
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
                      Isso irá excluir permanentemente <strong>todas as {stats.totalSongs} músicas</strong>, 
                      <strong> todos os {stats.totalArtists} artistas</strong> e seus uploads do catálogo. 
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
              {stats.totalSongs} músicas | {stats.totalArtists} artistas | 
              Confiança média: {stats.avgConfidence.toFixed(1)}/100
              {stats.pendingSongs > 0 && ` | ${stats.pendingSongs} aguardando enriquecimento`}
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
      {stats.pendingSongs > 0 && (
        <Alert className="border-primary/50 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Músicas Aguardando Enriquecimento de Metadados</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>
                {stats.pendingSongs} música{stats.pendingSongs > 1 ? 's' : ''} precisa
                {stats.pendingSongs > 1 ? 'm' : ''} ser enriquecida{stats.pendingSongs > 1 ? 's' : ''} com compositor e ano.
              </span>
              <Button 
                size="sm" 
                onClick={handleBatchEnrich}
                className="w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enriquecer Metadados ({stats.pendingSongs})
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

      <Tabs defaultValue="songs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="songs">Músicas</TabsTrigger>
          <TabsTrigger value="artists">Artistas</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
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
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Carregando artistas...</p>
            </div>
          ) : (
            <>
              {/* ✅ FASE 6: Header com estatísticas */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    {artistsWithStats.length} {artistsWithStats.length === 1 ? 'Artista' : 'Artistas'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.totalSongs} músicas no total
                  </p>
                </div>
              </div>
              
              {/* ✅ FASE 6: Grid de Cards usando dados memoizados */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {artistsWithStats.map((artist) => {
                  const artistSongs = allSongsForStats.filter(s => s.artist_id === artist.id);
                  
                  return (
                    <ArtistCard 
                      key={artist.id}
                      id={artist.id}
                      name={artist.name}
                      genre={artist.genre}
                      corpusName={artist.corpora?.name}
                      corpusColor={artist.corpora?.color}
                      totalSongs={artist.totalSongs}
                      pendingSongs={artist.pendingSongs}
                      enrichedPercentage={artist.enrichedPercentage}
                      onViewDetails={() => {
                        setSelectedArtistId(artist.id);
                        setIsSheetOpen(true);
                      }}
                      onEnrich={async () => {
                        try {
                          const pendingSongIds = artistSongs
                            .filter(s => s.status === 'pending')
                            .map(s => s.id);
                          
                          if (pendingSongIds.length === 0) {
                            toast({
                              title: "Nenhuma música pendente",
                              description: `Todas as músicas de ${artist.name} já estão enriquecidas.`,
                            });
                            return;
                          }

                          toast({
                            title: "Enriquecendo músicas",
                            description: `Iniciando enriquecimento de ${pendingSongIds.length} músicas de ${artist.name}...`,
                          });
                          
                          await enrichBatch(pendingSongIds);
                          await loadData();
                        } catch (error) {
                          toast({
                            title: "Erro",
                            description: 'Erro ao enriquecer músicas',
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
                          
                          await loadData();
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
              value={stats.totalSongs}
              subtitle="no catálogo"
            />
            <StatsCard 
              title="Total de Artistas"
              value={stats.totalArtists}
              subtitle="artistas únicos"
            />
            <StatsCard 
              title="Confiança Média"
              value={`${stats.avgConfidence.toFixed(1)}/100`}
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

      {/* Artist Details Sheet */}
      {/* Artist Details Sheet */}
      {/* ✅ FASE 1 (CRÍTICA): Usar allSongs para sempre mostrar TODAS as músicas do artista */}
      <ArtistDetailsSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        artistId={selectedArtistId}
        artist={selectedArtistId ? artists.find(a => a.id === selectedArtistId) : null}
        songs={selectedArtistId ? allSongs.filter(s => s.artist_id === selectedArtistId) : []}
        onEnrichSong={handleEnrichSong}
        onEditSong={handleEditSong}
        onReEnrichSong={handleReEnrichSong}
        onMarkReviewed={handleMarkReviewed}
        onDeleteSong={handleDeleteSong}
        onBioEnriched={handleBioEnriched}
      />
      </div>
    </div>
  );
}
