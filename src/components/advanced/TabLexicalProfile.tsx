/**
 * 📚 TAB LEXICAL PROFILE
 * 
 * Análise de vocabulário e riqueza lexical.
 * Sprint AUD-C1: Refatorado para componentes modulares (~400 linhas)
 */

import { useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, TrendingUp, Layers, BarChart3, Cloud, Sparkles, AlertCircle } from "lucide-react";
import { 
  calculateLexicalProfile, 
  compareProfiles, 
  calculateDiversityMetrics,
  exportLexicalProfileToCSV
} from "@/services/lexicalAnalysisService";
import { sampleProportionalCorpus, validateCorpusSizes, calculateSignificance } from "@/services/proportionalSamplingService";
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
import { ReprocessingPanel } from "@/components/expanded/ReprocessingPanel";
import { useAnalysisTools } from "@/contexts/AnalysisToolsContext";
import { TheoryBriefCard, TheoryDetailModal, AnalysisSuggestionsCard, BlauNunesConsultant } from "@/components/theory";
import { lexicalTheory } from "@/data/theoretical/stylistic-theory";
import { CorpusType } from "@/data/types/corpus-tools.types";
import { useLexicalDomainsData } from "@/hooks/useLexicalDomainsData";
import { useLexicalKWIC } from "@/hooks/useLexicalKWIC";
import { 
  LexicalDomainsView, LexicalStatisticsTable, LexicalDomainCloud, LexicalProsodyView, 
  AnnotationQualityMetrics, LexicalProfileHeader, AnnotationProgressCard, 
  ExistingJobCard, ProcessingJobCard, LexicalMetricsCards, LexicalQuickStats 
} from "@/components/lexical";
import { annotatePOSForCorpus, getPOSStatistics } from "@/services/posAnnotationService";
import { analyzeSemanticDomains, SemanticAnnotation, SemanticAnalysisProgress } from "@/services/semanticAnalysisService";
import { useLexicalProfileState } from "@/hooks/useLexicalProfileState";
import { DominioSemantico } from "@/data/types/corpus.types";

const log = createLogger('TabLexicalProfile');

export function TabLexicalProfile() {
  const { job, isProcessing, progress, eta, wordsPerSecond, startJob, resumeJob, cancelJob, checkExistingJob, isResuming } = useSemanticAnnotationJob();
  const { stylisticSelection, setStylisticSelection, setActiveAnnotationJobId, loadedCorpus, getFilteredCorpus, isLoading: isLoadingCorpus, isReady: isSubcorpusReady } = useSubcorpus();
  const { songs, isLoading: loadingSongs, completedCount, totalCount } = useJobSongsProgress(job?.id || null, isProcessing);
  const { studyCorpus, referenceCorpus, balancing } = useAnalysisTools();
  
  // Consolidated state management
  const state = useLexicalProfileState();
  const { 
    studyProfile, referenceProfile, studyDominios, referenceDominios, isAnalyzing,
    existingJob, showTheoryModal, ignorarMG, activeSubTab, annotationProgress,
    setStudyProfile, setReferenceProfile, setStudyDominios, setReferenceDominios,
    setIsAnalyzing, setExistingJob, setShowTheoryModal, setActiveSubTab, setAnnotationProgress,
    handleClearCache, handleClearOldJobs
  } = state;
  
  // Unified data hook
  const lexicalData = useLexicalDomainsData(studyProfile, studyDominios, ignorarMG);
  const { corpus: kwicCorpus, openKWICTool } = useLexicalKWIC();
  
  // Reference corpus size estimation
  const referenceCorpusSize = referenceProfile?.totalTokens || 
    (referenceCorpus?.type === 'platform' ? 
      (referenceCorpus.platformCorpus === 'gaucho' ? 280000 :
       referenceCorpus.platformCorpus === 'nordestino' ? 450000 :
       referenceCorpus.platformCorpus === 'sertanejo' ? 320000 : 350000) : 0);

  // ========== CONTEXT SYNC ==========
  useEffect(() => {
    if (studyCorpus && studyCorpus.type === 'platform' && isSubcorpusReady) {
      const newSelection = {
        study: {
          corpusType: (studyCorpus.platformCorpus || 'gaucho') as CorpusType,
          mode: studyCorpus.platformArtist ? 'artist' as const : 'complete' as const,
          artist: studyCorpus.platformArtist || undefined,
          estimatedSize: 0
        },
        reference: referenceCorpus && referenceCorpus.type === 'platform' ? {
          corpusType: (referenceCorpus.platformCorpus || 'nordestino') as CorpusType,
          mode: 'complete' as const,
          targetSize: 0,
          sizeRatio: 1
        } : null,
        isComparative: !!referenceCorpus
      };
      
      if (JSON.stringify(newSelection) !== JSON.stringify(stylisticSelection)) {
        log.info('Syncing platform corpus → SubcorpusContext', { studyCorpus, referenceCorpus });
        setStylisticSelection(newSelection);
      }
    }
  }, [studyCorpus, referenceCorpus, isSubcorpusReady]);

  useEffect(() => { if (job) setExistingJob(job); }, [job]);

  useEffect(() => {
    if (studyCorpus?.type === 'user') { setExistingJob(null); return; }
    
    if (stylisticSelection?.study.mode === 'artist' && stylisticSelection?.study.artist && !job) {
      checkExistingJob(stylisticSelection.study.artist).then(existingJobData => {
        if (existingJobData && (existingJobData.status === 'processando' || existingJobData.status === 'pausado')) {
          setExistingJob(existingJobData);
          setActiveAnnotationJobId(existingJobData.id);
        } else {
          setExistingJob(null);
        }
      });
    } else if (!stylisticSelection?.study.artist) {
      setExistingJob(null);
    }
  }, [stylisticSelection?.study.artist, studyCorpus?.type, job, checkExistingJob, setActiveAnnotationJobId]);

  // ========== ANALYSIS HANDLER ==========
  const handleAnalyze = useCallback(async () => {
    // User corpus analysis
    if (studyCorpus?.type === 'user' && loadedCorpus && loadedCorpus.musicas.length > 0) {
      const analysisStartedAt = new Date();
      setIsAnalyzing(true);
      setAnnotationProgress({ step: 'idle', progress: 0, message: 'Iniciando análise...', startedAt: analysisStartedAt });
      
      try {
        const allText = loadedCorpus.musicas.map(m => m.letra).join('\n');
        const allWords = allText.split(/\s+/).filter(w => w.trim().length > 0);
        const uniqueWords = [...new Set(allWords.map(w => w.toLowerCase()))];
        
        setAnnotationProgress({ step: 'pos', progress: 15, message: 'Anotando classes gramaticais (POS)...' });
        
        // POS annotation for small corpora
        if (allWords.length < 5000) {
          try {
            await annotatePOSForCorpus(loadedCorpus, (processed, total, currentSong) => {
              setAnnotationProgress({ step: 'pos', progress: 15 + Math.round((processed / total) * 25), message: `Anotando POS: ${currentSong} (${processed}/${total})` });
            });
          } catch (posError) {
            log.warn('POS annotation failed, continuing with basic analysis', { error: String(posError) });
            toast.info('Anotação gramatical indisponível, continuando análise básica.');
          }
        }
        
        setAnnotationProgress({ step: 'semantic', progress: 45, message: 'Classificando domínios semânticos...' });
        
        let userDominios: DominioSemantico[] = [];
        try {
          const semanticResult = await analyzeSemanticDomains(uniqueWords, 'user_corpus_analysis', (chunkProgress: SemanticAnalysisProgress) => {
            setAnnotationProgress({ 
              step: 'semantic', 
              progress: 45 + (chunkProgress.percentage / 100) * 30, 
              message: `Classificando: ${chunkProgress.processed}/${chunkProgress.total} palavras`,
              startedAt: chunkProgress.startedAt || analysisStartedAt,
              processedItems: chunkProgress.processed,
              currentChunk: chunkProgress.currentChunk,
              totalChunks: chunkProgress.totalChunks
            });
          });
          
          if (semanticResult.annotations?.length > 0) {
            const wordFreqMap = new Map<string, number>();
            allWords.forEach(w => wordFreqMap.set(w.toLowerCase(), (wordFreqMap.get(w.toLowerCase()) || 0) + 1));
            
            const dominiosMap = new Map<string, { palavras: string[]; palavrasComFrequencia: Array<{ palavra: string; ocorrencias: number }>; cor: string; totalOcorrencias: number }>();
            
            semanticResult.annotations.forEach((ann: SemanticAnnotation) => {
              const dominio = ann.dominio_nome || ann.tagset_primario || 'Não classificado';
              const freq = wordFreqMap.get(ann.palavra.toLowerCase()) || 1;
              
              if (!dominiosMap.has(dominio)) {
                dominiosMap.set(dominio, { palavras: [], palavrasComFrequencia: [], cor: ann.cor || '#888888', totalOcorrencias: 0 });
              }
              
              const entry = dominiosMap.get(dominio)!;
              entry.palavras.push(ann.palavra);
              entry.palavrasComFrequencia.push({ palavra: ann.palavra, ocorrencias: freq });
              entry.totalOcorrencias += freq;
            });
            
            const totalOcorrencias = Array.from(dominiosMap.values()).reduce((sum, d) => sum + d.totalOcorrencias, 0);
            
            userDominios = Array.from(dominiosMap.entries()).map(([dominio, data]) => ({
              dominio, descricao: '', riquezaLexical: data.palavras.length, ocorrencias: data.totalOcorrencias,
              percentual: totalOcorrencias > 0 ? (data.totalOcorrencias / totalOcorrencias) * 100 : 0,
              avgLL: 0, avgMI: 0, palavras: data.palavras, palavrasComFrequencia: data.palavrasComFrequencia,
              cor: data.cor, corTexto: '#ffffff', frequenciaNormalizada: (data.totalOcorrencias / allWords.length) * 100,
              percentualTematico: (data.totalOcorrencias / totalOcorrencias) * 100, comparacaoCorpus: 'equilibrado' as const, diferencaCorpus: 0, percentualCorpusNE: 0
            })).sort((a, b) => b.ocorrencias - a.ocorrencias);
            
            setStudyDominios(userDominios);
          }
        } catch (semanticError) {
          log.warn('Semantic annotation failed', { error: String(semanticError) });
          toast.warning('Classificação semântica indisponível. Exibindo métricas básicas.');
        }
        
        setAnnotationProgress({ step: 'calculating', progress: 85, message: 'Finalizando análise...' });
        
        const profile = calculateLexicalProfile(loadedCorpus, userDominios);
        setStudyProfile(profile);
        setAnnotationProgress({ step: 'idle', progress: 100, message: 'Análise concluída!' });
        toast.success(userDominios.length > 0 ? `Análise concluída! ${userDominios.length} palavras classificadas.` : 'Análise léxica básica concluída.');
        
      } catch (error) {
        log.error('Error analyzing user corpus', error as Error);
        toast.error('Erro ao analisar corpus do usuário.');
        setAnnotationProgress({ step: 'idle', progress: 0, message: '' });
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }
    
    // Platform corpus analysis
    if (!stylisticSelection) {
      toast.error('Selecione um corpus antes de analisar.');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const studyArtistFilter = stylisticSelection.study.mode === 'artist' ? stylisticSelection.study.artist : undefined;

      if (studyArtistFilter) {
        const existingJobData = await checkExistingJob(studyArtistFilter);
        
        if (existingJobData) {
          if (existingJobData.status === 'pausado') {
            toast.info(`Retomando job pausado para ${studyArtistFilter}...`);
            await resumeJob(existingJobData.id);
          } else {
            toast.info(`Job em andamento para ${studyArtistFilter}.`);
            setExistingJob(existingJobData);
            setActiveAnnotationJobId(existingJobData.id);
          }
          setIsAnalyzing(false);
          return;
        }
        
        toast.info(`Iniciando novo processamento de ${studyArtistFilter}...`);
        await startJob(studyArtistFilter);
        setIsAnalyzing(false);
        return;
      }
      
      let studyDominiosData: DominioSemantico[] = [];
      if (stylisticSelection.study.corpusType !== 'user') {
        studyDominiosData = await getSemanticDomainsFromAnnotatedCorpus(stylisticSelection.study.corpusType as 'gaucho' | 'nordestino', studyArtistFilter);
        setStudyDominios(studyDominiosData);
      }

      let studyCorpusData = loadedCorpus || await getFilteredCorpus().catch(() => null);
      
      if (studyCorpusData && studyDominiosData.length > 0) {
        setStudyProfile(calculateLexicalProfile(studyCorpusData, studyDominiosData));
      } else if (studyDominiosData.length === 0 && stylisticSelection.study.corpusType !== 'user') {
        toast.error('Nenhum domínio semântico encontrado.');
        setIsAnalyzing(false);
        return;
      } else if (!studyCorpusData) {
        toast.error('Corpus não carregado.');
        setIsAnalyzing(false);
        return;
      } else {
        setStudyProfile(calculateLexicalProfile(studyCorpusData, []));
      }

      if ((stylisticSelection.isComparative && stylisticSelection.reference) || balancing.enabled) {
        let refDominiosData: DominioSemantico[] = [];
        const refCorpusType = stylisticSelection.reference?.corpusType || referenceCorpus?.platformCorpus;
        if (refCorpusType && refCorpusType !== 'user') {
          refDominiosData = await getSemanticDomainsFromAnnotatedCorpus(refCorpusType as 'gaucho' | 'nordestino', undefined);
        }
        setReferenceDominios(refDominiosData);

        let refCorpusData = loadedCorpus;
        if (refCorpusData && balancing.enabled) {
          const studySize = studyCorpusData?.musicas.reduce((acc, m) => acc + (m.letra?.split(/\s+/).length || 0), 0) || 1000;
          refCorpusData = sampleProportionalCorpus(refCorpusData, studySize * balancing.ratio, balancing.method === 'random' ? undefined : Date.now());
        }
        
        if (refCorpusData && refDominiosData.length > 0) {
          setReferenceProfile(calculateLexicalProfile(refCorpusData, refDominiosData));
        }
      }

      toast.success('Análise léxica concluída!');
    } catch (error) {
      log.error('Error analyzing corpus', error as Error);
      toast.error('Erro ao analisar corpus.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [stylisticSelection, loadedCorpus, getFilteredCorpus, startJob, balancing, referenceCorpus, studyCorpus, checkExistingJob, resumeJob, setActiveAnnotationJobId]);

  useEffect(() => { if (job?.status === 'concluido' && stylisticSelection) handleAnalyze(); }, [job?.status]);

  const handleExport = () => {
    if (!studyProfile) return;
    const csv = exportLexicalProfileToCSV(studyProfile);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `perfil-lexical-${studyProfile.corpusType}-${Date.now()}.csv`;
    link.click();
  };

  // ========== LOADING STATE ==========
  if (isLoadingCorpus) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando corpus...</p>
        </div>
      </div>
    );
  }

  const hasUserCorpus = studyCorpus?.type === 'user' && loadedCorpus && loadedCorpus.musicas.length > 0;
  const hasValidCorpus = stylisticSelection || hasUserCorpus;

  if (!hasValidCorpus) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Perfil Léxico</h2>
            <p className="text-sm text-muted-foreground">Análise de vocabulário e riqueza lexical</p>
          </div>
        </div>
        <TheoryBriefCard framework={lexicalTheory} onOpenDetail={() => setShowTheoryModal(true)} />
        <Card className="p-8 text-center border-dashed border-2 border-muted-foreground/30">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">Selecione um Corpus</h3>
          <p className="text-muted-foreground max-w-md mx-auto">Use os seletores acima para escolher o corpus de estudo e referência.</p>
        </Card>
        <TheoryDetailModal open={showTheoryModal} onClose={() => setShowTheoryModal(false)} framework={lexicalTheory} />
      </div>
    );
  }

  const diversityMetrics = studyProfile ? calculateDiversityMetrics(studyProfile) : null;
  const comparison = stylisticSelection?.isComparative && studyProfile && referenceProfile ? compareProfiles(studyProfile, referenceProfile) : null;
  const validation = stylisticSelection?.isComparative && stylisticSelection.study && stylisticSelection.reference ? validateCorpusSizes(stylisticSelection.study.estimatedSize, stylisticSelection.reference.targetSize) : null;

  const radarData = studyProfile ? [
    { metric: 'TTR', study: studyProfile.ttr * 100, reference: referenceProfile ? referenceProfile.ttr * 100 : 0 },
    { metric: 'Densidade Lexical', study: studyProfile.lexicalDensity * 100, reference: referenceProfile ? referenceProfile.lexicalDensity * 100 : 0 },
    { metric: 'Hapax %', study: studyProfile.hapaxPercentage, reference: referenceProfile ? referenceProfile.hapaxPercentage : 0 },
    { metric: 'Razão N/V', study: Math.min(studyProfile.nounVerbRatio * 10, 100), reference: referenceProfile ? Math.min(referenceProfile.nounVerbRatio * 10, 100) : 0 },
  ] : [];

  return (
    <div className="space-y-6">
      <LexicalProfileHeader
        studyArtist={stylisticSelection?.study?.artist}
        userCorpusName={studyCorpus?.type === 'user' ? studyCorpus.userCorpus?.name : undefined}
        studyProfile={studyProfile}
        referenceProfile={referenceProfile}
        isAnalyzing={isAnalyzing}
        isProcessing={isProcessing}
        onAnalyze={handleAnalyze}
        onExport={handleExport}
        onClearCache={handleClearCache}
      />
      
      {isAnalyzing && studyCorpus?.type === 'user' && (
        <AnnotationProgressCard 
          step={annotationProgress.step} 
          progress={annotationProgress.progress} 
          message={annotationProgress.message}
          startedAt={annotationProgress.startedAt}
          processedItems={annotationProgress.processedItems}
          currentChunk={annotationProgress.currentChunk}
          totalChunks={annotationProgress.totalChunks}
        />
      )}
      
      {existingJob && !isProcessing && studyCorpus?.type !== 'user' && (
        <ExistingJobCard
          job={existingJob}
          onResume={() => resumeJob(existingJob.id)}
          onCancel={() => cancelJob(existingJob.id)}
          onRestart={async () => { await cancelJob(existingJob.id); setExistingJob(null); if (stylisticSelection?.study.artist) await startJob(stylisticSelection.study.artist); }}
          onClear={() => handleClearOldJobs(setActiveAnnotationJobId)}
          isResuming={isResuming}
        />
      )}

      <TheoryBriefCard framework={lexicalTheory} onOpenDetail={() => setShowTheoryModal(true)} />

      {isProcessing && job && (
        <ProcessingJobCard job={job} progress={progress} eta={eta} wordsPerSecond={wordsPerSecond} onCancel={() => cancelJob(job.id)} />
      )}

      {(isProcessing || job?.status === 'pausado') && job && (
        <SongsProgressList songs={songs} completedCount={completedCount} totalCount={totalCount} isLoading={loadingSongs} />
      )}

      {(balancing.enabled || stylisticSelection?.isComparative) && (
        <ProportionalSampleInfo
          studySize={studyProfile?.totalTokens || stylisticSelection?.study.estimatedSize || (loadedCorpus?.musicas.reduce((acc, m) => acc + (m.letra?.split(/\s+/).length || 0), 0) || 0)}
          referenceSize={balancing.enabled ? Math.round((studyProfile?.totalTokens || 1000) * balancing.ratio) : referenceCorpusSize}
          targetSize={balancing.enabled ? Math.round((studyProfile?.totalTokens || 1000) * balancing.ratio) : (stylisticSelection?.reference?.targetSize || referenceCorpusSize)}
          ratio={balancing.enabled ? balancing.ratio : (stylisticSelection?.reference?.sizeRatio || 1)}
          samplingMethod={balancing.enabled ? 'proportional-sample' : (stylisticSelection?.reference?.mode || 'complete')}
          warnings={validation?.warnings || []}
        />
      )}

      {studyProfile && (
        <>
          <LexicalMetricsCards profile={studyProfile} diversityMetrics={diversityMetrics} comparison={comparison} />

          {studyDominios.length > 0 && (
            <AnnotationQualityMetrics dominios={studyDominios} totalWords={studyProfile.totalTokens} annotationSource={studyCorpus?.type === 'user' ? 'user' : 'platform'} />
          )}

          <LexicalQuickStats totalTokens={studyProfile.totalTokens} uniqueTokens={studyProfile.uniqueTokens} dominiosCount={studyDominios.length} />

          <Tabs defaultValue="overview" className="w-full" onValueChange={(v) => setActiveSubTab(v)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-4 h-4" /><span className="hidden sm:inline">Visão Geral</span></TabsTrigger>
              <TabsTrigger value="domains" className="gap-1.5"><Layers className="w-4 h-4" /><span className="hidden sm:inline">Domínios</span></TabsTrigger>
              <TabsTrigger value="statistics" className="gap-1.5"><TrendingUp className="w-4 h-4" /><span className="hidden sm:inline">Estatísticas</span></TabsTrigger>
              <TabsTrigger value="cloud" className="gap-1.5"><Cloud className="w-4 h-4" /><span className="hidden sm:inline">Nuvem DS</span></TabsTrigger>
              <TabsTrigger value="prosody" className="gap-1.5"><Sparkles className="w-4 h-4" /><span className="hidden sm:inline">Prosódia</span></TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Campos Semânticos</CardTitle>
                  <CardDescription>Clique em uma barra para ver detalhes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={studyProfile.topSemanticFields.map(f => ({ name: f.field, value: f.count, percentage: f.percentage }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [value, 'Ocorrências']} />
                      <Legend />
                      <Bar dataKey="value" fill="hsl(var(--primary))" name="Ocorrências" cursor="pointer" onClick={(data) => { if (data?.name) { setActiveSubTab("domains"); toast.info(`Navegando para: ${data.name}`); }}} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <LexicalStatisticsTable keywords={lexicalData.keywords} corpus={kwicCorpus} onOpenKWICTool={openKWICTool} compact onViewAll={() => (document.querySelector('[data-state="inactive"][value="statistics"]') as HTMLElement)?.click()} />

              {stylisticSelection?.isComparative && comparison && referenceProfile && (
                <>
                  <ComparisonRadarChart data={radarData} studyLabel={`Estudo (${studyProfile.corpusType})`} referenceLabel={`Referência (${referenceProfile.corpusType})`} title="Comparação de Perfis Léxicos" description="Métricas normalizadas para comparação estatística" />

                  {comparison.significantFields.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Diferenças Significativas</CardTitle>
                        <CardDescription>Campos com diferença maior que 2%</CardDescription>
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
                              const sig = calculateSignificance(field.studyPercentage, 100, field.referencePercentage, 100);
                              return (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{field.field}</TableCell>
                                  <TableCell>{field.studyPercentage.toFixed(2)}%</TableCell>
                                  <TableCell>{field.referencePercentage.toFixed(2)}%</TableCell>
                                  <TableCell><SignificanceIndicator difference={field.difference} significance={sig.significance} pValue={sig.pValue} /></TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="domains" className="space-y-4">
              <LexicalDomainsView domains={lexicalData.domains} totalWords={lexicalData.totalWords} corpus={kwicCorpus} onOpenKWICTool={openKWICTool} />
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4">
              <LexicalStatisticsTable keywords={lexicalData.keywords} corpus={kwicCorpus} onOpenKWICTool={openKWICTool} />
            </TabsContent>

            <TabsContent value="cloud" className="space-y-4">
              <LexicalDomainCloud cloudData={lexicalData.cloudData} domains={lexicalData.domains} corpus={kwicCorpus} onDomainClick={(domain) => toast.info(`Domínio: ${domain}`)} onOpenKWICTool={openKWICTool} />
            </TabsContent>

            <TabsContent value="prosody" className="space-y-4">
              <LexicalProsodyView prosodyDistribution={lexicalData.prosodyDistribution} corpus={kwicCorpus} onOpenKWICTool={openKWICTool} />
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            <AnalysisSuggestionsCard framework={lexicalTheory} compact />
            <BlauNunesConsultant framework={lexicalTheory} analysisResults={studyProfile} compact />
          </div>

          <div className="mt-8">
            <ReprocessingPanel />
          </div>
        </>
      )}

      <TheoryDetailModal open={showTheoryModal} onClose={() => setShowTheoryModal(false)} framework={lexicalTheory} />
    </div>
  );
}
