import { useState, useMemo, useEffect } from "react";
import { useKeywords } from "@/hooks/useKeywords";
import { useFeatureTour } from "@/hooks/useFeatureTour";
import { keywordsTourSteps } from "./KeywordsTool.tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Search, Play, Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, MousePointerClick, Music, AlertCircle, BarChart3, Lightbulb, FileJson, FileDown, Share2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, ScatterChart, Scatter, ReferenceLine } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useSearchParams } from 'react-router-dom';
import { KeywordEntry, CorpusType } from "@/data/types/corpus-tools.types";
import { SubcorpusMetadata } from "@/data/types/subcorpus.types";
import { useTools } from "@/contexts/ToolsContext";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { toast } from "sonner";
import { CorpusSubcorpusSelector } from "@/components/corpus/CorpusSubcorpusSelector";
import { loadFullTextCorpus } from "@/lib/fullTextParser";
import { useCallback } from "react";
import { useFullTextCorpus } from "@/hooks/useFullTextCorpus";
import { generateKWIC } from "@/services/kwicService";
import { SaveIndicator } from '@/components/ui/save-indicator';
import { KeywordsConfigPanel } from '@/components/mvp/tools/KeywordsConfigPanel';
import { AnimatedChartWrapper } from '@/components/ui/animated-chart-wrapper';

export function KeywordsTool() {
  useFeatureTour('keywords', keywordsTourSteps);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estado persistido no context
  const { keywordsState, setKeywordsState, saveStatus } = useTools();
  
  // Garantir que analysisConfig existe (fallback para valores padrão)
  const analysisConfig = keywordsState.analysisConfig || {
    generateKeywordsList: true,
    generateScatterPlot: false,
    generateComparisonChart: false,
    generateDispersion: false,
  };
  
  // Usar estado do context
  const estudoCorpusBase = keywordsState.estudoCorpusBase;
  const setEstudoCorpusBase = (val: CorpusType) => setKeywordsState({ estudoCorpusBase: val });
  const estudoMode = keywordsState.estudoMode;
  const setEstudoMode = (val: 'complete' | 'artist') => setKeywordsState({ estudoMode: val });
  const estudoArtist = keywordsState.estudoArtist;
  const setEstudoArtist = (val: string | null) => setKeywordsState({ estudoArtist: val });
  
  const refCorpusBase = keywordsState.refCorpusBase;
  const setRefCorpusBase = (val: CorpusType) => setKeywordsState({ refCorpusBase: val });
  const refMode = keywordsState.refMode;
  const setRefMode = (val: 'complete' | 'artist') => setKeywordsState({ refMode: val });
  const refArtist = keywordsState.refArtist;
  const setRefArtist = (val: string | null) => setKeywordsState({ refArtist: val });
  
  // Estados para metadados
  const [estudoMetadata, setEstudoMetadata] = useState<SubcorpusMetadata | null>(null);
  const [refMetadata, setRefMetadata] = useState<SubcorpusMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [errorEstudo, setErrorEstudo] = useState<string | null>(null);
  const [errorRef, setErrorRef] = useState<string | null>(null);
  
  const { isLoading, error, processKeywords } = useKeywords();
  const { navigateToKWIC } = useTools();
  const { currentMetadata, selection } = useSubcorpus();
  
  const handleKeywordsProcessed = useCallback((newKeywords: KeywordEntry[]) => {
    setKeywordsState({ keywords: newKeywords, isProcessed: true });
  }, [setKeywordsState]);
  
  // Carregar corpus full-text para preview KWIC
  const { corpus: fullTextCorpus, isLoading: isLoadingFullCorpus } = useFullTextCorpus(
    estudoCorpusBase,
    estudoMode === 'artist' && estudoArtist ? { artistas: [estudoArtist] } : undefined
  );
  
  // Dados para o gráfico comparativo
  const chartData = useMemo(() => {
    if (!analysisConfig.generateComparisonChart) return null;
    if (!estudoMetadata || !refMetadata) return null;

    return [
      {
        metrica: 'Riqueza Lexical (%)',
        [estudoMetadata.artista]: parseFloat((estudoMetadata.riquezaLexical * 100).toFixed(2)),
        [refMetadata.artista]: parseFloat((refMetadata.riquezaLexical * 100).toFixed(2)),
      },
      {
        metrica: 'Palavras Únicas',
        [estudoMetadata.artista]: estudoMetadata.totalPalavrasUnicas,
        [refMetadata.artista]: refMetadata.totalPalavrasUnicas,
      },
      {
        metrica: 'Total de Palavras',
        [estudoMetadata.artista]: estudoMetadata.totalPalavras,
        [refMetadata.artista]: refMetadata.totalPalavras,
      },
      {
        metrica: 'Total de Músicas',
        [estudoMetadata.artista]: estudoMetadata.totalMusicas,
        [refMetadata.artista]: refMetadata.totalMusicas,
      }
    ];
  }, [estudoMetadata, refMetadata, analysisConfig.generateComparisonChart]);

  // Configuração do gráfico
  const chartConfig = useMemo(() => {
    if (!estudoMetadata || !refMetadata) return {};
    
    return {
      [estudoMetadata.artista]: {
        label: estudoMetadata.artista,
        color: 'hsl(var(--chart-1))',
      },
      [refMetadata.artista]: {
        label: refMetadata.artista,
        color: 'hsl(var(--chart-2))',
      },
    };
  }, [estudoMetadata, refMetadata]);
  
  // Estados de filtro e ordenação do context
  const searchTerm = keywordsState.searchTerm;
  const setSearchTerm = (val: string) => setKeywordsState({ searchTerm: val });
  const sortColumn = keywordsState.sortColumn;
  const setSortColumn = (val: typeof keywordsState.sortColumn) => setKeywordsState({ sortColumn: val });
  const sortDirection = keywordsState.sortDirection;
  const setSortDirection = (val: 'asc' | 'desc') => setKeywordsState({ sortDirection: val });
  const minLLFilter = keywordsState.llFilter;
  const setMinLLFilter = (val: number) => setKeywordsState({ llFilter: val });
  const isProcessed = keywordsState.isProcessed;
  
  // Filtros temporários (não precisam persistir)
  const [filterSignificancia, setFilterSignificancia] = useState({
    Alta: true,
    Média: true,
    Baixa: true
  });
  const [filterEfeito, setFilterEfeito] = useState({
    'super-representado': true,
    'sub-representado': true
  });
  
  // Dados para o scatter plot (LL vs Frequência)
  const scatterData = useMemo(() => {
    if (!analysisConfig.generateScatterPlot) return [];
    if (!keywordsState.keywords || keywordsState.keywords.length === 0) return [];

    return keywordsState.keywords.map(kw => ({
      palavra: kw.palavra,
      ll: kw.ll,
      freqEstudo: kw.freqEstudo,
      normFreqEstudo: kw.normFreqEstudo,
      efeito: kw.efeito,
      significancia: kw.significancia,
      mi: kw.mi,
      isOutlier: kw.ll > 50 || kw.freqEstudo > 200,
    }));
  }, [keywordsState.keywords, analysisConfig.generateScatterPlot]);
  
  // Calcular metadados do subcorpus
  const calculateSubcorpusMetadata = async (
    corpusBase: CorpusType,
    mode: 'complete' | 'artist',
    artist: string | null
  ): Promise<SubcorpusMetadata | null> => {
    try {
      const corpus = await loadFullTextCorpus(corpusBase);
      
      const musicas = mode === 'complete' 
        ? corpus.musicas 
        : corpus.musicas.filter(m => m.metadata.artista === artist);
      
      if (musicas.length === 0) return null;
      
      const totalPalavras = musicas.reduce((sum, m) => sum + m.palavras.length, 0);
      const uniqueWords = new Set<string>();
      musicas.forEach(m => m.palavras.forEach(p => uniqueWords.add(p.toLowerCase())));
      
      const albums = [...new Set(musicas.map(m => m.metadata.album))];
      const anos = musicas
        .map(m => m.metadata.ano ? parseInt(m.metadata.ano) : null)
        .filter((a): a is number => a !== null);
      
      return {
        id: mode === 'complete' ? corpusBase : `${corpusBase}-${artist}`,
        artista: mode === 'complete' ? `Corpus ${corpusBase}` : artist!,
        totalMusicas: musicas.length,
        totalPalavras,
        totalPalavrasUnicas: uniqueWords.size,
        riquezaLexical: uniqueWords.size / totalPalavras,
        anoInicio: anos.length > 0 ? Math.min(...anos) : undefined,
        anoFim: anos.length > 0 ? Math.max(...anos) : undefined,
        albums
      };
    } catch (error) {
      console.error('Erro ao calcular metadados:', error);
      return null;
    }
  };
  
  // Efeito para atualizar metadados quando seleção mudar
  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoadingMetadata(true);
      
      const [estudo, ref] = await Promise.all([
        calculateSubcorpusMetadata(estudoCorpusBase, estudoMode, estudoArtist),
        calculateSubcorpusMetadata(refCorpusBase, refMode, refArtist)
      ]);
      
      setEstudoMetadata(estudo);
      setRefMetadata(ref);
      setIsLoadingMetadata(false);
    };
    
    // Carregar apenas se modo artista tiver artista selecionado ou modo completo
    const shouldLoad = (
      (estudoMode === 'complete' || estudoArtist) &&
      (refMode === 'complete' || refArtist)
    );
    
    if (shouldLoad) {
      loadMetadata();
    } else {
      setEstudoMetadata(null);
      setRefMetadata(null);
    }
  }, [estudoCorpusBase, estudoMode, estudoArtist, refCorpusBase, refMode, refArtist]);
  
  const filteredKeywords = useMemo(() => {
    const keywordsToFilter = keywordsState.keywords.length > 0 ? keywordsState.keywords : [];
    return keywordsToFilter
      .filter(kw => {
        if (searchTerm && !kw.palavra.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (!filterSignificancia[kw.significancia]) return false;
        if (!filterEfeito[kw.efeito]) return false;
        if (kw.ll < minLLFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
  }, [keywordsState.keywords, searchTerm, filterSignificancia, filterEfeito, sortColumn, sortDirection, minLLFilter]);
  
  const handleSort = (column: typeof keywordsState.sortColumn) => {
    if (sortColumn === column) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      setSortColumn(column);
      const defaultDirection = column === 'll' ? 'desc' : 'asc';
      setSortDirection(defaultDirection);
    }
  };
  
  const handleProcessKeywords = async () => {
    // Validação: não pode comparar corpus/subcorpus idênticos
    if (
      estudoCorpusBase === refCorpusBase && 
      estudoMode === refMode &&
      estudoMode === 'complete'
    ) {
      toast.error('Selecione corpus diferentes para comparação');
      return;
    }
    
    if (
      estudoCorpusBase === refCorpusBase &&
      estudoMode === 'artist' && refMode === 'artist' &&
      estudoArtist === refArtist
    ) {
      toast.error('Selecione artistas diferentes para comparação');
      return;
    }
    
    // Construir identificadores de corpus para processamento
    const estudoId = estudoMode === 'complete' 
      ? estudoCorpusBase 
      : `${estudoCorpusBase}-${estudoArtist}`;
      
    const refId = refMode === 'complete'
      ? refCorpusBase
      : `${refCorpusBase}-${refArtist}`;
    
    await processKeywords(estudoId, refId);
  };
  
  const handleExportCSV = () => {
    const estudoLabel = estudoMode === 'complete' 
      ? estudoCorpusBase 
      : `${estudoCorpusBase} (${estudoArtist})`;
      
    const referenciaLabel = refMode === 'complete' 
      ? refCorpusBase 
      : `${refCorpusBase} (${refArtist})`;
    
    const csvContent = [
      ['Palavra', 'Freq Estudo', 'Freq Ref', 'LL', '%Diff', 'Significância', 'Efeito'].join(','),
      ...filteredKeywords.map(kw => {
        const percDiff = ((kw.freqEstudo - kw.freqReferencia) / kw.freqReferencia) * 100;
        return [
          kw.palavra,
          kw.freqEstudo,
          kw.freqReferencia,
          kw.ll.toFixed(2),
          percDiff.toFixed(2),
          kw.significancia,
          kw.efeito
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `keywords_${estudoLabel}_vs_${referenciaLabel}.csv`;
    link.click();
  };
  
  const handleWordClick = (palavra: string) => {
    navigateToKWIC(palavra, 'keywords');
    
    toast.info(`Navegando para KWIC: "${palavra}"`, {
      description: 'A palavra foi transferida para a ferramenta KWIC',
      duration: 3000
    });
  };
  
  // Função para gerar preview de KWIC
  const getKWICPreview = (palavra: string, limit: number = 3): { previews: string[], total: number } => {
    if (!fullTextCorpus || isLoadingFullCorpus) {
      return { previews: [], total: 0 };
    }
    
    try {
      const contexts = generateKWIC(fullTextCorpus, palavra, 3, 3);
      return {
        previews: contexts.slice(0, limit).map(ctx => 
          `${ctx.contextoEsquerdo} [${ctx.palavra}] ${ctx.contextoDireito}`
        ),
        total: contexts.length
      };
    } catch (error) {
      console.error('Erro ao gerar preview KWIC:', error);
      return { previews: [], total: 0 };
    }
  };
  
  // Exportação para Excel
  const handleExportToExcel = async () => {
    if (!estudoMetadata || !refMetadata || keywordsState.keywords.length === 0) {
      toast.error('Certifique-se de que os metadados e keywords estão carregados');
      return;
    }

    try {
      const XLSX = await import('xlsx');

      // Sheet 1: Metadados
      const metadataSheet = XLSX.utils.json_to_sheet([
        {
          'Tipo': 'Corpus de Estudo',
          'Nome': estudoMetadata.artista,
          'Total de Músicas': estudoMetadata.totalMusicas,
          'Total de Palavras': estudoMetadata.totalPalavras,
          'Palavras Únicas': estudoMetadata.totalPalavrasUnicas,
          'Riqueza Lexical (%)': (estudoMetadata.riquezaLexical * 100).toFixed(2),
          'Período': estudoMetadata.anoInicio 
            ? `${estudoMetadata.anoInicio} - ${estudoMetadata.anoFim}`
            : 'N/A',
          'Álbuns': estudoMetadata.albums.length,
          'Modo': estudoMode === 'complete' ? 'Corpus Completo' : `Artista: ${estudoArtist}`
        },
        {
          'Tipo': 'Corpus de Referência',
          'Nome': refMetadata.artista,
          'Total de Músicas': refMetadata.totalMusicas,
          'Total de Palavras': refMetadata.totalPalavras,
          'Palavras Únicas': refMetadata.totalPalavrasUnicas,
          'Riqueza Lexical (%)': (refMetadata.riquezaLexical * 100).toFixed(2),
          'Período': refMetadata.anoInicio 
            ? `${refMetadata.anoInicio} - ${refMetadata.anoFim}`
            : 'N/A',
          'Álbuns': refMetadata.albums.length,
          'Modo': refMode === 'complete' ? 'Corpus Completo' : `Artista: ${refArtist}`
        }
      ]);

      // Sheet 2: Comparação
      const comparacaoSheet = XLSX.utils.json_to_sheet([
        {
          'Métrica': 'Diferença de Riqueza Lexical (%)',
          'Valor': ((estudoMetadata.riquezaLexical - refMetadata.riquezaLexical) * 100).toFixed(2),
          'Interpretação': estudoMetadata.riquezaLexical > refMetadata.riquezaLexical
            ? `${estudoMetadata.artista} é mais rico lexicalmente`
            : `${refMetadata.artista} é mais rico lexicalmente`
        },
        {
          'Métrica': 'Ratio de Tamanho (Estudo/Referência)',
          'Valor': (estudoMetadata.totalPalavras / refMetadata.totalPalavras).toFixed(2),
          'Interpretação': estudoMetadata.totalPalavras > refMetadata.totalPalavras
            ? `Corpus de estudo é ${(estudoMetadata.totalPalavras / refMetadata.totalPalavras).toFixed(1)}x maior`
            : `Corpus de referência é ${(refMetadata.totalPalavras / estudoMetadata.totalPalavras).toFixed(1)}x maior`
        },
        {
          'Métrica': 'Diferença de Palavras Únicas',
          'Valor': estudoMetadata.totalPalavrasUnicas - refMetadata.totalPalavrasUnicas,
          'Interpretação': estudoMetadata.totalPalavrasUnicas > refMetadata.totalPalavrasUnicas
            ? `${estudoMetadata.artista} tem mais ${estudoMetadata.totalPalavrasUnicas - refMetadata.totalPalavrasUnicas} palavras únicas`
            : `${refMetadata.artista} tem mais ${refMetadata.totalPalavrasUnicas - estudoMetadata.totalPalavrasUnicas} palavras únicas`
        },
        {
          'Métrica': 'Densidade Lexical (Palavras Únicas/Música)',
          'Valor': `${(estudoMetadata.totalPalavrasUnicas / estudoMetadata.totalMusicas).toFixed(2)} (Estudo) vs ${(refMetadata.totalPalavrasUnicas / refMetadata.totalMusicas).toFixed(2)} (Ref.)`,
          'Interpretação': (estudoMetadata.totalPalavrasUnicas / estudoMetadata.totalMusicas) >
                           (refMetadata.totalPalavrasUnicas / refMetadata.totalMusicas)
            ? 'Corpus de estudo tem maior densidade lexical por música'
            : 'Corpus de referência tem maior densidade lexical por música'
        }
      ]);

      // Sheet 3: Keywords
      const keywordsSheet = XLSX.utils.json_to_sheet(
        keywordsState.keywords.map((kw, index) => ({
          'Rank': index + 1,
          'Palavra': kw.palavra,
          'Freq. Estudo': kw.freqEstudo,
          'Freq. Referência': kw.freqReferencia,
          'Freq. Norm. Estudo': kw.normFreqEstudo.toFixed(2),
          'Freq. Norm. Referência': kw.normFreqReferencia.toFixed(2),
          'Log-Likelihood (LL)': kw.ll.toFixed(2),
          'Mutual Information (MI)': kw.mi.toFixed(2),
          'Efeito': kw.efeito,
          'Significância': kw.significancia,
          'Outlier?': (kw.ll > 50 || kw.freqEstudo > 200) ? 'SIM' : 'NÃO'
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadados');
      XLSX.utils.book_append_sheet(workbook, comparacaoSheet, 'Comparação');
      XLSX.utils.book_append_sheet(workbook, keywordsSheet, 'Keywords');

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `keywords-analysis-${estudoMetadata.artista.replace(/\s+/g, '-')}-vs-${refMetadata.artista.replace(/\s+/g, '-')}-${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      toast.success(`Excel exportado: ${filename}`, {
        description: `${keywordsState.keywords.length} keywords processadas em 3 sheets`
      });

    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao gerar arquivo Excel', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };
  
  // Compartilhamento via URL
  const updateURLState = useCallback(() => {
    const params = new URLSearchParams();
    
    params.set('tool', 'keywords');
    params.set('ec', estudoCorpusBase);
    params.set('em', estudoMode);
    if (estudoArtist) params.set('ea', estudoArtist);
    
    params.set('rc', refCorpusBase);
    params.set('rm', refMode);
    if (refArtist) params.set('ra', refArtist);
    
    const activeSig = Object.entries(filterSignificancia)
      .filter(([_, active]) => active)
      .map(([sig]) => sig);
    if (activeSig.length > 0 && activeSig.length < 3) {
      params.set('fs', activeSig.join(','));
    }
    
    const activeEfeito = Object.entries(filterEfeito)
      .filter(([_, active]) => active)
      .map(([ef]) => ef);
    if (activeEfeito.length === 1) {
      params.set('fe', activeEfeito[0]);
    }
    
    if (searchTerm.trim()) {
      params.set('st', searchTerm);
    }
    
    setSearchParams(params, { replace: true });
  }, [
    estudoCorpusBase, estudoMode, estudoArtist,
    refCorpusBase, refMode, refArtist,
    filterSignificancia, filterEfeito, searchTerm,
    setSearchParams
  ]);

  useEffect(() => {
    updateURLState();
  }, [updateURLState]);

  // Restaurar estado da URL
  useEffect(() => {
    const ec = searchParams.get('ec') as CorpusType | null;
    const em = searchParams.get('em') as 'complete' | 'artist' | null;
    const ea = searchParams.get('ea');
    const rc = searchParams.get('rc') as CorpusType | null;
    const rm = searchParams.get('rm') as 'complete' | 'artist' | null;
    const ra = searchParams.get('ra');
    const fs = searchParams.get('fs');
    const fe = searchParams.get('fe');
    const st = searchParams.get('st');
    
    if (ec && em && rc && rm) {
      setEstudoCorpusBase(ec);
      setEstudoMode(em);
      if (ea && ea !== 'null') setEstudoArtist(ea);
      
      setRefCorpusBase(rc);
      setRefMode(rm);
      if (ra && ra !== 'null') setRefArtist(ra);
      
      if (fs) {
        const sigs = fs.split(',');
        setFilterSignificancia({
          Alta: sigs.includes('Alta'),
          Média: sigs.includes('Média'),
          Baixa: sigs.includes('Baixa')
        });
      }
      
      if (fe) {
        setFilterEfeito({
          'super-representado': fe === 'super-representado',
          'sub-representado': fe === 'sub-representado'
        });
      }
      
      if (st) {
        setSearchTerm(st);
      }
    }
  }, []);
  
  const handleShareLink = () => {
    const url = window.location.href;
    
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copiado!', {
        description: 'Compartilhe este link para que outras pessoas vejam exatamente esta análise',
        duration: 4000
      });
    }).catch(() => {
      const promptResult = window.prompt('Copie o link abaixo:', url);
      if (promptResult !== null) {
        toast.info('Link de compartilhamento', {
          description: 'Use Ctrl+C para copiar'
        });
      }
    });
  };
  
  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          A análise de Keywords compara as frequências de palavras entre dois corpus para identificar
          palavras-chave estatisticamente significativas usando o teste Log-Likelihood.
        </AlertDescription>
      </Alert>

      {/* Header com Indicador de Salvamento */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Análise de Keywords</h2>
        </div>
        
        <SaveIndicator
          isSaving={saveStatus.isSaving}
          lastSaved={saveStatus.lastSaved}
          error={saveStatus.error}
        />
      </div>

      {/* Menu de Configuração Fixo */}
      <KeywordsConfigPanel />

      <Card data-tour="keywords-config">
        <CardHeader>
          <CardTitle>Configurar Análise</CardTitle>
          <CardDescription>
            Selecione os corpus a serem comparados e processe para gerar a lista de palavras-chave
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="keywords-corpus">
            <CorpusSubcorpusSelector 
              label="Corpus de Estudo"
              corpusBase={estudoCorpusBase}
              onCorpusBaseChange={setEstudoCorpusBase}
              mode={estudoMode}
              onModeChange={setEstudoMode}
              selectedArtist={estudoArtist}
              onArtistChange={setEstudoArtist}
              disabled={isLoading}
            />
            
            <CorpusSubcorpusSelector 
              label="Corpus de Referência"
              corpusBase={refCorpusBase}
              onCorpusBaseChange={setRefCorpusBase}
              mode={refMode}
              onModeChange={setRefMode}
              selectedArtist={refArtist}
              onArtistChange={setRefArtist}
              disabled={isLoading}
            />
          </div>
          
          {/* Estatísticas dos Subcorpora */}
          {/* Alertas de Erro */}
          {errorEstudo && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro - Corpus de Estudo</AlertTitle>
              <AlertDescription>{errorEstudo}</AlertDescription>
            </Alert>
          )}
          
          {errorRef && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro - Corpus de Referência</AlertTitle>
              <AlertDescription>{errorRef}</AlertDescription>
            </Alert>
          )}
          
          {(estudoMetadata || refMetadata) && !isLoadingMetadata && !errorEstudo && !errorRef && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Card de Estatísticas - Corpus de Estudo */}
              {estudoMetadata && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Estatísticas: Corpus de Estudo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Artista/Corpus:</span>
                      <span className="font-semibold text-xs">{estudoMetadata.artista}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total de músicas:</span>
                      <Badge variant="outline">{estudoMetadata.totalMusicas}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total de palavras:</span>
                      <Badge variant="outline">
                        {estudoMetadata.totalPalavras.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Palavras únicas:</span>
                      <Badge variant="outline">
                        {estudoMetadata.totalPalavrasUnicas.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Riqueza Lexical:</span>
                      <Badge variant="secondary">
                        {(estudoMetadata.riquezaLexical * 100).toFixed(2)}%
                      </Badge>
                    </div>
                    {estudoMetadata.anoInicio && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Período:</span>
                        <span className="text-xs">
                          {estudoMetadata.anoInicio} - {estudoMetadata.anoFim}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Card de Estatísticas - Corpus de Referência */}
              {refMetadata && (
                <Card className="border-secondary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Estatísticas: Corpus de Referência
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Artista/Corpus:</span>
                      <span className="font-semibold text-xs">{refMetadata.artista}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total de músicas:</span>
                      <Badge variant="outline">{refMetadata.totalMusicas}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total de palavras:</span>
                      <Badge variant="outline">
                        {refMetadata.totalPalavras.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Palavras únicas:</span>
                      <Badge variant="outline">
                        {refMetadata.totalPalavrasUnicas.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Riqueza Lexical:</span>
                      <Badge variant="secondary">
                        {(refMetadata.riquezaLexical * 100).toFixed(2)}%
                      </Badge>
                    </div>
                    {refMetadata.anoInicio && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Período:</span>
                        <span className="text-xs">
                          {refMetadata.anoInicio} - {refMetadata.anoFim}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {/* Loading skeleton durante carregamento de metadados */}
          {isLoadingMetadata && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </div>
          )}
          
          <Button 
            onClick={handleProcessKeywords}
            disabled={isLoading}
            className="w-full"
            data-tour="keywords-process"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Processar Keywords
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Gráfico Comparativo - COM ANIMAÇÃO */}
      <AnimatedChartWrapper 
        show={analysisConfig.generateComparisonChart && chartData !== null}
        id="comparison-chart"
      >
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Comparação Visual dos Subcorpora</CardTitle>
            </div>
            <CardDescription>
              Análise comparativa de métricas lexicais entre os dois subcorpora selecionados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metrica" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar
                    dataKey={estudoMetadata?.artista || 'Estudo'}
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey={refMetadata?.artista || 'Referência'}
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Insights automáticos */}
            {estudoMetadata && refMetadata && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">Insights da Comparação:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        <strong>Riqueza Lexical:</strong> {
                          estudoMetadata.riquezaLexical > refMetadata.riquezaLexical
                            ? `${estudoMetadata.artista} apresenta maior diversidade vocabular (+${((estudoMetadata.riquezaLexical - refMetadata.riquezaLexical) * 100).toFixed(2)}%)`
                            : `${refMetadata.artista} apresenta maior diversidade vocabular (+${((refMetadata.riquezaLexical - estudoMetadata.riquezaLexical) * 100).toFixed(2)}%)`
                        }
                      </li>
                      <li>
                        <strong>Tamanho do Corpus:</strong> {
                          estudoMetadata.totalPalavras > refMetadata.totalPalavras
                            ? `${estudoMetadata.artista} é ${(estudoMetadata.totalPalavras / refMetadata.totalPalavras).toFixed(1)}x maior`
                            : `${refMetadata.artista} é ${(refMetadata.totalPalavras / estudoMetadata.totalPalavras).toFixed(1)}x maior`
                        }
                      </li>
                      <li>
                        <strong>Densidade Lexical:</strong> {
                          (estudoMetadata.totalPalavrasUnicas / estudoMetadata.totalMusicas).toFixed(0)
                        } palavras únicas/música ({estudoMetadata.artista}) vs {
                          (refMetadata.totalPalavrasUnicas / refMetadata.totalMusicas).toFixed(0)
                        } ({refMetadata.artista})
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedChartWrapper>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}


      {/* Scatter Plot - COM ANIMAÇÃO */}
      <AnimatedChartWrapper 
        show={analysisConfig.generateScatterPlot && isProcessed && scatterData.length > 0}
        id="scatter-plot"
      >
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Dispersão de Keywords: LL vs Frequência</CardTitle>
              </div>
            </div>
            <CardDescription>
              Análise visual da distribuição de palavras-chave. Outliers (canto superior direito) 
              são palavras altamente significativas e frequentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              'super-representado': {
                label: 'Super-representado',
                color: 'hsl(var(--chart-1))',
              },
              'sub-representado': {
                label: 'Sub-representado',
                color: 'hsl(var(--chart-2))',
              }
            }} className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="freqEstudo" 
                    name="Frequência" 
                    label={{ 
                      value: 'Frequência no Corpus de Estudo', 
                      position: 'insideBottom', 
                      offset: -10 
                    }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="ll" 
                    name="Log-Likelihood" 
                    label={{ 
                      value: 'Log-Likelihood (LL)', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }}
                  />
                  <ChartTooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-bold mb-2">{data.palavra}</p>
                          <div className="space-y-1 text-sm">
                            <p>LL: <span className="font-semibold">{data.ll.toFixed(2)}</span></p>
                            <p>Frequência: <span className="font-semibold">{data.freqEstudo}</span></p>
                            <p>Freq. Normalizada: <span className="font-semibold">
                              {data.normFreqEstudo.toFixed(2)}
                            </span></p>
                            <Badge variant={data.efeito === 'super-representado' ? 'default' : 'secondary'}>
                              {data.efeito}
                            </Badge>
                            {data.isOutlier && (
                              <Badge variant="destructive" className="ml-2">Outlier</Badge>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                  />
                  <Scatter 
                    name="Super-representado" 
                    data={scatterData.filter(d => d.efeito === 'super-representado')}
                    fill="hsl(var(--chart-1))"
                  />
                  <Scatter 
                    name="Sub-representado" 
                    data={scatterData.filter(d => d.efeito === 'sub-representado')}
                    fill="hsl(var(--chart-2))"
                  />
                  <ReferenceLine y={50} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Insights automáticos sobre outliers */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Insights da Dispersão:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <strong>Outliers identificados:</strong> {scatterData.filter(d => d.isOutlier).length} palavras 
                      com LL {'>'} 50 ou Frequência {'>'} 200
                    </li>
                    <li>
                      <strong>Top 3 outliers:</strong> {
                        scatterData
                          .filter(d => d.isOutlier)
                          .sort((a, b) => b.ll - a.ll)
                          .slice(0, 3)
                          .map(d => d.palavra)
                          .join(', ') || 'Nenhum'
                      }
                    </li>
                    <li>
                      <strong>Padrão dominante:</strong> {
                        scatterData.filter(d => d.efeito === 'super-representado').length >
                        scatterData.filter(d => d.efeito === 'sub-representado').length
                          ? 'Mais palavras super-representadas (vocabulário distintivo forte)'
                          : 'Mais palavras sub-representadas (corpus de estudo possui léxico mais restrito)'
                      }
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </AnimatedChartWrapper>

      {/* Botões de Exportação */}
      {isProcessed && keywordsState.keywords.length > 0 && estudoMetadata && refMetadata && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exportar Análise</CardTitle>
            <CardDescription>
              Exporte os resultados completos ou compartilhe a análise atual via link
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button 
              onClick={handleExportToExcel} 
              variant="outline"
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Exportar Excel (.xlsx)
            </Button>
            
            <Button 
              onClick={handleShareLink}
              variant="outline"
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar Análise
            </Button>
          </CardContent>
        </Card>
      )}

      {isProcessed && keywordsState.keywords.length > 0 && (
        <Card data-tour="keywords-results">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Palavras-Chave Identificadas</CardTitle>
                <CardDescription>
                  {filteredKeywords.length} palavra{filteredKeywords.length !== 1 ? 's' : ''} após filtros
                </CardDescription>
              </div>
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Buscar palavra</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite para filtrar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>LL Mínimo</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={minLLFilter}
                  onChange={(e) => setMinLLFilter(parseFloat(e.target.value) || 0)}
                  placeholder="3.84"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Filtros Rápidos</Label>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-alta-sig"
                      checked={filterSignificancia.Alta}
                      onCheckedChange={(checked) => 
                        setFilterSignificancia(prev => ({ ...prev, Alta: !!checked }))
                      }
                    />
                    <label htmlFor="filter-alta-sig" className="text-sm cursor-pointer">
                      Alta Significância
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-super"
                      checked={filterEfeito['super-representado']}
                      onCheckedChange={(checked) => 
                        setFilterEfeito(prev => ({ ...prev, 'super-representado': !!checked }))
                      }
                    />
                    <label htmlFor="filter-super" className="text-sm cursor-pointer">
                      Super-representado
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela */}
            <div className="rounded-md border max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('palavra')}
                        className="h-8 px-2"
                      >
                        Palavra
                        {sortColumn === 'palavra' && (
                          sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('freqEstudo')}
                        className="h-8 px-2"
                      >
                        Freq Estudo
                        {sortColumn === 'freqEstudo' && (
                          sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('freqReferencia')}
                        className="h-8 px-2"
                      >
                        Freq Ref
                        {sortColumn === 'freqReferencia' && (
                          sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('ll')}
                              className="h-8 px-2"
                            >
                              LL
                              {sortColumn === 'll' && (
                                sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Log-Likelihood: quanto maior, mais significativa a diferença</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('ll')}
                        className="h-8 px-2"
                      >
                        % Diff
                        {sortColumn === 'll' && (
                          sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Significância</TableHead>
                    <TableHead>Efeito</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeywords.slice(0, 100).map((kw, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleWordClick(kw.palavra)}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                {kw.palavra}
                                <MousePointerClick className="h-3 w-3 opacity-50" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-md p-4" sideOffset={10}>
                              {isLoadingFullCorpus ? (
                                <p className="text-sm text-muted-foreground">Carregando corpus...</p>
                              ) : (() => {
                                const { previews, total } = getKWICPreview(kw.palavra);
                                return previews.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="font-semibold text-sm mb-2">
                                      Preview de Concordâncias ({total} total):
                                    </p>
                                    {previews.map((line, idx) => (
                                      <p key={idx} className="text-xs font-mono leading-relaxed border-l-2 border-primary/30 pl-2">
                                        {line}
                                      </p>
                                    ))}
                                    <p className="text-xs text-muted-foreground mt-3 italic border-t pt-2">
                                      💡 Clique para ver todas as {total} ocorrências no KWIC →
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    Nenhuma ocorrência encontrada
                                  </p>
                                );
                              })()}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">{kw.freqEstudo}</TableCell>
                      <TableCell className="text-right">{kw.freqReferencia}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm">{kw.ll.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const percDiff = ((kw.freqEstudo - kw.freqReferencia) / kw.freqReferencia) * 100;
                          return (
                            <span className={`font-mono text-sm ${percDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {percDiff > 0 ? '+' : ''}{percDiff.toFixed(1)}%
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            kw.significancia === 'Alta' ? 'default' : 
                            kw.significancia === 'Média' ? 'secondary' : 'outline'
                          }
                        >
                          {kw.significancia}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {kw.efeito === 'super-representado' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">{kw.efeito}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWordClick(kw.palavra)}
                        >
                          Ver no KWIC
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredKeywords.length > 100 && (
              <Alert>
                <AlertDescription>
                  Mostrando as primeiras 100 palavras de {filteredKeywords.length} resultados. 
                  Use os filtros para refinar sua busca ou exporte o CSV para ver todos os resultados.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
