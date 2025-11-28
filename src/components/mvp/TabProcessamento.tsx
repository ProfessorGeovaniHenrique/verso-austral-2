import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SongSearchInput } from './SongSearchInput';
import { useProcessamentoTour } from '@/hooks/useProcessamentoTour';
import { useCorpusArtistsAndSongs } from '@/hooks/useCorpusArtistsAndSongs';
import { useDashboardAnaliseContext } from '@/contexts/DashboardAnaliseContext';
import { useCorpusProcessing } from '@/hooks/useCorpusProcessing';
import { ProcessingProgressModal } from '@/components/analise/ProcessingProgressModal';
import { REFERENCE_CORPORA } from '@/data/miniCorpusNordestino';
import { HelpCircle, Users, FileMusic, Microscope, Loader2, InfoIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';

export function TabProcessamento() {
  const navigate = useNavigate();
  const { trackFeatureUsage } = useAnalytics();
  const { processamentoData, updateProcessamentoData } = useDashboardAnaliseContext();
  const { isProcessing, ceSteps, crSteps, processCorpus, reset } = useCorpusProcessing();
  
  const [studyMode, setStudyMode] = useState(processamentoData.studyMode);
  const [studyArtist, setStudyArtist] = useState(processamentoData.studyArtist);
  const [studySong, setStudySong] = useState(processamentoData.studySong);
  const [referenceCorpus, setReferenceCorpus] = useState(processamentoData.referenceCorpus);
  const [showModal, setShowModal] = useState(false);

  // Sincronizar estado com contexto ao mudar
  useEffect(() => {
    updateProcessamentoData({
      studyMode,
      studyArtist,
      studySong,
      referenceCorpus,
    });
  }, [studyMode, studyArtist, studySong, referenceCorpus]);

  // Carregar artistas e músicas do catálogo (corpus gaucho)
  const { artists, songs, setSelectedArtist, isLoadingArtists, isLoadingSongs } = useCorpusArtistsAndSongs('gaucho');

  // Sincronizar selectedArtist do hook com studyArtist do contexto na montagem
  useEffect(() => {
    if (studyArtist && studyArtist !== '') {
      setSelectedArtist(studyArtist);
    }
  }, []); // Apenas na montagem do componente

  // Sincronizar quando studyArtist mudar (para garantir consistência)
  useEffect(() => {
    if (studyArtist !== '' && studyArtist) {
      setSelectedArtist(studyArtist);
    }
  }, [studyArtist, setSelectedArtist]);

  // Filtrar apenas Luiz Marenco e a música específica (restrição do MVP)
  const filteredArtists = artists.filter(a => a === 'Luiz Marenco');
  const artistSongs = songs
    .filter(s => s.title.toLowerCase() === 'quando o verso vem pras casa')
    .map(s => ({ id: s.id, title: s.title }));

  // Hook do tour guiado
  const { startTour } = useProcessamentoTour({
    autoStart: true,
    onComplete: () => {
      toast.success('Tutorial concluído! 🎉', {
        description: 'Agora você pode selecionar e processar a música.'
      });
    }
  });

  const handleProcess = async () => {
    if (!studySong) return;

    reset();
    setShowModal(true);
    
    try {
      const results = await processCorpus(studySong, referenceCorpus);
      
      // Salvar resultados no contexto
      updateProcessamentoData({
        isProcessed: true,
        processedAt: new Date().toISOString(),
        analysisResults: results
      });
      
      // Disparar conquista
      trackFeatureUsage('corpus_processed');
      
      toast.success('Processamento concluído! 🎉', {
        description: 'Navegando para os resultados...'
      });
      
      // Fechar modal e navegar
      setTimeout(() => {
        setShowModal(false);
        navigate('/dashboard-analise?tab=dominios');
      }, 1500);
    } catch (error) {
      setShowModal(false);
      toast.error('Erro ao processar corpus', {
        description: error instanceof Error ? error.message : 'Tente novamente.'
      });
    }
  };

  const selectedCorpusInfo = REFERENCE_CORPORA.find(c => c.id === referenceCorpus);
  const selectedSongTitle = artistSongs.find(s => s.id === studySong)?.title;

  const canProcess = studyMode === 'song' && studyArtist && studySong && referenceCorpus;

  return (
    <>
      <ProcessingProgressModal
        open={showModal}
        ceSteps={ceSteps}
        crSteps={crSteps}
        studySongTitle={selectedSongTitle}
        studyArtist={studyArtist}
        referenceCorpusName={selectedCorpusInfo?.name}
      />
      
      <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle>Seleção do Corpus de Estudo</CardTitle>
            <CardDescription>
              Siga os passos para selecionar a música e processar a análise semântica
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={startTour}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Ver Tutorial
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Alert informativo sobre limitações do MVP */}
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>Demonstração MVP:</strong> Nesta versão, apenas o artista <strong>Luiz Marenco</strong> e a música{' '}
              <strong>"Quando o verso vem pras casa"</strong> estão disponíveis para análise.
            </AlertDescription>
          </Alert>

          {/* PASSO 1: Selecionar Artista */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                1
              </Badge>
              Selecione o Artista
            </Label>
            <Select 
              value={studyArtist} 
              onValueChange={(value) => {
                setStudyArtist(value);
                setSelectedArtist(value); // Carregar músicas do artista
                setStudySong(''); // Limpar música ao mudar artista
              }}
              disabled={isLoadingArtists}
            >
              <SelectTrigger data-tour="artist-select">
                <SelectValue placeholder="Escolha o artista..." />
              </SelectTrigger>
              <SelectContent>
                {filteredArtists.map(artist => (
                  <SelectItem key={artist} value={artist}>
                    {artist}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PASSO 2: Escolher Modo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                2
              </Badge>
              Escolha o Modo de Análise
            </Label>
            <div className="flex gap-2">
              <Button
                variant={studyMode === 'artist' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStudyMode('artist');
                  setStudySong('');
                }}
                disabled={!studyArtist}
              >
                <Users className="h-4 w-4 mr-1" />
                Artista Completo
              </Button>
              <Button
                variant={studyMode === 'song' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStudyMode('song')}
                disabled={!studyArtist}
                data-tour="song-mode-button"
              >
                <FileMusic className="h-4 w-4 mr-1" />
                Música
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {studyMode === 'artist' 
                ? 'Analisar todas as músicas do artista' 
                : 'Analisar uma música específica'}
            </p>
          </div>

          {/* PASSO 3: Buscar Música (aparece apenas no modo música) */}
          {studyMode === 'song' && studyArtist && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                  3
                </Badge>
                Busque a Música
              </Label>
              <SongSearchInput
                songs={artistSongs}
                value={studySong}
                onChange={setStudySong}
                placeholder="Selecione a música..."
                isLoading={isLoadingSongs}
                disabled={!studyArtist}
              />
            </div>
          )}

          {/* PASSO 4: Escolher Corpus de Referência */}
          {studyMode === 'song' && studySong && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                  4
                </Badge>
                Escolha o Corpus de Referência
              </Label>
              <Select 
                value={referenceCorpus} 
                onValueChange={setReferenceCorpus}
              >
                <SelectTrigger data-tour="reference-corpus-select">
                  <SelectValue placeholder="Selecione o corpus de referência..." />
                </SelectTrigger>
                <SelectContent>
                  {REFERENCE_CORPORA.map(corpus => (
                    <SelectItem key={corpus.id} value={corpus.id}>
                      <div className="flex items-center gap-2">
                        <span>{corpus.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {corpus.totalSongs} músicas
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Corpus usado para comparação estatística (Log-likelihood)
              </p>
            </div>
          )}

          {/* PASSO 5: Processar Corpus */}
          <div className="pt-4 border-t space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                5
              </Badge>
              Iniciar Processamento
            </Label>
            
            <div data-tour="process-button">
              <Button 
                onClick={handleProcess}
                disabled={!canProcess || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Microscope className="h-5 w-5 mr-2" />
                    Processar Corpus
                  </>
                )}
              </Button>
            </div>

            {!canProcess && !isProcessing && (
              <p className="text-xs text-muted-foreground text-center">
                Complete os passos acima para habilitar o processamento
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card de Status do Processamento (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status do Processamento</CardTitle>
          <CardDescription>
            Acompanhe o progresso da análise semântica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            O processamento será iniciado após a seleção do corpus acima.
          </p>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
