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
import { Download, Search, Play, Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, MousePointerClick, Music, AlertCircle, BarChart3, Lightbulb, FileJson, FileDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { KeywordEntry, CorpusType } from "@/data/types/corpus-tools.types";
import { SubcorpusMetadata } from "@/data/types/subcorpus.types";
import { useTools } from "@/contexts/ToolsContext";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { toast } from "sonner";
import { CorpusSubcorpusSelector } from "@/components/corpus/CorpusSubcorpusSelector";
import { loadFullTextCorpus } from "@/lib/fullTextParser";

export function KeywordsTool() {
  useFeatureTour('keywords', keywordsTourSteps);
  
  // Estado para Corpus de Estudo
  const [estudoCorpusBase, setEstudoCorpusBase] = useState<CorpusType>('gaucho');
  const [estudoMode, setEstudoMode] = useState<'complete' | 'artist'>('complete');
  const [estudoArtist, setEstudoArtist] = useState<string | null>(null);
  
  // Estado para Corpus de Referência
  const [refCorpusBase, setRefCorpusBase] = useState<CorpusType>('nordestino');
  const [refMode, setRefMode] = useState<'complete' | 'artist'>('complete');
  const [refArtist, setRefArtist] = useState<string | null>(null);
  
  // Estados para metadados
  const [estudoMetadata, setEstudoMetadata] = useState<SubcorpusMetadata | null>(null);
  const [refMetadata, setRefMetadata] = useState<SubcorpusMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [errorEstudo, setErrorEstudo] = useState<string | null>(null);
  const [errorRef, setErrorRef] = useState<string | null>(null);
  
  const { keywords, isLoading, error, isProcessed, processKeywords } = useKeywords();
  const { navigateToKWIC } = useTools();
  const { currentMetadata, selection } = useSubcorpus();
  
  // Dados para o gráfico comparativo
  const chartData = useMemo(() => {
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
  }, [estudoMetadata, refMetadata]);

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
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSignificancia, setFilterSignificancia] = useState({
    Alta: true,
    Média: true,
    Baixa: true
  });
  const [filterEfeito, setFilterEfeito] = useState({
    'super-representado': true,
    'sub-representado': true
  });
  const [sortColumn, setSortColumn] = useState<keyof KeywordEntry>('ll');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [minLLFilter, setMinLLFilter] = useState<number>(3.84);
  
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
    return keywords
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
  }, [keywords, searchTerm, filterSignificancia, filterEfeito, sortColumn, sortDirection, minLLFilter]);
  
  const handleSort = (column: keyof KeywordEntry) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
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
    navigateToKWIC(palavra);
  };
  
  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          A análise de Keywords compara as frequências de palavras entre dois corpus para identificar
          palavras-chave estatisticamente significativas usando o teste Log-Likelihood.
        </AlertDescription>
      </Alert>

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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessed && keywords.length > 0 && (
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
                        <button
                          onClick={() => handleWordClick(kw.palavra)}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {kw.palavra}
                          <MousePointerClick className="h-3 w-3 opacity-50" />
                        </button>
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
