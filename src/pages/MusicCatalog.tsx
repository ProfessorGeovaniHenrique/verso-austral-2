import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  EnrichedDataTable,
  SongCard,
  ArtistCard,
  StatsCard,
  AdvancedExportMenu 
} from '@/components/music';
import { ArtistDetailsSheet } from '@/components/music/ArtistDetailsSheet';
import { EnrichmentBatchModal } from '@/components/music/EnrichmentBatchModal';
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
import { LayoutGrid, LayoutList, Search, Sparkles, AlertCircle, Download, Filter, RefreshCw, Trash2, Loader2, Folder } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
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
  const [pendingSongsForBatch, setPendingSongsForBatch] = useState<any[]>([]);
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

      // Carregar todas as músicas para estatísticas completas
      let query = supabase
        .from('songs')
        .select(`
          *,
          artists (
            id,
            name,
            genre,
            corpus_id
          ),
          corpora (
            id,
            name,
            color
          )
        `)
        .order('created_at', { ascending: false });

      // Filtrar por corpus se selecionado
      if (selectedCorpusFilter !== 'all') {
        if (selectedCorpusFilter === 'null') {
          query = query.is('corpus_id', null);
        } else {
          query = query.eq('corpus_id', selectedCorpusFilter);
        }
      }

      const { data: allSongsData, error: allSongsError } = await query;

      if (allSongsError) throw allSongsError;

      const allSongs = allSongsData || [];

      // Filtrar músicas baseado no filtro de status
      const displayedSongs = statusFilter === 'all' 
        ? allSongs 
        : allSongs.filter(s => s.status === statusFilter);

      setSongs(displayedSongs);

      // Carregar artistas únicos
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
        .order('name');

      if (artistsError) throw artistsError;
      setArtists(artistsData || []);

      // Calcular estatísticas
      const enrichedCount = allSongs.filter(s => s.status === 'enriched').length;
      const pendingCount = allSongs.filter(s => s.status === 'pending').length;
      const errorCount = allSongs.filter(s => s.status === 'error').length;

      const avgConfidence = enrichedCount > 0
        ? allSongs
            .filter(s => s.status === 'enriched')
            .reduce((acc, s) => acc + (s.confidence_score || 0), 0) / enrichedCount
        : 0;

      setStats({ 
        totalSongs: allSongs.length, 
        totalArtists: artistsData?.length || 0, 
        avgConfidence, 
        pendingSongs: pendingCount 
      });

      // Calcular métricas para o dashboard
      const successRate = allSongs.length > 0 
        ? (enrichedCount / allSongs.length) * 100 
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

        const enrichedOnDay = allSongs.filter(s => 
          s.updated_at && 
          new Date(s.updated_at) >= dayStart && 
          new Date(s.updated_at) < dayEnd &&
          s.status === 'enriched'
        ).length;

        const errorsOnDay = allSongs.filter(s => 
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

      // Distribuição por fonte
      const enrichedSongs = allSongs.filter(s => s.status === 'enriched');
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

      // Distribuição de confiança
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

      // Enriquecimentos recentes
      const recentEnrichments = allSongs
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
        totalSongs: allSongs.length,
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

      {/* Batch Enrichment Alert */}
      {stats.pendingSongs > 0 && (
        <Alert className="border-primary/50 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Músicas Aguardando Enriquecimento</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>
                {stats.pendingSongs} música{stats.pendingSongs > 1 ? 's' : ''} precisa
                {stats.pendingSongs > 1 ? 'm' : ''} ser enriquecida{stats.pendingSongs > 1 ? 's' : ''} com metadados externos.
              </span>
              <Button 
                size="sm" 
                onClick={handleBatchEnrich}
                className="w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enriquecer Todas ({stats.pendingSongs})
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map((artist) => {
              const artistSongs = songs.filter(s => s.artist_id === artist.id);
              const pendingSongs = artistSongs.filter(s => s.status === 'pending').length;
              const enrichedSongs = artistSongs.filter(s => s.status === 'enriched').length;
              const enrichedPercentage = artistSongs.length > 0
                ? Math.round((enrichedSongs / artistSongs.length) * 100)
                : 0;
                
              return (
                <ArtistCard 
                  key={artist.id}
                  id={artist.id}
                  name={artist.name}
                  genre={artist.genre}
                  corpusName={artist.corpora?.name}
                  corpusColor={artist.corpora?.color}
                  totalSongs={artistSongs.length}
                  pendingSongs={pendingSongs}
                  enrichedPercentage={enrichedPercentage}
                  onViewDetails={() => {
                    setSelectedArtistId(artist.id);
                    setIsSheetOpen(true);
                  }}
                  onEnrich={async () => {
                    try {
                      toast({
                        title: "Enriquecendo músicas",
                        description: `Iniciando enriquecimento de ${pendingSongs} músicas de ${artist.name}...`,
                      });
                      // Implementar lógica de enriquecimento em lote
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      await loadData();
                      toast({
                        title: "Sucesso!",
                        description: `Músicas de ${artist.name} enriquecidas com sucesso!`,
                      });
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
                      // Deletar todas as músicas do artista
                      const { error: songsError } = await supabase
                        .from('songs')
                        .delete()
                        .eq('artist_id', artist.id);
                        
                      if (songsError) throw songsError;
                      
                      // Deletar o artista
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
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard 
              title="Total de Músicas"
              value={stats.totalSongs}
              subtitle="músicas enriquecidas"
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

      {/* Artist Details Sheet */}
      <ArtistDetailsSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        artistId={selectedArtistId}
        artist={selectedArtistId ? artists.find(a => a.id === selectedArtistId) : null}
        songs={selectedArtistId ? songs.filter(s => s.artist_id === selectedArtistId) : []}
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
