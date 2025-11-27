import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getDomainColor } from "@/config/domainColors";
import { 
  BarChart3, 
  FileText, 
  Layers, 
  Hash,
  Table as TableIcon,
  PieChart as PieChartIcon,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Smile,
  Frown,
  TrendingUp,
  TrendingDown,
  Filter,
  X,
  Info,
  ScatterChart as ScatterChartIcon
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { ACADEMIC_RS_COLORS } from "@/config/themeColors";
import { KWICModal } from "@/components/KWICModal";
import { useCorpusData } from "@/hooks/useCorpusData";
import { CorpusKeyword, CorpusAnalysisResult } from "@/services/corpusDataService";
import { toast } from "sonner";
import { useStatisticsTour } from "@/hooks/useStatisticsTour";
import { PlayCircle } from "lucide-react";

type SortColumn = 'palavra' | 'lema' | 'frequenciaBruta' | 'frequenciaNormalizada' | 'prosodia' | 'dominio' | 'll' | 'mi' | 'significancia' | 'efeito' | null;
type SortDirection = 'asc' | 'desc' | null;
type ProsodiaType = 'Positiva' | 'Negativa' | 'Neutra';

interface EnrichedWord {
  palavra: string;
  lema: string;
  frequenciaBruta: number;
  frequenciaNormalizada: number;
  ll: number;
  mi: number;
  significancia: string;
  efeito: string;
  prosodia: ProsodiaType;
  dominio?: string;
  cor?: string;
}

// Cores de prosódia (incluindo Neutra = amarelo)
const PROSODY_COLORS = {
  "Positiva": ACADEMIC_RS_COLORS.verde.main,
  "Negativa": ACADEMIC_RS_COLORS.vermelho.main,
  "Neutra": ACADEMIC_RS_COLORS.amarelo.main
};

interface TabStatisticsProps {
  demo?: boolean;
  preloadedData?: CorpusAnalysisResult;
  songId?: string;
}

export function TabStatistics({ demo = false, preloadedData, songId }: TabStatisticsProps) {
  const { gauchoData: fetchedData, isLoading: isFetching } = useCorpusData({ 
    loadGaucho: !preloadedData && !songId, 
    loadNordestino: false,
    limit: demo ? 1000 : undefined
  });

  const gauchoData = preloadedData || fetchedData;
  const isLoadingCorpus = preloadedData ? false : isFetching;

  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>('frequenciaNormalizada');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [kwicModalOpen, setKwicModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeGraphTab, setActiveGraphTab] = useState<'distribuicao' | 'prosodia' | 'keyness'>('distribuicao');
  const [prosodiaFilter, setProsodiaFilter] = useState<ProsodiaType | 'Todas'>('Todas');
  const [dominioFilter, setDominioFilter] = useState<string>('Todos');
  const [tourEnabled, setTourEnabled] = useState(false);

  // Tour guiado
  useStatisticsTour(tourEnabled);
  
  // Filtros de range
  const [freqRange, setFreqRange] = useState<[number, number]>([0, 100]);
  const [llRange, setLlRange] = useState<[number, number]>([0, 60]);
  const [miRange, setMiRange] = useState<[number, number]>([0, 10]);

  const itemsPerPage = 100;

  const demoData = gauchoData?.keywords || null;
  const demoDomains = gauchoData?.dominios || [];
  const demoStats = gauchoData?.estatisticas || null;
  const isLoadingDemo = isLoadingCorpus;

  // Enriquecer palavras-chave com prosódia
  const palavrasEnriquecidas: EnrichedWord[] = useMemo(() => {
    // Usar dados reais do corpus
    if (demoData) {
      return demoData.map(d => ({
        palavra: d.palavra,
        lema: d.palavra,
        frequenciaBruta: d.frequencia,
        frequenciaNormalizada: d.frequencia,
        ll: d.ll,
        mi: d.mi,
        significancia: d.significancia,
        efeito: d.ll > 15.13 ? 'Forte' : d.ll > 6.63 ? 'Moderado' : 'Fraco',
        prosodia: d.prosody,
        dominio: d.dominio,
        cor: d.cor
      }));
    }

    // Retornar vazio se não houver dados
    return [];
  }, [demoData]);

  // Filtrar por busca + ranges
  const filteredWords = useMemo(() => {
    let filtered = palavrasEnriquecidas;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.palavra.toLowerCase().includes(query) ||
        p.lema.toLowerCase().includes(query)
      );
    }

    filtered = filtered.filter(p =>
      p.frequenciaNormalizada >= freqRange[0] &&
      p.frequenciaNormalizada <= freqRange[1] &&
      p.ll >= llRange[0] &&
      p.ll <= llRange[1] &&
      p.mi >= miRange[0] &&
      p.mi <= miRange[1]
    );

    return filtered;
  }, [palavrasEnriquecidas, searchQuery, freqRange, llRange, miRange]);

  const sortedWords = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredWords;
    return [...filteredWords].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'palavra':
        case 'lema':
        case 'significancia':
        case 'efeito':
        case 'dominio':
          comparison = (a[sortColumn] || '').localeCompare(b[sortColumn] || '');
          break;
        case 'frequenciaBruta':
        case 'frequenciaNormalizada':
        case 'll':
        case 'mi':
          comparison = a[sortColumn] - b[sortColumn];
          break;
        case 'prosodia':
          const prosodiaOrder = { 'Positiva': 0, 'Neutra': 1, 'Negativa': 2 };
          comparison = prosodiaOrder[a.prosodia] - prosodiaOrder[b.prosodia];
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredWords, sortColumn, sortDirection]);

  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedWords.slice(start, start + itemsPerPage);
  }, [sortedWords, currentPage]);

  const totalPages = Math.ceil(sortedWords.length / itemsPerPage);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'desc') setSortDirection('asc');
      else if (sortDirection === 'asc') setSortDirection(null);
      else setSortDirection('desc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFreqRange([0, 6]);
    setLlRange([0, 53]);
    setMiRange([0, 10]);
  };

  const openKWIC = (palavra: string) => {
    setSelectedWord(palavra);
    setKwicModalOpen(true);
  };

  const prosodiaStyles = {
    "Positiva": "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30",
    "Negativa": "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30",
    "Neutra": "bg-muted/20 text-muted-foreground border-border"
  };

  const totalPalavras = demoStats?.totalPalavras || 0;
  const totalDominios = demoDomains.length;
  const totalPalavrasTematicas = demoStats?.palavrasChaveSignificativas || 0;
  const riquezaLexicalMedia = demoDomains.length > 0
    ? Math.round(demoDomains.reduce((acc, d) => acc + d.riquezaLexical, 0) / totalDominios)
    : 0;

  const dominiosChartData = demoDomains.map(d => ({
    dominio: d.dominio,
    percentual: d.percentual,
    riquezaLexical: d.riquezaLexical,
    ocorrencias: d.ocorrencias,
    lemasUnicos: d.palavras.length,
    status: 'equilibrado',
    cor: d.cor
  })).sort((a, b) => b.percentual - a.percentual);

  const palavrasFrequentesData = palavrasEnriquecidas.slice(0, 15).map(p => ({
    palavra: p.palavra,
    frequencia: p.frequenciaNormalizada
  }));

  const prosodiaDistribution = useMemo(() => {
    if (demo && demoStats?.prosodiaDistribution) {
      return [
        { name: 'Positiva', value: demoStats.prosodiaDistribution.positivas, fill: '#16A34A' },
        { name: 'Negativa', value: demoStats.prosodiaDistribution.negativas, fill: '#DC2626' },
        { name: 'Neutra', value: demoStats.prosodiaDistribution.neutras, fill: '#71717A' }
      ];
    }
    
    const positivas = palavrasEnriquecidas.filter(p => p.prosodia === 'Positiva').length;
    const negativas = palavrasEnriquecidas.filter(p => p.prosodia === 'Negativa').length;
    const neutras = palavrasEnriquecidas.filter(p => p.prosodia === 'Neutra').length;
    return [
      { name: 'Positiva', value: positivas, fill: '#16A34A' },
      { name: 'Negativa', value: negativas, fill: '#DC2626' },
      { name: 'Neutra', value: neutras, fill: '#71717A' }
    ];
  }, [palavrasEnriquecidas, demo, demoStats]);

  const top10Positivas = useMemo(() => 
    palavrasEnriquecidas.filter(p => p.prosodia === 'Positiva')
      .sort((a, b) => b.frequenciaNormalizada - a.frequenciaNormalizada).slice(0, 10),
    [palavrasEnriquecidas]
  );

  const top10Negativas = useMemo(() => 
    palavrasEnriquecidas.filter(p => p.prosodia === 'Negativa')
      .sort((a, b) => b.frequenciaNormalizada - a.frequenciaNormalizada).slice(0, 10),
    [palavrasEnriquecidas]
  );

  const sentimentStats = useMemo(() => {
    // Filtrar palavras temáticas (excluir funcionais)
    const palavrasTematicas = palavrasEnriquecidas.filter(p => 
      p.significancia !== 'Funcional'
    );
    
    // Calcular total ponderado por frequência bruta
    const total = palavrasTematicas.reduce((acc, p) => acc + p.frequenciaBruta, 0);
    
    const positivasOcorrencias = palavrasTematicas
      .filter(p => p.prosodia === 'Positiva')
      .reduce((acc, p) => acc + p.frequenciaBruta, 0);
    
    const negativasOcorrencias = palavrasTematicas
      .filter(p => p.prosodia === 'Negativa')
      .reduce((acc, p) => acc + p.frequenciaBruta, 0);
    
    const neutrasOcorrencias = palavrasTematicas
      .filter(p => p.prosodia === 'Neutra')
      .reduce((acc, p) => acc + p.frequenciaBruta, 0);
    
    const stats = {
      positivas: { 
        count: positivasOcorrencias, 
        percent: ((positivasOcorrencias / total) * 100).toFixed(1) 
      },
      negativas: { 
        count: negativasOcorrencias, 
        percent: ((negativasOcorrencias / total) * 100).toFixed(1) 
      },
      neutras: { 
        count: neutrasOcorrencias, 
        percent: ((neutrasOcorrencias / total) * 100).toFixed(1) 
      },
      razao: (positivasOcorrencias / (negativasOcorrencias || 1)).toFixed(2)
    };

    // 🔍 LOG DE VALIDAÇÃO DAS MÉTRICAS
    console.group('📊 VALIDAÇÃO DE MÉTRICAS DE PROSÓDIA');
    console.log('Total de palavras temáticas (tipos):', palavrasTematicas.length);
    console.log('Total de ocorrências (tokens):', total);
    console.log('Positivas:', positivasOcorrencias, `(${stats.positivas.percent}%)`);
    console.log('Negativas:', negativasOcorrencias, `(${stats.negativas.percent}%)`);
    console.log('Neutras:', neutrasOcorrencias, `(${stats.neutras.percent}%)`);
    console.log('Razão Pos/Neg:', stats.razao);
    console.log('\n🔍 Top 10 palavras por prosódia (freq. bruta):');
    const topPorProsodia = {
      Positiva: palavrasTematicas.filter(p => p.prosodia === 'Positiva').sort((a, b) => b.frequenciaBruta - a.frequenciaBruta).slice(0, 10),
      Negativa: palavrasTematicas.filter(p => p.prosodia === 'Negativa').sort((a, b) => b.frequenciaBruta - a.frequenciaBruta).slice(0, 10),
      Neutra: palavrasTematicas.filter(p => p.prosodia === 'Neutra').sort((a, b) => b.frequenciaBruta - a.frequenciaBruta).slice(0, 10)
    };
    console.log('Positivas:', topPorProsodia.Positiva.map(p => `${p.lema}(${p.frequenciaBruta})`).join(', '));
    console.log('Negativas:', topPorProsodia.Negativa.map(p => `${p.lema}(${p.frequenciaBruta})`).join(', '));
    console.log('Neutras:', topPorProsodia.Neutra.map(p => `${p.lema}(${p.frequenciaBruta})`).join(', '));
    console.groupEnd();

    return stats;
  }, [palavrasEnriquecidas]);

  const prosodiaByDomain = useMemo(() => {
    return demoDomains.map(dominio => {
      const palavrasComProsodia = palavrasEnriquecidas.filter(p => p.dominio === dominio.dominio);
      return {
        dominio: dominio.dominio.length > 30 ? dominio.dominio.substring(0, 30) + "..." : dominio.dominio,
        Positiva: palavrasComProsodia.filter(p => p.prosodia === 'Positiva').length,
        Negativa: palavrasComProsodia.filter(p => p.prosodia === 'Negativa').length,
        Neutra: palavrasComProsodia.filter(p => p.prosodia === 'Neutra').length
      };
    }).sort((a, b) => (b.Positiva + b.Negativa + b.Neutra) - (a.Positiva + a.Negativa + a.Neutra));
  }, [demoDomains, palavrasEnriquecidas]);

  const top20LL = useMemo(() => 
    [...palavrasEnriquecidas].sort((a, b) => b.ll - a.ll).slice(0, 20),
    [palavrasEnriquecidas]
  );

  const top20MI = useMemo(() => 
    [...palavrasEnriquecidas].sort((a, b) => b.mi - a.mi).slice(0, 20),
    [palavrasEnriquecidas]
  );

  const scatterData = useMemo(() => 
    palavrasEnriquecidas.map(p => ({
      palavra: p.palavra,
      ll: p.ll,
      mi: p.mi,
      significancia: p.significancia,
      frequencia: p.frequenciaNormalizada,
      ...(demo && { dominio: p.dominio, cor: p.cor })
    })),
    [palavrasEnriquecidas, demo]
  );

  const palavrasPorProsodia = useMemo(() => {
    let filtered = palavrasEnriquecidas;
    
    if (prosodiaFilter !== 'Todas') {
      filtered = filtered.filter(p => p.prosodia === prosodiaFilter);
    }
    
    const withDomain = filtered.map(p => ({
      ...p,
      dominio: p.dominio || 'Sem domínio'
    }));

    if (dominioFilter !== 'Todos') {
      return withDomain.filter(p => p.dominio === dominioFilter);
    }

    return withDomain;
  }, [palavrasEnriquecidas, prosodiaFilter, dominioFilter]);

  const getBarColor = (status: string) => {
    switch (status) {
      case 'super-representado': return ACADEMIC_RS_COLORS.verde.main;
      case 'equilibrado': return ACADEMIC_RS_COLORS.amarelo.main;
      case 'sub-representado': return ACADEMIC_RS_COLORS.vermelho.main;
      default: return ACADEMIC_RS_COLORS.verde.main;
    }
  };


  return (
    <>
      <Tabs defaultValue="tabela" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="tabela" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Tabela Interativa
          </TabsTrigger>
          <TabsTrigger value="visualizacoes" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Visualizações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tabela" className="space-y-4">
          <Card className="card-academic">
            <CardHeader data-tour="stats-header">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tabela de Palavras-Chave</CardTitle>
                  <CardDescription>
                    Análise estatística completa com LL, MI Score e Prosódia
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-base px-4 py-2">
                    {sortedWords.length} palavras
                  </Badge>
                  {demo && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTourEnabled(true)}
                            className="gap-2"
                          >
                            <PlayCircle className="h-4 w-4" />
                            Tour Guiado
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Inicie um tour interativo pelas funcionalidades</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2" data-tour="stats-filters">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar palavra ou lema..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? "bg-primary/10" : ""}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleContent>
                  <Card className="bg-muted/30 border-muted">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Filtros Avançados</CardTitle>
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 gap-2">
                          <X className="h-3 w-3" />
                          Limpar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Frequência Normalizada (%)</label>
                          <span className="text-sm text-muted-foreground">
                            {freqRange[0].toFixed(1)} - {freqRange[1].toFixed(1)}
                          </span>
                        </div>
                        <Slider
                          value={freqRange}
                          onValueChange={(v) => setFreqRange(v as [number, number])}
                          min={0}
                          max={6}
                          step={0.1}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Log-Likelihood (LL)</label>
                          <span className="text-sm text-muted-foreground">
                            {llRange[0].toFixed(0)} - {llRange[1].toFixed(0)}
                          </span>
                        </div>
                        <Slider
                          value={llRange}
                          onValueChange={(v) => setLlRange(v as [number, number])}
                          min={0}
                          max={53}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">MI Score</label>
                          <span className="text-sm text-muted-foreground">
                            {miRange[0].toFixed(1)} - {miRange[1].toFixed(1)}
                          </span>
                        </div>
                        <Slider
                          value={miRange}
                          onValueChange={(v) => setMiRange(v as [number, number])}
                          min={0}
                          max={10}
                          step={0.1}
                          className="w-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              <div className="rounded-lg border overflow-auto max-h-[600px]" data-tour="stats-table">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      {([
                        { 
                          col: 'palavra' as const, 
                          label: 'Palavra',
                          tooltip: 'Forma da palavra como aparece no texto. Clique para ver todas as ocorrências em contexto (KWIC).'
                        },
                        { 
                          col: 'lema' as const, 
                          label: 'Lema',
                          tooltip: 'Forma canônica ou dicionarizada da palavra. Agrupa variações morfológicas (ex: "canta", "cantou", "cantando" → lema "cantar").'
                        },
                        ...(demo ? [{ 
                          col: 'dominio' as const, 
                          label: 'Domínio Semântico',
                          tooltip: 'Categoria temática à qual a palavra pertence (ex: natureza, sentimento, trabalho). Agrupa palavras por campos semânticos relacionados.'
                        }] : []),
                        { 
                          col: 'frequenciaBruta', 
                          label: 'Freq. Bruta',
                          tooltip: 'Número absoluto de ocorrências da palavra no corpus. Indica quantas vezes o termo aparece no texto analisado.'
                        },
                        { 
                          col: 'frequenciaNormalizada', 
                          label: 'Freq. Norm.',
                          tooltip: 'Frequência relativa (%) ajustada pelo tamanho do corpus. Permite comparação entre corpora de tamanhos diferentes.'
                        },
                        { 
                          col: 'll', 
                          label: 'LL',
                          tooltip: 'Log-Likelihood: medida estatística que indica se a diferença de frequência entre corpora é significativa. Valores > 3.84 são estatisticamente significativos (p < 0.05).'
                        },
                        { 
                          col: 'mi', 
                          label: 'MI Score',
                          tooltip: 'Mutual Information: mede a força da associação entre palavra e corpus. Valores positivos indicam maior associação; valores > 3.0 são considerados fortes.'
                        },
                        { 
                          col: 'significancia', 
                          label: 'Significância',
                          tooltip: 'Nível de significância estatística (p-value). Indica a probabilidade de a diferença observada ser aleatória. p < 0.05 é considerado estatisticamente significativo.'
                        },
                        { 
                          col: 'efeito', 
                          label: 'Efeito',
                          tooltip: 'Tamanho do efeito (effect size): magnitude prática da diferença, independente do tamanho da amostra. Pequeno/Médio/Grande indica a relevância linguística da diferença.'
                        },
                        { 
                          col: 'prosodia', 
                          label: 'Prosódia',
                          tooltip: 'Prosódia Semântica: carga avaliativa da palavra. Positiva (🙂) indica significados favoráveis, Negativa (☹️) indica desfavoráveis, Neutra (😐) indica sem carga avaliativa.'
                        }
                      ] as const).map(({ col, label, tooltip }) => (
                        <TableHead key={col} className="bg-background" data-tour={col === 'palavra' ? "stats-sorting" : undefined}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSort(col)}
                                  className="h-8 gap-1 px-2 hover:bg-muted/50 font-semibold"
                                >
                                  {label}
                                  {sortColumn === col ? (sortDirection === 'asc' ? 
                                    <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) :
                                    <ArrowUpDown className="h-4 w-4 opacity-50" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-sm">{tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedWords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={demo ? 10 : 9} className="text-center py-8 text-muted-foreground">
                          {searchQuery || showFilters 
                            ? `Nenhuma palavra encontrada com os filtros aplicados` 
                            : 'Nenhuma palavra encontrada'}
                        </TableCell>
                      </TableRow>
                     ) : paginatedWords.map((p) => (
                      <TableRow key={p.palavra} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <button
                            onClick={() => openKWIC(p.palavra)}
                            className="font-mono font-semibold hover:underline hover:text-primary transition-colors text-left"
                          >
                            {p.palavra}
                          </button>
                        </TableCell>
                        <TableCell className="italic text-muted-foreground">{p.lema}</TableCell>
                        {demo && p.dominio && (
                          <TableCell>
                            <Badge 
                              variant="outline"
                              style={{ borderColor: p.cor, color: p.cor, backgroundColor: `${p.cor}10` }}
                            >
                              {p.dominio}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-right font-mono">{p.frequenciaBruta}</TableCell>
                        <TableCell className="text-right font-mono">{p.frequenciaNormalizada.toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-primary">{p.ll.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-primary">{p.mi.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              p.significancia === 'Alta' ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                              p.significancia === 'Média' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' :
                              'bg-muted/20 text-muted-foreground border-border'
                            }
                          >
                            {p.significancia}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {p.efeito === 'Atração' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm">{p.efeito}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={prosodiaStyles[p.prosodia]}>
                            {p.prosodia}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próximo
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="visualizacoes" className="space-y-6">
          <Tabs value={activeGraphTab} onValueChange={(v) => setActiveGraphTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="distribuicao">Distribuição Textual</TabsTrigger>
              <TabsTrigger value="prosodia">Análise de Prosódia</TabsTrigger>
              <TabsTrigger value="keyness">Keyness Estatística</TabsTrigger>
            </TabsList>

            <TabsContent value="distribuicao" className="space-y-8 mt-6" data-tour="stats-charts">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Estatísticas-Chave do Corpus</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    { 
                      icon: FileText, 
                      label: 'Total de Palavras', 
                      value: totalPalavras,
                      tooltip: {
                        title: 'Total de Palavras',
                        description: 'Número total de palavras (tokens) presentes no corpus analisado, incluindo todas as ocorrências de cada palavra.'
                      }
                    },
                    { 
                      icon: Layers, 
                      label: 'Domínios Semânticos', 
                      value: totalDominios,
                      tooltip: {
                        title: 'Domínios Semânticos',
                        description: 'Categorias temáticas identificadas na análise do corpus, agrupando palavras com significados relacionados.'
                      }
                    },
                    { 
                      icon: Hash, 
                      label: 'Palavras Temáticas', 
                      value: totalPalavrasTematicas,
                      tooltip: {
                        title: 'Palavras Temáticas',
                        description: 'Palavras de conteúdo que carregam significado temático, excluindo palavras funcionais (artigos, preposições, conjunções). Calculado como: 212 palavras totais - 95 funcionais = 117 temáticas.'
                      }
                    },
                    { 
                      icon: BarChart3, 
                      label: 'Riqueza Lexical Média', 
                      value: riquezaLexicalMedia,
                      tooltip: {
                        title: 'Riqueza Lexical Média',
                        description: 'Média da diversidade de vocabulário em cada domínio semântico. Valores mais altos indicam maior variedade de palavras únicas por domínio.'
                      }
                    }
                  ].map(({ icon: Icon, label, value, tooltip }) => (
                    <HoverCard key={label}>
                      <HoverCardTrigger asChild>
                        <Card className="card-academic cursor-help hover:border-primary/50 transition-colors">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">{label}</p>
                                <p className="text-2xl font-bold">{value}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Info className="h-4 w-4 text-primary" />
                            {tooltip.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {tooltip.description}
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Distribuição Textual</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="card-academic">
                    <CardHeader>
                      <CardTitle className="text-base">Distribuição de Domínios Semânticos</CardTitle>
                      <CardDescription>Percentual temático por domínio</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={500}>
                        <BarChart 
                          data={dominiosChartData} 
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            type="category" 
                            dataKey="dominio" 
                            width={170}
                            tick={{ fontSize: 12 }}
                          />
                          <RechartsTooltip 
                            content={({ payload }) => {
                              if (!payload?.[0]) return null;
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover p-4 rounded-lg border shadow-lg max-w-sm">
                                  <p className="font-semibold text-base mb-2">{data.dominio}</p>
                                  <div className="space-y-1 text-sm">
                                    <p>Percentual: <span className="font-mono font-semibold">{data.percentual.toFixed(2)}%</span></p>
                                    <p>Ocorrências: <span className="font-mono">{data.ocorrencias}</span></p>
                                    <p>Lemas Únicos: <span className="font-mono">{data.lemasUnicos}</span></p>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="percentual" radius={[0, 8, 8, 0]}>
                            {dominiosChartData.map((entry, i) => (
                              <Cell 
                                key={i} 
                                fill={demo && entry.cor ? entry.cor : getDomainColor(entry.dominio)} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="card-academic">
                    <CardHeader>
                      <CardTitle className="text-base">Top 15 Palavras Mais Frequentes</CardTitle>
                      <CardDescription>Frequência normalizada (ocorrências por 100 palavras)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={600}>
                        <BarChart 
                          data={palavrasFrequentesData} 
                          layout="horizontal"
                          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            dataKey="palavra" 
                            type="category" 
                            width={90}
                            tick={{ fontSize: 14 }}
                          />
                          <RechartsTooltip 
                            content={({ payload }) => {
                              if (!payload?.[0]) return null;
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover p-3 rounded-lg border shadow-lg">
                                  <p className="font-semibold text-lg mb-1">{data.palavra}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Frequência: <span className="font-mono font-semibold">{data.frequencia.toFixed(2)}%</span>
                                  </p>
                                </div>
                              );
                            }}
                          />
                          <Bar 
                            dataKey="frequencia" 
                            fill={ACADEMIC_RS_COLORS.verde.main}
                            radius={[0, 8, 8, 0]}
                          >
                            {palavrasFrequentesData.map((entry, index) => {
                              const colors = [
                                ACADEMIC_RS_COLORS.verde.main,
                                ACADEMIC_RS_COLORS.amarelo.main,
                                ACADEMIC_RS_COLORS.vermelho.light
                              ];
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={colors[index % 3]} 
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Riqueza Lexical por Domínio</h3>
                <Card className="card-academic">
                  <CardContent className="pt-6">
                    <div className="rounded-lg border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Domínio</TableHead>
                            <TableHead className="text-right">Lemas Únicos</TableHead>
                            <TableHead className="text-right">Ocorrências</TableHead>
                            <TableHead className="text-right">Riqueza (%)</TableHead>
                            <TableHead className="text-right">Peso Textual (%)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dominiosChartData.map((d) => (
                            <TableRow key={d.dominio}>
                              <TableCell className="font-medium">{d.dominio}</TableCell>
                              <TableCell className="text-right font-mono">{d.lemasUnicos}</TableCell>
                              <TableCell className="text-right font-mono">{d.ocorrencias}</TableCell>
                              <TableCell className="text-right font-mono font-semibold text-primary">
                                {d.riquezaLexical.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {d.percentual.toFixed(2)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="prosodia" className="space-y-8 mt-6">
              {/* Métricas de Sentimento */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Métricas de Sentimento</h3>
                <Card className="card-academic">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Palavras Positivas', count: sentimentStats.positivas.count, 
                          percent: sentimentStats.positivas.percent, bg: '#16A34A', color: '#16A34A' },
                        { label: 'Palavras Negativas', count: sentimentStats.negativas.count, 
                          percent: sentimentStats.negativas.percent, bg: '#DC2626', color: '#DC2626' },
                        { label: 'Palavras Neutras', count: sentimentStats.neutras.count, 
                          percent: sentimentStats.neutras.percent, bg: '#71717A', color: '#71717A' },
                        { label: 'Razão Pos/Neg', count: sentimentStats.razao, 
                          percent: `Tom ${Number(sentimentStats.razao) > 1 ? 'positivo' : 'negativo'}`, 
                          bg: 'transparent', color: Number(sentimentStats.razao) > 1 ? '#16A34A' : '#DC2626' }
                      ].map(({ label, count, percent, bg, color }) => (
                        <div key={label} className="rounded-lg border p-4" 
                          style={{ backgroundColor: bg !== 'transparent' ? `${bg}0D` : undefined }}>
                          <p className="text-sm text-muted-foreground mb-1">{label}</p>
                          <p className="text-2xl font-bold" style={{ color }}>
                            {count}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {typeof percent === 'string' && !percent.includes('Tom') ? `${percent}% do total` : percent}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Distribuição de Prosódia */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Distribuição de Prosódia Semântica</h3>
                <Card className="card-academic">
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie 
                          data={prosodiaDistribution} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%"
                          outerRadius={100} 
                          label={(e) => `${e.name}: ${e.value} (${((e.value / palavrasEnriquecidas.length) * 100).toFixed(1)}%)`}
                        >
                          {prosodiaDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Top 10 Positivas e Negativas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Top 10 Palavras por Prosódia</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { data: top10Positivas, title: 'Top 10 Palavras Positivas', icon: Smile, color: '#16A34A' },
                    { data: top10Negativas, title: 'Top 10 Palavras Negativas', icon: Frown, color: '#DC2626' }
                  ].map(({ data, title, icon: Icon, color }) => (
                    <Card key={title} className="card-academic">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Icon className="h-5 w-5" style={{ color }} />
                          {title}
                        </CardTitle>
                        <CardDescription>
                          Ordenadas por frequência normalizada (ocorrências por 100 palavras)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-2">
                          {data.map((p, i) => (
                            <li key={p.palavra} className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span className="font-semibold text-muted-foreground w-6">{i + 1}.</span>
                                <span className="font-mono font-semibold">{p.palavra}</span>
                              </span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant="outline" 
                                      style={{ 
                                        backgroundColor: `${color}10`, 
                                        color, 
                                        borderColor: `${color}30` 
                                      }}
                                      className="cursor-help"
                                    >
                                      {p.frequenciaNormalizada.toFixed(2)}%
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-semibold">Frequência Normalizada</p>
                                    <p className="text-xs">Ocorrências por 100 palavras do corpus</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Prosódia por Domínio */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Prosódia por Domínio Semântico</h3>
                <Card className="card-academic">
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={prosodiaByDomain} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="dominio" width={180} />
                        <RechartsTooltip />
                        <Bar dataKey="Positiva" stackId="a" fill="#16A34A" />
                        <Bar dataKey="Negativa" stackId="a" fill="#DC2626" />
                        <Bar dataKey="Neutra" stackId="a" fill="#71717A" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela de Palavras por Prosódia (com filtros) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Palavras por Prosódia</h3>
                <Card className="card-academic">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium">Filtrar por Prosódia:</label>
                        <div className="flex gap-2 mt-2">
                          {(['Todas', 'Positiva', 'Negativa', 'Neutra'] as const).map((tipo) => (
                            <Button
                              key={tipo}
                              variant={prosodiaFilter === tipo ? "default" : "outline"}
                              size="sm"
                              onClick={() => setProsodiaFilter(tipo)}
                            >
                              {tipo}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium">Filtrar por Domínio:</label>
                        <select
                          value={dominioFilter}
                          onChange={(e) => setDominioFilter(e.target.value)}
                          className="w-full mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="Todos">Todos</option>
                          {demoDomains.map((d) => (
                            <option key={d.dominio} value={d.dominio}>{d.dominio}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border overflow-auto max-h-[400px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead>Palavra</TableHead>
                            <TableHead>Lema</TableHead>
                            <TableHead>Prosódia</TableHead>
                            <TableHead>Domínio</TableHead>
                            <TableHead className="text-right">Freq. Norm.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {palavrasPorProsodia.slice(0, 50).map((p) => (
                            <TableRow key={p.palavra}>
                              <TableCell className="font-mono font-semibold">{p.palavra}</TableCell>
                              <TableCell className="italic text-muted-foreground">{p.lema}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={prosodiaStyles[p.prosodia]}>
                                  {p.prosodia}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{p.dominio}</TableCell>
                              <TableCell className="text-right font-mono">
                                {p.frequenciaNormalizada.toFixed(2)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {palavrasPorProsodia.length > 50 && (
                      <p className="text-sm text-muted-foreground text-center mt-4">
                        Mostrando 50 de {palavrasPorProsodia.length} palavras
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="keyness" className="space-y-8 mt-6">
              {/* Card Explicativo */}
              <Card className="card-academic bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    O que significam LL e MI Score?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Log-Likelihood (LL):</h4>
                    <p className="text-sm text-muted-foreground">
                      Mede a significância estatística da diferença de frequência entre o corpus de estudo 
                      e o corpus de referência. Valores altos ({">"}3.84) indicam que a palavra é distintiva 
                      do corpus analisado. Quanto maior o valor, mais "característica" a palavra é do corpus.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Mutual Information (MI):</h4>
                    <p className="text-sm text-muted-foreground">
                      Mede a força da associação de uma palavra com o corpus de estudo. Valores altos indicam 
                      que quando a palavra aparece, ela é muito característica daquele contexto específico. 
                      O MI Score complementa o LL ao mostrar a "força" da associação além da frequência.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Top 20 LL e MI Score com Gráficos de Barras */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Top 20 por Keyness</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Top 20 LL */}
                  <Card className="card-academic">
                    <CardHeader>
                      <CardTitle className="text-base">Top 20 Log-Likelihood (LL)</CardTitle>
                      <CardDescription>Palavras mais estatisticamente significativas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={500}>
                        <BarChart data={top20LL} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="palavra" width={100} />
                          <RechartsTooltip />
                          <Bar dataKey="ll" radius={[0, 4, 4, 0]}>
                            {top20LL.map((entry, i) => (
                              <Cell 
                                key={i} 
                                fill={
                                  entry.significancia === 'Alta' ? ACADEMIC_RS_COLORS.verde.main :
                                  entry.significancia === 'Média' ? ACADEMIC_RS_COLORS.amarelo.main :
                                  ACADEMIC_RS_COLORS.vermelho.light
                                } 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top 20 MI Score */}
                  <Card className="card-academic">
                    <CardHeader>
                      <CardTitle className="text-base">Top 20 MI Score</CardTitle>
                      <CardDescription>Palavras com maior força de associação</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={500}>
                        <BarChart data={top20MI} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="palavra" width={100} />
                          <RechartsTooltip />
                          <Bar dataKey="mi" radius={[0, 4, 4, 0]}>
                            {top20MI.map((entry, i) => (
                              <Cell 
                                key={i} 
                                fill={
                                  entry.significancia === 'Alta' ? ACADEMIC_RS_COLORS.verde.main :
                                  entry.significancia === 'Média' ? ACADEMIC_RS_COLORS.amarelo.main :
                                  ACADEMIC_RS_COLORS.vermelho.light
                                } 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Scatter Plot LL vs MI */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dispersão: LL vs MI Score</h3>
                <Card className="card-academic">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ScatterChartIcon className="h-5 w-5" />
                      Relação entre Log-Likelihood e MI Score
                    </CardTitle>
                    <CardDescription>
                      Cada ponto representa uma palavra. Tamanho do ponto = frequência. Palavras no canto superior direito têm alta 
                      significância estatística (LL) e forte associação (MI).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={600}>
                      <ScatterChart margin={{ top: 20, right: 30, bottom: 80, left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          dataKey="ll" 
                          name="Log-Likelihood"
                          label={{ 
                            value: 'Log-Likelihood (LL)', 
                            position: 'insideBottom', 
                            offset: -20,
                            style: { fontSize: 14, fontWeight: 600 }
                          }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="mi" 
                          name="MI Score"
                          label={{ 
                            value: 'MI Score', 
                            angle: -90, 
                            position: 'insideLeft',
                            offset: -10,
                            style: { fontSize: 14, fontWeight: 600 }
                          }}
                        />
                        <ZAxis type="number" dataKey="frequencia" range={[80, 500]} name="Freq. Norm." />
                        <RechartsTooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover border rounded-lg p-4 shadow-lg max-w-xs">
                                  <p className="font-semibold text-lg mb-2">{data.palavra}</p>
                                  {demo && data.dominio && (
                                    <Badge 
                                      variant="outline" 
                                      className="mb-3"
                                      style={{ borderColor: data.cor, color: data.cor }}
                                    >
                                      {data.dominio}
                                    </Badge>
                                  )}
                                  <div className="space-y-1 text-sm">
                                    <p className="text-muted-foreground">LL: <span className="font-mono font-semibold text-foreground">{data.ll.toFixed(2)}</span></p>
                                    <p className="text-muted-foreground">MI: <span className="font-mono font-semibold text-foreground">{data.mi.toFixed(2)}</span></p>
                                    <p className="text-muted-foreground">Frequência: <span className="font-mono font-semibold text-foreground">{data.frequencia.toFixed(2)}%</span></p>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={`mt-3 ${
                                      data.significancia === 'Alta' ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                                      data.significancia === 'Média' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' :
                                      'bg-muted/20 text-muted-foreground border-border'
                                    }`}
                                  >
                                    {data.significancia}
                                  </Badge>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter 
                          name="Palavras" 
                          data={scatterData}
                          fill="#8b5cf6"
                        >
                          {demo ? (
                            scatterData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.cor || '#8b5cf6'} />
                            ))
                          ) : (
                            scatterData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={
                                  entry.significancia === 'Alta' ? ACADEMIC_RS_COLORS.verde.main :
                                  entry.significancia === 'Média' ? ACADEMIC_RS_COLORS.amarelo.main :
                                  ACADEMIC_RS_COLORS.vermelho.light
                                }
                              />
                            ))
                          )}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                {/* Legenda Explicativa */}
                <Card className="card-academic">
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                        <div className="w-4 h-4 rounded-full bg-green-600 mx-auto mb-2" />
                        <p className="font-semibold text-sm">Alta Significância</p>
                        <p className="text-xs text-muted-foreground mt-1">LL &gt; 15.13</p>
                        <p className="text-xs text-muted-foreground">p &lt; 0.001</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                        <div className="w-4 h-4 rounded-full bg-yellow-600 mx-auto mb-2" />
                        <p className="font-semibold text-sm">Média Significância</p>
                        <p className="text-xs text-muted-foreground mt-1">LL: 6.63 - 15.13</p>
                        <p className="text-xs text-muted-foreground">p &lt; 0.01</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg border">
                        <div className="w-4 h-4 rounded-full bg-muted-foreground mx-auto mb-2" />
                        <p className="font-semibold text-sm">Baixa Significância</p>
                        <p className="text-xs text-muted-foreground mt-1">LL: 3.84 - 6.63</p>
                        <p className="text-xs text-muted-foreground">p &lt; 0.05</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <KWICModal 
        open={kwicModalOpen} 
        onOpenChange={setKwicModalOpen} 
        word={selectedWord}
        data={[]} 
      />
    </>
  );
}
