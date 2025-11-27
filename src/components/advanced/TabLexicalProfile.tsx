import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Info, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { LexicalProfile } from "@/data/types/stylistic-analysis.types";
import { DominioSemantico } from "@/data/types/corpus.types";
import { 
  calculateLexicalProfile, 
  compareProfiles, 
  calculateDiversityMetrics,
  exportLexicalProfileToCSV
} from "@/services/lexicalAnalysisService";
import { useFullTextCorpus } from "@/hooks/useFullTextCorpus";
import { sampleProportionalCorpus, validateCorpusSizes, calculateSignificance } from "@/services/proportionalSamplingService";
import { CrossCorpusSelectorWithRatio, CrossCorpusSelection } from "@/components/corpus/CrossCorpusSelectorWithRatio";
import { ComparisonRadarChart } from "@/components/visualization/ComparisonRadarChart";
import { SignificanceIndicator } from "@/components/visualization/SignificanceIndicator";
import { ProportionalSampleInfo } from "@/components/visualization/ProportionalSampleInfo";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { getSemanticDomainsFromAnnotatedCorpus } from "@/services/semanticDomainsService";
import { toast } from "sonner";
import { createLogger } from "@/lib/loggerFactory";
import { useSemanticAnnotationJob } from "@/hooks/useSemanticAnnotationJob";
import { useJobSongsProgress } from "@/hooks/useJobSongsProgress";
import { SongsProgressList } from "@/components/visualization/SongsProgressList";

const log = createLogger('TabLexicalProfile');

interface TabLexicalProfileProps {
  analyzeRef?: React.MutableRefObject<(() => void) | null>;
}

export function TabLexicalProfile({ analyzeRef }: TabLexicalProfileProps) {
  const subcorpusContext = useSubcorpus();
  const { job, isProcessing, progress, eta, wordsPerSecond, startJob, resumeJob, cancelJob, checkExistingJob, isResuming } = useSemanticAnnotationJob();
  const { stylisticSelection, setStylisticSelection, activeAnnotationJobId, setActiveAnnotationJobId } = useSubcorpus();
  const { songs, isLoading: loadingSongs, completedCount, totalCount } = useJobSongsProgress(job?.id || null, isProcessing);
  const [existingJob, setExistingJob] = useState<any | null>(null);
  const [studyProfile, setStudyProfile] = useState<LexicalProfile | null>(null);
  const [referenceProfile, setReferenceProfile] = useState<LexicalProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [studyDominios, setStudyDominios] = useState<DominioSemantico[]>([]);
  const [referenceDominios, setReferenceDominios] = useState<DominioSemantico[]>([]);

  const { corpus: gauchoCorpus, isLoading: loadingGaucho } = useFullTextCorpus('gaucho');
  const { corpus: nordestinoCorpus, isLoading: loadingNordestino } = useFullTextCorpus('nordestino');
  
  // Expor handleAnalyze via ref para uso externo
  useEffect(() => {
    if (analyzeRef) {
      analyzeRef.current = handleAnalyze;
    }
  }, [analyzeRef, stylisticSelection, gauchoCorpus, nordestinoCorpus]);
  
  // Sincronizar existingJob com job do hook
  useEffect(() => {
    if (job) {
      setExistingJob(job);
    }
  }, [job]);

  // Detectar job existente ao montar ou quando seleção mudar
  useEffect(() => {
    if (stylisticSelection?.study.mode === 'artist' && stylisticSelection?.study.artist && !job) {
      checkExistingJob(stylisticSelection.study.artist).then(existingJobData => {
        if (existingJobData) {
          setExistingJob(existingJobData);
          setActiveAnnotationJobId(existingJobData.id);
          log.info('Existing job detected', { jobId: existingJobData.id, status: existingJobData.status });
        } else {
          setExistingJob(null);
        }
      });
    }
  }, [stylisticSelection?.study.artist, job, checkExistingJob, setActiveAnnotationJobId]);

  const handleAnalyze = async () => {
    if (!stylisticSelection) return;

    setIsAnalyzing(true);
    
    try {
      const studyArtistFilter = stylisticSelection.study.mode === 'artist' 
        ? stylisticSelection.study.artist 
        : undefined;

      // Se selecionar artista, disparar job e aguardar conclusão via polling
      if (studyArtistFilter) {
        toast.info(`Iniciando processamento de ${studyArtistFilter}...`);
        const jobId = await startJob(studyArtistFilter);
        
        if (!jobId) {
          throw new Error('Falha ao iniciar processamento');
        }

        // Aguardar conclusão do job (polling automático pelo hook)
        toast.info('Processamento em andamento. Aguarde...');
        return; // UI será atualizada automaticamente quando job concluir
      }
      
      // Buscar domínios semânticos do cache
      const studyDominiosData = await getSemanticDomainsFromAnnotatedCorpus(
        stylisticSelection.study.corpusType,
        studyArtistFilter
      );
      
      setStudyDominios(studyDominiosData);

      // Analyze study corpus
      const studyCorpusData = stylisticSelection.study.corpusType === 'gaucho' ? gauchoCorpus : nordestinoCorpus;
      if (studyCorpusData && studyDominiosData.length > 0) {
        const studyProfile = calculateLexicalProfile(studyCorpusData, studyDominiosData);
        setStudyProfile(studyProfile);
      } else if (studyDominiosData.length === 0) {
        toast.error('Nenhum domínio semântico encontrado. Execute a anotação primeiro.');
      }

      // Analyze reference corpus if comparative mode
      if (stylisticSelection.isComparative) {
        const refDominiosData = await getSemanticDomainsFromAnnotatedCorpus(
          stylisticSelection.reference.corpusType,
          undefined
        );

        setReferenceDominios(refDominiosData);

        let refCorpusData = stylisticSelection.reference.corpusType === 'gaucho' ? gauchoCorpus : nordestinoCorpus;
        
        if (refCorpusData && stylisticSelection.reference.mode === 'proportional-sample') {
          refCorpusData = sampleProportionalCorpus(
            refCorpusData, 
            stylisticSelection.reference.targetSize
          );
        }
        
        if (refCorpusData && refDominiosData.length > 0) {
          const refProfile = calculateLexicalProfile(refCorpusData, refDominiosData);
          setReferenceProfile(refProfile);
        } else if (refDominiosData.length === 0) {
          toast.warning('Nenhum domínio semântico encontrado para o corpus de referência.');
        }
      }

      toast.success('Análise léxica concluída!');
    } catch (error) {
      log.error('Error analyzing corpus', error as Error);
      toast.error('Erro ao analisar corpus.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analisar quando job concluir
  useEffect(() => {
    if (job?.status === 'concluido' && stylisticSelection) {
      handleAnalyze();
    }
  }, [job?.status]);

  const handleExport = () => {
    if (!studyProfile) return;
    const csv = exportLexicalProfileToCSV(studyProfile);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `perfil-lexical-${studyProfile.corpusType}-${Date.now()}.csv`;
    link.click();
  };

  if (loadingGaucho || loadingNordestino) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando corpora...</p>
        </div>
      </div>
    );
  }

  const diversityMetrics = studyProfile ? calculateDiversityMetrics(studyProfile) : null;
  const comparison = stylisticSelection?.isComparative && studyProfile && referenceProfile 
    ? compareProfiles(studyProfile, referenceProfile) 
    : null;

  const validation = stylisticSelection?.isComparative && stylisticSelection.study && stylisticSelection.reference
    ? validateCorpusSizes(stylisticSelection.study.estimatedSize, stylisticSelection.reference.targetSize)
    : null;

  const radarData = studyProfile ? [
    { 
      metric: 'TTR', 
      study: studyProfile.ttr * 100, 
      reference: referenceProfile ? referenceProfile.ttr * 100 : 0 
    },
    { 
      metric: 'Densidade Lexical', 
      study: studyProfile.lexicalDensity * 100, 
      reference: referenceProfile ? referenceProfile.lexicalDensity * 100 : 0 
    },
    { 
      metric: 'Hapax %', 
      study: studyProfile.hapaxPercentage, 
      reference: referenceProfile ? referenceProfile.hapaxPercentage : 0 
    },
    { 
      metric: 'Razão N/V', 
      study: Math.min(studyProfile.nounVerbRatio * 10, 100), 
      reference: referenceProfile ? Math.min(referenceProfile.nounVerbRatio * 10, 100) : 0 
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Perfil Léxico</h2>
            <p className="text-sm text-muted-foreground">Análise de vocabulário e riqueza lexical</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {studyProfile && (
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>
      
      {/* UI de Job Existente */}
      {existingJob && !isProcessing && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              Processamento em Andamento
            </CardTitle>
            <CardDescription>
              {existingJob.artist_name} - {existingJob.status === 'pausado' ? 'Pausado' : 'Em progresso'} ({((existingJob.processed_words / existingJob.total_words) * 100).toFixed(1)}% completo)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button 
              onClick={() => resumeJob(existingJob.id)} 
              variant="default" 
              size="sm"
              disabled={isResuming}
            >
              {isResuming ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : '▶️'} 
              {isResuming ? 'Retomando...' : 'Retomar'}
            </Button>
            <Button onClick={() => cancelJob(existingJob.id)} variant="outline" size="sm" disabled={isResuming}>
              ❌ Cancelar
            </Button>
            <Button 
              onClick={async () => {
                await cancelJob(existingJob.id);
                setExistingJob(null);
                if (stylisticSelection?.study.artist) {
                  await startJob(stylisticSelection.study.artist);
                }
              }} 
              variant="secondary" 
              size="sm"
              disabled={isResuming}
            >
              🔄 Iniciar Novo
            </Button>
          </CardContent>
        </Card>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          O Perfil Léxico analisa a riqueza vocabular, densidade lexical e campos semânticos do corpus 
          seguindo as técnicas de Leech & Short (2007).
        </AlertDescription>
      </Alert>

      {/* Seletor movido para TabFerramentasEstilisticas */}

      {isProcessing && job && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <CardTitle className="text-lg">Processando Anotação Semântica</CardTitle>
                <CardDescription className="mt-1">
                  {job.artist_name} - Chunk {job.chunks_processed} • {job.status === 'iniciado' ? 'Iniciando...' : 'Processando em auto-invocação'}
                </CardDescription>
              </div>
              <Badge variant="outline">
                {job.processed_words.toLocaleString()} / {job.total_words.toLocaleString()}
              </Badge>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => cancelJob(job.id)}
              >
                ⏹️ Interromper
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>{job.new_words.toLocaleString()} novas</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span>{job.cached_words.toLocaleString()} em cache</span>
                  {wordsPerSecond && (
                    <>
                      <span className="text-muted-foreground/60">•</span>
                      <span>{wordsPerSecond.toFixed(1)} palavras/s</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span>{progress.toFixed(1)}%</span>
                  {eta && (
                    <>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="text-primary font-medium">ETA: {eta}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(isProcessing || job?.status === 'pausado') && job && (
        <SongsProgressList 
          songs={songs}
          completedCount={completedCount}
          totalCount={totalCount}
          isLoading={loadingSongs}
        />
      )}

      {stylisticSelection?.isComparative && validation && validation.warnings.length > 0 && (
        <ProportionalSampleInfo
          studySize={stylisticSelection.study.estimatedSize}
          referenceSize={stylisticSelection.reference.targetSize}
          targetSize={stylisticSelection.reference.targetSize}
          ratio={stylisticSelection.reference.sizeRatio}
          samplingMethod={stylisticSelection.reference.mode}
          warnings={validation.warnings}
        />
      )}

      {studyProfile && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Type-Token Ratio (TTR)</CardDescription>
                <CardTitle className="text-3xl">{studyProfile.ttr.toFixed(3)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={studyProfile.ttr > 0.6 ? 'default' : studyProfile.ttr > 0.4 ? 'secondary' : 'outline'}>
                  {diversityMetrics?.vocabularyRichness}
                </Badge>
                {comparison && (
                  <div className="mt-2">
                    <SignificanceIndicator
                      difference={comparison.differences.ttrDiff}
                      significance="*"
                      pValue={0.05}
                      metric="TTR"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Densidade Lexical</CardDescription>
                <CardTitle className="text-3xl">{(studyProfile.lexicalDensity * 100).toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={studyProfile.lexicalDensity > 0.6 ? 'default' : 'secondary'}>
                  {diversityMetrics?.lexicalDensityLevel}
                </Badge>
                {comparison && (
                  <div className="mt-2">
                    <SignificanceIndicator
                      difference={comparison.differences.lexicalDensityDiff}
                      significance="**"
                      pValue={0.01}
                      metric="Densidade"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Hapax Legomena</CardDescription>
                <CardTitle className="text-3xl">{studyProfile.hapaxCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{studyProfile.hapaxPercentage.toFixed(1)}% do vocabulário</p>
                {comparison && (
                  <div className="mt-2">
                    <SignificanceIndicator
                      difference={comparison.differences.hapaxDiff}
                      significance="ns"
                      pValue={0.1}
                      metric="Hapax"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Razão Substantivo/Verbo</CardDescription>
                <CardTitle className="text-3xl">{studyProfile.nounVerbRatio.toFixed(2)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{diversityMetrics?.styleType}</Badge>
                {comparison && (
                  <div className="mt-2">
                    <SignificanceIndicator
                      difference={comparison.differences.nounVerbRatioDiff}
                      significance="***"
                      pValue={0.001}
                      metric="N/V Ratio"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="semantic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="semantic">Campos Semânticos</TabsTrigger>
              <TabsTrigger value="frequencies">Frequências</TabsTrigger>
              {stylisticSelection?.isComparative && <TabsTrigger value="comparison">Comparação</TabsTrigger>}
            </TabsList>

            <TabsContent value="semantic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Campos Semânticos</CardTitle>
                  <CardDescription>Distribuição dos domínios temáticos mais frequentes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={studyProfile.topSemanticFields.map(f => ({ name: f.field, value: f.count, percentage: f.percentage }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="hsl(var(--primary))" name="Ocorrências" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="frequencies" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Frequências de Palavras</CardTitle>
                  <CardDescription>Top 50 palavras mais frequentes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Palavra</TableHead>
                          <TableHead>Frequência</TableHead>
                          <TableHead>Domínio Semântico</TableHead>
                          <TableHead>Hapax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studyProfile.wordFrequencies.slice(0, 50).map((word, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{word.word}</TableCell>
                            <TableCell>{word.freq}</TableCell>
                            <TableCell>
                              {word.domain ? (
                                <Badge variant="secondary">{word.domain}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {word.isHapax && <Badge variant="outline">Sim</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {stylisticSelection?.isComparative && comparison && referenceProfile && (
              <TabsContent value="comparison" className="space-y-4">
                <ComparisonRadarChart
                  data={radarData}
                  studyLabel={`Estudo (${studyProfile.corpusType})`}
                  referenceLabel={`Referência (${referenceProfile.corpusType})`}
                  title="Comparação de Perfis Léxicos"
                  description="Métricas normalizadas para comparação estatística"
                />

                {comparison.significantFields.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Diferenças Significativas em Campos Semânticos</CardTitle>
                      <CardDescription>Campos com diferença maior que 2 pontos percentuais</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Campo Semântico</TableHead>
                            <TableHead>Estudo</TableHead>
                            <TableHead>Referência</TableHead>
                            <TableHead>Significância</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparison.significantFields.map((field, idx) => {
                            const sig = calculateSignificance(
                              field.studyPercentage,
                              100,
                              field.referencePercentage,
                              100
                            );
                            return (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{field.field}</TableCell>
                                <TableCell>{field.studyPercentage.toFixed(2)}%</TableCell>
                                <TableCell>{field.referencePercentage.toFixed(2)}%</TableCell>
                                <TableCell>
                                  <SignificanceIndicator
                                    difference={field.difference}
                                    significance={sig.significance}
                                    pValue={sig.pValue}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}
