/**
 * 📚 TAB LEXICAL PROFILE
 * 
 * Análise de vocabulário e riqueza lexical.
 * Refatorado para usar cache centralizado do AnalysisToolsContext.
 * 
 * Sprint LF-1: Correções de sincronização de contextos
 * - Sincronização automática AnalysisToolsContext → SubcorpusContext
 * - Feedback visual para seleção vazia
 * - Botão manual "Analisar Corpus"
 * - Botão "Limpar Cache"
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Info, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw, PlayCircle, Trash2, AlertCircle, Layers, BarChart3, Cloud, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { LexicalProfile } from "@/data/types/stylistic-analysis.types";
import { DominioSemantico } from "@/data/types/corpus.types";
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
import { useToolCache } from "@/hooks/useToolCache";
import { useAnalysisTools } from "@/contexts/AnalysisToolsContext";
import { TheoryBriefCard, TheoryDetailModal, AnalysisSuggestionsCard, BlauNunesConsultant } from "@/components/theory";
import { lexicalTheory } from "@/data/theoretical/stylistic-theory";
import { CorpusType } from "@/data/types/corpus-tools.types";
import { useLexicalDomainsData } from "@/hooks/useLexicalDomainsData";
import { useLexicalKWIC } from "@/hooks/useLexicalKWIC";
import { LexicalDomainsView, LexicalStatisticsTable, LexicalDomainCloud, LexicalProsodyView, KWICPopover, AnnotationQualityMetrics } from "@/components/lexical";
import { annotatePOS, annotatePOSForCorpus, getPOSStatistics } from "@/services/posAnnotationService";
import { analyzeSemanticDomains, SemanticAnnotation, SemanticAnalysisProgress } from "@/services/semanticAnalysisService";
import { supabase } from "@/integrations/supabase/client";
const log = createLogger('TabLexicalProfile');

export function TabLexicalProfile() {
  const subcorpusContext = useSubcorpus();
  const { job, isProcessing, progress, eta, wordsPerSecond, startJob, resumeJob, cancelJob, checkExistingJob, isResuming } = useSemanticAnnotationJob();
  const { stylisticSelection, setStylisticSelection, activeAnnotationJobId, setActiveAnnotationJobId, loadedCorpus, getFilteredCorpus, isLoading: isLoadingCorpus, isReady: isSubcorpusReady } = useSubcorpus();
  const { songs, isLoading: loadingSongs, completedCount, totalCount } = useJobSongsProgress(job?.id || null, isProcessing);
  
  // Sincronização com AnalysisToolsContext
  const { studyCorpus, referenceCorpus, balancing } = useAnalysisTools();
  
  const [existingJob, setExistingJob] = useState<any | null>(null);
  const [studyProfile, setStudyProfile] = useState<LexicalProfile | null>(null);
  const [referenceProfile, setReferenceProfile] = useState<LexicalProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [studyDominios, setStudyDominios] = useState<DominioSemantico[]>([]);
  const [referenceDominios, setReferenceDominios] = useState<DominioSemantico[]>([]);
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const [ignorarMG, setIgnorarMG] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("overview");
  
  // SPRINT LF-11: Estado de progresso de anotação para corpus de usuário
  const [annotationProgress, setAnnotationProgress] = useState<{
    step: 'idle' | 'pos' | 'semantic' | 'calculating';
    progress: number;
    message: string;
  }>({ step: 'idle', progress: 0, message: '' });
  
  // ========== SPRINT LF-5 FASE 3: HOOK DE DADOS UNIFICADO ==========
  const lexicalData = useLexicalDomainsData(studyProfile, studyDominios, ignorarMG);
  
  // ========== SPRINT LF-8: KWIC INTEGRATION ==========
  const { corpus: kwicCorpus, openKWICTool, isLoading: isLoadingKWICCorpus } = useLexicalKWIC();
  
  // ========== SPRINT LF-5: CÁLCULO DO TAMANHO DO CORPUS DE REFERÊNCIA ==========
  const referenceCorpusSize = referenceProfile?.totalTokens || 
    (referenceCorpus?.type === 'platform' ? 
      // Estimativas de tamanho por corpus de plataforma (baseado em dados reais)
      (referenceCorpus.platformCorpus === 'gaucho' ? 280000 :
       referenceCorpus.platformCorpus === 'nordestino' ? 450000 :
       referenceCorpus.platformCorpus === 'sertanejo' ? 320000 : 350000) : 0);
  
  // ========== SINCRONIZAÇÃO DE CONTEXTOS ==========
  // Auto-sincronizar AnalysisToolsContext → SubcorpusContext
  useEffect(() => {
    // Sincronização para corpus de PLATAFORMA
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
      
      // Só atualiza se realmente mudou para evitar loops
      if (JSON.stringify(newSelection) !== JSON.stringify(stylisticSelection)) {
        log.info('Syncing platform corpus → SubcorpusContext', { studyCorpus, referenceCorpus });
        setStylisticSelection(newSelection);
      }
    }
    
    // SPRINT LF-6: NÃO sincronizar corpus de usuário com stylisticSelection
    // Corpus de usuário é tratado diretamente via loadedCorpus, não via stylisticSelection
    // Isso evita que 'user' seja propagado para serviços de plataforma
  }, [studyCorpus, referenceCorpus, isSubcorpusReady]);

  // Sincronizar existingJob com job do hook
  useEffect(() => {
    if (job) {
      setExistingJob(job);
    }
  }, [job]);

  // ========== SPRINT LF-5: DETECTAR JOB EXISTENTE COM VALIDAÇÃO MELHORADA ==========
  // Só mostrar jobs de artista quando seleção for de artista (não corpus de usuário)
  useEffect(() => {
    // Limpar job existente se estiver usando corpus de usuário
    if (studyCorpus?.type === 'user') {
      setExistingJob(null);
      return;
    }
    
    if (stylisticSelection?.study.mode === 'artist' && stylisticSelection?.study.artist && !job) {
      checkExistingJob(stylisticSelection.study.artist).then(existingJobData => {
        if (existingJobData) {
          // Só mostrar jobs ativos (não cancelados ou concluídos há muito tempo)
          if (existingJobData.status === 'processando' || existingJobData.status === 'pausado') {
            setExistingJob(existingJobData);
            setActiveAnnotationJobId(existingJobData.id);
            log.info('Existing job detected', { jobId: existingJobData.id, status: existingJobData.status });
          } else {
            // Job cancelado ou concluído - limpar
            setExistingJob(null);
          }
        } else {
          setExistingJob(null);
        }
      });
    } else if (!stylisticSelection?.study.artist) {
      // Limpar se não houver artista selecionado
      setExistingJob(null);
    }
  }, [stylisticSelection?.study.artist, studyCorpus?.type, job, checkExistingJob, setActiveAnnotationJobId]);
  
  // ========== SPRINT LF-5: LIMPAR JOBS ANTIGOS DO LOCALSTORAGE ==========
  const handleClearOldJobs = useCallback(() => {
    localStorage.removeItem('active-annotation-job-id');
    setExistingJob(null);
    setActiveAnnotationJobId(null);
    toast.success('Jobs antigos removidos da interface!');
    log.info('Old annotation jobs cleared from localStorage');
  }, [setActiveAnnotationJobId]);

  // ========== CACHE MANAGEMENT ==========
  const handleClearCache = useCallback(() => {
    setStudyProfile(null);
    setReferenceProfile(null);
    setStudyDominios([]);
    setReferenceDominios([]);
    toast.success('Cache limpo! Execute a análise novamente.');
  }, []);

  // ========== ANÁLISE ==========
  const handleAnalyze = useCallback(async () => {
    // ========== SPRINT LF-11: SUPORTE COMPLETO A CORPUS DO USUÁRIO COM POS/SEMANTIC ==========
    // Verificar corpus do usuário primeiro (prioridade sobre plataforma)
    if (studyCorpus?.type === 'user' && loadedCorpus && loadedCorpus.musicas.length > 0) {
      setIsAnalyzing(true);
      setAnnotationProgress({ step: 'idle', progress: 0, message: 'Iniciando análise...' });
      
      try {
        // 1. Extrair texto completo do corpus
        const allText = loadedCorpus.musicas.map(m => m.letra).join('\n');
        const allWords = allText.split(/\s+/).filter(w => w.trim().length > 0);
        const uniqueWords = [...new Set(allWords.map(w => w.toLowerCase()))];
        
        log.info('User corpus prepared', { 
          totalWords: allWords.length, 
          uniqueWords: uniqueWords.length 
        });
        
        // 2. Anotação POS (opcional, pode demorar)
        setAnnotationProgress({ step: 'pos', progress: 15, message: 'Anotando classes gramaticais (POS)...' });
        
        let posStats = null;
        try {
          // Tentar anotação POS para corpus pequeno (< 5000 palavras)
          if (allWords.length < 5000) {
            const posCorpus = await annotatePOSForCorpus(loadedCorpus, (processed, total, currentSong) => {
              const posProgress = 15 + Math.round((processed / total) * 25);
              setAnnotationProgress({ 
                step: 'pos', 
                progress: posProgress, 
                message: `Anotando POS: ${currentSong} (${processed}/${total})` 
              });
            });
            posStats = getPOSStatistics(posCorpus);
            log.info('POS annotation completed', { stats: posStats });
          } else {
            log.info('Corpus too large for POS annotation, skipping', { size: allWords.length });
          }
        } catch (posError) {
          log.warn('POS annotation failed, continuing without it', posError);
        }
        
        // 3. Anotação Semântica - SPRINT AUD-P0 (A-1): Chunking progressivo SEM LIMITE
        setAnnotationProgress({ step: 'semantic', progress: 45, message: 'Classificando domínios semânticos...' });
        
        let userDominios: DominioSemantico[] = [];
        try {
          // SPRINT AUD-P0: Processar TODAS as palavras únicas com chunking progressivo
          const wordsToAnnotate = uniqueWords;
          
          log.info('Starting semantic annotation with chunking', { 
            totalUniqueWords: wordsToAnnotate.length 
          });
          
          const semanticResult = await analyzeSemanticDomains(
            wordsToAnnotate, 
            'user_corpus_analysis',
            // Callback de progresso para chunking
            (chunkProgress: SemanticAnalysisProgress) => {
              const baseProgress = 45; // Início da fase semântica
              const semanticRange = 30; // 45% a 75%
              const progressInRange = (chunkProgress.percentage / 100) * semanticRange;
              setAnnotationProgress({ 
                step: 'semantic', 
                progress: baseProgress + progressInRange, 
                message: `Classificando: ${chunkProgress.processed}/${chunkProgress.total} palavras (chunk ${chunkProgress.currentChunk}/${chunkProgress.totalChunks})`
              });
            }
          );
          
          if (semanticResult.annotations && semanticResult.annotations.length > 0) {
            // Calcular frequência de cada palavra
            const wordFreqMap = new Map<string, number>();
            allWords.forEach(w => {
              const lower = w.toLowerCase();
              wordFreqMap.set(lower, (wordFreqMap.get(lower) || 0) + 1);
            });
            
            // Agrupar anotações por domínio para criar DominioSemantico[]
            const dominiosMap = new Map<string, {
              palavras: string[];
              palavrasComFrequencia: Array<{ palavra: string; ocorrencias: number }>;
              cor: string;
              totalOcorrencias: number;
            }>();
            
            semanticResult.annotations.forEach((ann: SemanticAnnotation) => {
              const dominio = ann.dominio_nome || ann.tagset_primario || 'Não classificado';
              const freq = wordFreqMap.get(ann.palavra.toLowerCase()) || 1;
              
              if (!dominiosMap.has(dominio)) {
                dominiosMap.set(dominio, {
                  palavras: [],
                  palavrasComFrequencia: [],
                  cor: ann.cor || '#888888',
                  totalOcorrencias: 0
                });
              }
              
              const entry = dominiosMap.get(dominio)!;
              entry.palavras.push(ann.palavra);
              entry.palavrasComFrequencia.push({ palavra: ann.palavra, ocorrencias: freq });
              entry.totalOcorrencias += freq;
            });
            
            // Calcular totais para percentuais
            const totalOcorrencias = Array.from(dominiosMap.values()).reduce((sum, d) => sum + d.totalOcorrencias, 0);
            const totalPalavras = allWords.length;
            
            // Converter para DominioSemantico[]
            userDominios = Array.from(dominiosMap.entries()).map(([dominio, data]) => ({
              dominio,
              descricao: '',
              riquezaLexical: data.palavras.length,
              ocorrencias: data.totalOcorrencias,
              percentual: totalOcorrencias > 0 ? (data.totalOcorrencias / totalOcorrencias) * 100 : 0,
              avgLL: 0,
              avgMI: 0,
              palavras: data.palavras,
              palavrasComFrequencia: data.palavrasComFrequencia,
              cor: data.cor,
              corTexto: '#ffffff',
              frequenciaNormalizada: totalPalavras > 0 ? (data.totalOcorrencias / totalPalavras) * 100 : 0,
              percentualTematico: totalOcorrencias > 0 ? (data.totalOcorrencias / totalOcorrencias) * 100 : 0,
              comparacaoCorpus: 'equilibrado' as const,
              diferencaCorpus: 0,
              percentualCorpusNE: 0
            }));
            
            // Ordenar por ocorrências
            userDominios.sort((a, b) => b.ocorrencias - a.ocorrencias);
            
            setStudyDominios(userDominios);
            log.info('Semantic annotation completed', { 
              annotated: semanticResult.annotations.length,
              domains: userDominios.length 
            });
          }
        } catch (semanticError) {
          log.warn('Semantic annotation failed, continuing without it', semanticError);
        }
        
        setAnnotationProgress({ step: 'semantic', progress: 75, message: 'Calculando métricas...' });
        
        // 4. Calcular perfil léxico
        setAnnotationProgress({ step: 'calculating', progress: 85, message: 'Finalizando análise...' });
        
        const profile = calculateLexicalProfile(loadedCorpus, userDominios);
        setStudyProfile(profile);
        
        log.info('User corpus analysis completed', { 
          totalTokens: profile.totalTokens, 
          uniqueTokens: profile.uniqueTokens,
          ttr: profile.ttr,
          dominiosCount: userDominios.length,
          hasPOS: !!posStats
        });
        
        setAnnotationProgress({ step: 'idle', progress: 100, message: 'Análise concluída!' });
        
        const successMsg = userDominios.length > 0 
          ? `Análise léxica concluída! ${userDominios.length} palavras classificadas semanticamente.`
          : 'Análise léxica básica concluída. Anotação semântica não disponível.';
        toast.success(successMsg);
        
      } catch (error) {
        log.error('Error analyzing user corpus', error as Error);
        toast.error('Erro ao analisar corpus do usuário.');
        setAnnotationProgress({ step: 'idle', progress: 0, message: '' });
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }
    
    // ========== ANÁLISE DE CORPUS DE PLATAFORMA ==========
    if (!stylisticSelection) {
      toast.error('Selecione um corpus antes de analisar.');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const studyArtistFilter = stylisticSelection.study.mode === 'artist' 
        ? stylisticSelection.study.artist 
        : undefined;

      // Se selecionar artista, disparar job e aguardar conclusão via polling
      if (studyArtistFilter) {
        // ========== SPRINT RAC-1: VERIFICAR JOB EXISTENTE PRIMEIRO ==========
        const existingJobData = await checkExistingJob(studyArtistFilter);
        
        if (existingJobData) {
          if (existingJobData.status === 'pausado') {
            toast.info(`Retomando job pausado para ${studyArtistFilter}...`);
            await resumeJob(existingJobData.id);
            setIsAnalyzing(false);
            return;
          } else {
            toast.info(`Job em andamento para ${studyArtistFilter}. Monitorando progresso...`);
            setExistingJob(existingJobData);
            setActiveAnnotationJobId(existingJobData.id);
            setIsAnalyzing(false);
            return;
          }
        }
        
        // Somente criar novo job se não existir
        toast.info(`Iniciando novo processamento de ${studyArtistFilter}...`);
        const jobId = await startJob(studyArtistFilter);
        
        if (!jobId) {
          throw new Error('Falha ao iniciar processamento');
        }

        // Aguardar conclusão do job (polling automático pelo hook)
        toast.info('Processamento iniciado. Aguarde...');
        setIsAnalyzing(false);
        return; // UI será atualizada automaticamente quando job concluir
      }
      
      // Buscar domínios semânticos do cache - APENAS para corpus de plataforma
      // Guard clause para evitar query com corpusType='user'
      let studyDominiosData: DominioSemantico[] = [];
      if (stylisticSelection.study.corpusType !== 'user') {
        studyDominiosData = await getSemanticDomainsFromAnnotatedCorpus(
          stylisticSelection.study.corpusType as 'gaucho' | 'nordestino',
          studyArtistFilter
        );
        setStudyDominios(studyDominiosData);
      } else {
        setStudyDominios([]);
      }

      // Usar corpus carregado via SubcorpusContext (Sistema B - mais confiável)
      let studyCorpusData = loadedCorpus;
      
      // Se não tiver corpus carregado, tentar carregar via getFilteredCorpus
      if (!studyCorpusData) {
        try {
          studyCorpusData = await getFilteredCorpus();
        } catch (err) {
          log.warn('Falha ao carregar corpus via getFilteredCorpus', err);
        }
      }
      
      if (studyCorpusData && studyDominiosData.length > 0) {
        const profile = calculateLexicalProfile(studyCorpusData, studyDominiosData);
        setStudyProfile(profile);
      } else if (studyDominiosData.length === 0 && stylisticSelection.study.corpusType !== 'user') {
        toast.error('Nenhum domínio semântico encontrado. Execute a anotação primeiro.');
        setIsAnalyzing(false);
        return;
      } else if (!studyCorpusData) {
        toast.error('Corpus não carregado. Aguarde o carregamento.');
        setIsAnalyzing(false);
        return;
      } else {
        // Para corpus de usuário sem domínios, calcular perfil léxico básico
        const profile = calculateLexicalProfile(studyCorpusData, []);
        setStudyProfile(profile);
      }

      // Analyze reference corpus if comparative mode OR balancing enabled
      if ((stylisticSelection.isComparative && stylisticSelection.reference) || balancing.enabled) {
        // Guard clause: só buscar domínios se for corpus de plataforma
        let refDominiosData: DominioSemantico[] = [];
        const refCorpusType = stylisticSelection.reference?.corpusType || referenceCorpus?.platformCorpus;
        if (refCorpusType && refCorpusType !== 'user') {
          refDominiosData = await getSemanticDomainsFromAnnotatedCorpus(
            refCorpusType as 'gaucho' | 'nordestino',
            undefined
          );
        }
        setReferenceDominios(refDominiosData);

        // Para o corpus de referência, carregar via getFilteredCorpus
        // Nota: precisaria de uma função separada ou usar cache diferente
        // Por agora, usar o mesmo loadedCorpus se for o mesmo tipo
        let refCorpusData = loadedCorpus;
        
        // SPRINT LF-9 FIX: Aplicar balanceamento do contexto
        if (refCorpusData && balancing.enabled) {
          const studySize = studyCorpusData?.musicas.reduce((acc, m) => acc + (m.letra?.split(/\s+/).length || 0), 0) || 1000;
          const targetSize = studySize * balancing.ratio;
          refCorpusData = sampleProportionalCorpus(
            refCorpusData, 
            targetSize,
            balancing.method === 'random' ? undefined : Date.now()
          );
          log.info('Applied corpus balancing', { ratio: balancing.ratio, targetSize, actualSize: refCorpusData.musicas.length });
        } else if (refCorpusData && stylisticSelection.reference?.mode === 'proportional-sample') {
          refCorpusData = sampleProportionalCorpus(
            refCorpusData, 
            stylisticSelection.reference.targetSize
          );
        }
        
        if (refCorpusData && refDominiosData.length > 0) {
          const refProfile = calculateLexicalProfile(refCorpusData, refDominiosData);
          setReferenceProfile(refProfile);
        } else if (refDominiosData.length === 0 && (stylisticSelection.isComparative || balancing.enabled)) {
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
  }, [stylisticSelection, loadedCorpus, getFilteredCorpus, startJob, balancing, referenceCorpus]);

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

  // ========== ESTADOS DE LOADING E SELEÇÃO VAZIA ==========
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

  // Verifica se há corpus válido (plataforma via stylisticSelection OU usuário via loadedCorpus)
  const hasUserCorpus = studyCorpus?.type === 'user' && loadedCorpus && loadedCorpus.musicas.length > 0;
  const hasValidCorpus = stylisticSelection || hasUserCorpus;

  // Feedback visual quando nenhum corpus está selecionado
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
        
        {/* Framework Teórico */}
        <TheoryBriefCard 
          framework={lexicalTheory} 
          onOpenDetail={() => setShowTheoryModal(true)} 
        />
        
        <Card className="p-8 text-center border-dashed border-2 border-muted-foreground/30">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">Selecione um Corpus</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Use os seletores acima para escolher o corpus de estudo e referência antes de analisar o perfil léxico.
          </p>
        </Card>

        {/* Modal de Teoria Detalhada */}
        <TheoryDetailModal 
          open={showTheoryModal} 
          onClose={() => setShowTheoryModal(false)}
          framework={lexicalTheory}
        />
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
            {/* SPRINT LF-7.4: Usar span ao invés de p para evitar DOM nesting inválido */}
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              Análise de vocabulário e riqueza lexical
              {stylisticSelection?.study?.artist && (
                <Badge variant="secondary">
                  {stylisticSelection.study.artist}
                </Badge>
              )}
              {/* Badge para corpus do usuário */}
              {studyCorpus?.type === 'user' && studyCorpus.userCorpus && (
                <Badge variant="outline">
                  📄 {studyCorpus.userCorpus.name}
                </Badge>
              )}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Botão Limpar Cache */}
          <Button 
            onClick={handleClearCache} 
            variant="ghost" 
            size="sm"
            className="gap-2 text-muted-foreground hover:text-destructive"
            disabled={!studyProfile && !referenceProfile}
          >
            <Trash2 className="w-4 h-4" />
            Limpar Cache
          </Button>
          
          {/* Botão Analisar Corpus */}
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || isProcessing}
            className="gap-2"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4" />
            )}
            {isAnalyzing ? 'Analisando...' : 'Analisar Corpus'}
          </Button>
          
          {studyProfile && (
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>
      
      {/* SPRINT LF-11: Feedback de progresso para corpus de usuário */}
      {isAnalyzing && annotationProgress.step !== 'idle' && studyCorpus?.type === 'user' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{annotationProgress.message}</p>
                <Progress value={annotationProgress.progress} className="mt-2 h-2" />
              </div>
              <Badge variant="outline">{annotationProgress.progress}%</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {annotationProgress.step === 'pos' && 'Anotando classes gramaticais com IA...'}
              {annotationProgress.step === 'semantic' && 'Classificando domínios semânticos...'}
              {annotationProgress.step === 'calculating' && 'Finalizando cálculos de métricas...'}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* ========== SPRINT LF-5: UI DE JOB EXISTENTE COM BOTÃO LIMPAR ========== */}
      {/* Só mostrar para corpus de plataforma com artista selecionado */}
      {existingJob && !isProcessing && studyCorpus?.type !== 'user' && (
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
            <Button 
              onClick={handleClearOldJobs} 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Framework Teórico */}
      <TheoryBriefCard 
        framework={lexicalTheory} 
        onOpenDetail={() => setShowTheoryModal(true)} 
      />

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

      {/* ========== SPRINT LF-9 FIX: PROPORTSIONAL SAMPLE INFO USANDO BALANCING DO CONTEXT ========== */}
      {/* Mostrar info de amostragem quando há corpus de referência E balanceamento ativo OU modo comparativo */}
      {(balancing.enabled || stylisticSelection?.isComparative) && (
        <ProportionalSampleInfo
          studySize={studyProfile?.totalTokens || stylisticSelection?.study.estimatedSize || (loadedCorpus?.musicas.reduce((acc, m) => acc + (m.letra?.split(/\s+/).length || 0), 0) || 0)}
          referenceSize={balancing.enabled 
            ? Math.round((studyProfile?.totalTokens || 1000) * balancing.ratio)
            : referenceCorpusSize}
          targetSize={balancing.enabled 
            ? Math.round((studyProfile?.totalTokens || 1000) * balancing.ratio)
            : (stylisticSelection?.reference?.targetSize || referenceCorpusSize)}
          ratio={balancing.enabled ? balancing.ratio : (stylisticSelection?.reference?.sizeRatio || 1)}
          samplingMethod={balancing.enabled ? 'proportional-sample' : (stylisticSelection?.reference?.mode || 'complete')}
          warnings={validation?.warnings || []}
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

          {/* ========== SPRINT AUD-A (A-4): MÉTRICAS DE QUALIDADE DA ANOTAÇÃO ========== */}
          {studyDominios.length > 0 && (
            <AnnotationQualityMetrics 
              dominios={studyDominios}
              totalWords={studyProfile.totalTokens}
              annotationSource={studyCorpus?.type === 'user' ? 'user' : 'platform'}
            />
          )}

          {/* ========== SPRINT LF-10: QUICK STATS NO HEADER ========== */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <strong className="text-foreground">{studyProfile.totalTokens.toLocaleString()}</strong> palavras
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <strong className="text-foreground">{studyProfile.uniqueTokens.toLocaleString()}</strong> tipos
              </span>
              {studyDominios.length > 0 && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" />
                    <strong className="text-foreground">{studyDominios.length}</strong> domínios
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ========== SPRINT LF-5 FASE 3: 5 SUB-ABAS ========== */}
          <Tabs defaultValue="overview" className="w-full" onValueChange={(v) => setActiveSubTab(v)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="gap-1.5">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="domains" className="gap-1.5">
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Domínios</span>
              </TabsTrigger>
              <TabsTrigger value="statistics" className="gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Estatísticas</span>
              </TabsTrigger>
              <TabsTrigger value="cloud" className="gap-1.5">
                <Cloud className="w-4 h-4" />
                <span className="hidden sm:inline">Nuvem DS</span>
              </TabsTrigger>
              <TabsTrigger value="prosody" className="gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Prosódia</span>
              </TabsTrigger>
            </TabsList>

            {/* Sub-aba 1: Visão Geral (conteúdo original) */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Campos Semânticos</CardTitle>
                  <CardDescription>Clique em uma barra para ver detalhes do domínio</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={studyProfile.topSemanticFields.map(f => ({ name: f.field, value: f.count, percentage: f.percentage }))}
                      style={{ cursor: 'pointer' }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string) => [value, name === 'value' ? 'Ocorrências' : name]}
                        labelFormatter={(label) => `Domínio: ${label}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        fill="hsl(var(--primary))" 
                        name="Ocorrências"
                        cursor="pointer"
                        onClick={(data) => {
                          if (data?.name) {
                            setActiveSubTab("domains");
                            toast.info(`Navegando para domínio: ${data.name}`);
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* SPRINT LF-9: Usar LexicalStatisticsTable em modo compacto */}
              <LexicalStatisticsTable 
                keywords={lexicalData.keywords}
                corpus={kwicCorpus}
                onOpenKWICTool={openKWICTool}
                compact
                onViewAll={() => {
                  // Navegar para sub-aba de estatísticas
                  const tabsTrigger = document.querySelector('[data-state="inactive"][value="statistics"]') as HTMLElement;
                  tabsTrigger?.click();
                }}
              />

              {/* Comparação (se modo comparativo) */}
              {stylisticSelection?.isComparative && comparison && referenceProfile && (
                <>
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
                        <CardTitle>Diferenças Significativas</CardTitle>
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
                </>
              )}
            </TabsContent>

            {/* Sub-aba 2: Domínios Semânticos */}
            <TabsContent value="domains" className="space-y-4">
              <LexicalDomainsView 
                domains={lexicalData.domains}
                totalWords={lexicalData.totalWords}
                corpus={kwicCorpus}
                onOpenKWICTool={openKWICTool}
              />
            </TabsContent>

            {/* Sub-aba 3: Estatísticas Detalhadas */}
            <TabsContent value="statistics" className="space-y-4">
              <LexicalStatisticsTable 
                keywords={lexicalData.keywords}
                corpus={kwicCorpus}
                onOpenKWICTool={openKWICTool}
              />
            </TabsContent>

            {/* Sub-aba 4: Nuvem de Domínios */}
            <TabsContent value="cloud" className="space-y-4">
              <LexicalDomainCloud 
                cloudData={lexicalData.cloudData}
                domains={lexicalData.domains}
                corpus={kwicCorpus}
                onDomainClick={(domain) => toast.info(`Domínio: ${domain}`)}
                onOpenKWICTool={openKWICTool}
              />
            </TabsContent>

            {/* Sub-aba 5: Prosódia Semântica */}
            <TabsContent value="prosody" className="space-y-4">
              <LexicalProsodyView 
                prosodyDistribution={lexicalData.prosodyDistribution}
                corpus={kwicCorpus}
                onOpenKWICTool={openKWICTool}
              />
            </TabsContent>
          </Tabs>

          {/* Sugestões de Análise e Chat Blau Nunes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            <AnalysisSuggestionsCard framework={lexicalTheory} compact />
            <BlauNunesConsultant 
              framework={lexicalTheory} 
              analysisResults={studyProfile}
              compact
            />
          </div>

          {/* Painel de reprocessamento */}
          <div className="mt-8">
            <ReprocessingPanel />
          </div>
        </>
      )}

      {/* Modal de Teoria Detalhada */}
      <TheoryDetailModal 
        open={showTheoryModal} 
        onClose={() => setShowTheoryModal(false)}
        framework={lexicalTheory}
      />
    </div>
  );
}
