import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Play, Pause, Check, X, Edit2, Sparkles, Database } from 'lucide-react';
import { loadFullTextCorpus } from '@/lib/fullTextParser';
import type { CorpusType } from '@/data/types/corpus-tools.types';
import type { SongMetadata } from '@/data/types/full-text-corpus.types';

interface EnrichedSongData extends SongMetadata {
  status: 'pending' | 'enriching' | 'validated' | 'rejected' | 'error';
  sugestao?: {
    compositor?: string;
    album?: string;
    ano?: string;
    fonte: 'musicbrainz' | 'ai-inferred' | 'not-found';
    confianca: number;
    detalhes?: string;
  };
  compositorEditado?: string;
  fonteValidada?: 'musicbrainz' | 'ai-inferred' | 'manual';
}

export function MetadataEnrichmentInterface() {
  const [corpusType, setCorpusType] = useState<CorpusType>('gaucho');
  const [songs, setSongs] = useState<EnrichedSongData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Load corpus
  const loadCorpus = async () => {
    setIsLoading(true);
    try {
      const corpus = await loadFullTextCorpus(corpusType);
      const enrichedSongs: EnrichedSongData[] = corpus.musicas.map(m => ({
        ...m.metadata,
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
      const { data, error } = await supabase.functions.invoke('enrich-corpus-metadata', {
        body: {
          artista: song.artista,
          musica: song.musica,
          album: song.album,
          ano: song.ano
        }
      });

      if (error) throw error;

      setSongs(prev => prev.map((s, i) => 
        i === index ? { 
          ...s, 
          status: 'pending' as const, 
          sugestao: data 
        } : s
      ));

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

  // Batch enrichment
  const startEnrichment = async () => {
    setIsEnriching(true);
    setIsPaused(false);
    
    const pendingSongs = songs.filter(s => s.status === 'pending' && !s.sugestao);
    const startIdx = currentIndex;
    
    for (let i = startIdx; i < songs.length && !isPaused; i++) {
      if (songs[i].status === 'pending' && !songs[i].sugestao) {
        setCurrentIndex(i);
        await enrichSong(songs[i], i);
        setProgress(((i + 1) / songs.length) * 100);
        
        // Rate limiting: wait 1s between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsEnriching(false);
    toast.success('Enriquecimento concluído!');
  };

  const pauseEnrichment = () => {
    setIsPaused(true);
    setIsEnriching(false);
  };

  // Validate/reject suggestions
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

  const editComposer = (index: number, value: string) => {
    setSongs(prev => prev.map((s, i) => 
      i === index ? { ...s, compositorEditado: value } : s
    ));
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

  const stats = {
    total: songs.length,
    pending: songs.filter(s => s.status === 'pending' && !s.sugestao).length,
    enriched: songs.filter(s => s.sugestao).length,
    validated: songs.filter(s => s.status === 'validated').length,
    rejected: songs.filter(s => s.status === 'rejected').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Sistema de Enriquecimento de Metadados
          </CardTitle>
          <CardDescription>
            Enriqueça automaticamente os metadados do corpus com MusicBrainz API + Lovable AI
          </CardDescription>
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
          )}

          {/* Controls */}
          {songs.length > 0 && (
            <div className="flex gap-2">
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
            </div>
          )}

          {/* Progress */}
          {isEnriching && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Processando: {currentIndex + 1} / {songs.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Songs List */}
      {songs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Músicas</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {songs.map((song, index) => (
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
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {song.sugestao.fonte === 'musicbrainz' ? (
                            <Database className="h-4 w-4" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          Sugestão ({song.sugestao.confianca}% confiança)
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
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
