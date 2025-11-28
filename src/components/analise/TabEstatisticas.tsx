import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboardAnaliseContext } from '@/contexts/DashboardAnaliseContext';
import { BarChart3, PieChart, TrendingUp, AlertCircle, ArrowUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { KWICModal } from '@/components/KWICModal';
import { useKWICFromStudySong } from '@/hooks/useKWICFromStudySong';
import { useAnalysisTracking } from '@/hooks/useAnalysisTracking';

type SortColumn = 'palavra' | 'lema' | 'frequenciaBruta' | 'frequenciaNormalizada' | 'prosodia' | 'dominio' | 'll' | 'mi' | 'significancia' | null;
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

export function TabEstatisticas() {
  const { processamentoData } = useDashboardAnaliseContext();
  const { trackFeatureUsage } = useAnalysisTracking();
  const stats = processamentoData.analysisResults?.estatisticas;
  const dominios = processamentoData.analysisResults?.dominios || [];
  const keywords = processamentoData.analysisResults?.keywords || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>('frequenciaNormalizada');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const { isOpen, selectedWord, kwicData, isLoading, openModal, closeModal, loadSongData, isReady } = useKWICFromStudySong();

  // Carregar letra da música de estudo quando processamento estiver completo
  useEffect(() => {
    if (processamentoData.isProcessed && processamentoData.studySong) {
      loadSongData(processamentoData.studySong);
    }
  }, [processamentoData.isProcessed, processamentoData.studySong, loadSongData]);

  // Track statistics explored
  useEffect(() => {
    if (processamentoData.isProcessed && stats) {
      trackFeatureUsage('statistics_explored');
    }
  }, [processamentoData.isProcessed, stats, trackFeatureUsage]);

  if (!processamentoData.isProcessed || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estatísticas Linguísticas
          </CardTitle>
          <CardDescription>
            Métricas quantitativas sobre o corpus analisado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Processe um corpus na aba <strong>Processamento</strong> para visualizar as estatísticas linguísticas.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const ttr = ((stats.palavrasUnicas / stats.totalPalavras) * 100).toFixed(1);

  // Enriquecer palavras-chave com prosódia
  const palavrasEnriquecidas: EnrichedWord[] = useMemo(() => {
    if (keywords) {
      return keywords.map(k => ({
        palavra: k.palavra,
        lema: k.palavra,
        frequenciaBruta: k.frequencia,
        frequenciaNormalizada: k.frequencia,
        ll: k.ll,
        mi: k.mi,
        significancia: k.significancia,
        efeito: k.ll > 15.13 ? 'Forte' : k.ll > 6.63 ? 'Moderado' : 'Fraco',
        prosodia: (k.prosody as ProsodiaType) || 'Neutra',
        dominio: k.dominio,
        cor: k.cor
      }));
    }
    return [];
  }, [keywords]);

  // Filtrar por busca
  const filteredWords = useMemo(() => {
    let filtered = palavrasEnriquecidas;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.palavra.toLowerCase().includes(query) ||
        p.lema.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [palavrasEnriquecidas, searchQuery]);

  const sortedWords = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredWords;
    return [...filteredWords].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'palavra':
        case 'lema':
        case 'significancia':
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

  const prosodiaStyles = {
    "Positiva": "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30",
    "Negativa": "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30",
    "Neutra": "bg-muted/20 text-muted-foreground border-border"
  };

  return (
    <div className="space-y-4">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">Total de Palavras</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPalavras.toLocaleString()}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Número total de palavras (tokens) presentes no corpus</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">Palavras Únicas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.palavrasUnicas.toLocaleString()}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Quantidade de palavras diferentes (types) no corpus</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">TTR (%)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ttr}%</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Type-Token Ratio: medida de diversidade lexical do texto</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">Domínios</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.dominiosIdentificados}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Número de domínios semânticos identificados no corpus</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Distribuição por Domínio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Distribuição por Domínio
          </CardTitle>
          <CardDescription>
            Peso textual de cada domínio semântico no corpus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dominios.slice(0, 8).map((dominio, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dominio.cor }}
                    />
                    <span className="font-medium">{dominio.dominio}</span>
                  </div>
                  <span className="font-semibold">{dominio.percentual}%</span>
                </div>
                <Progress 
                  value={dominio.percentual} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribuição de Prosódia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChart className="h-4 w-4" />
            Prosódia Semântica
          </CardTitle>
          <CardDescription>
            Distribuição do sentimento das palavras-chave
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center space-y-1 cursor-help">
                      <div className="text-2xl font-bold text-green-500">
                        {stats.prosodiaDistribution.percentualPositivo}%
                      </div>
                      <div className="text-xs text-muted-foreground">Positivas</div>
                      <div className="text-xs text-muted-foreground">
                        ({stats.prosodiaDistribution.positivas} palavras)
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Palavras com carga avaliativa positiva (elogios, qualidades)</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center space-y-1 cursor-help">
                      <div className="text-2xl font-bold text-red-500">
                        {stats.prosodiaDistribution.percentualNegativo}%
                      </div>
                      <div className="text-xs text-muted-foreground">Negativas</div>
                      <div className="text-xs text-muted-foreground">
                        ({stats.prosodiaDistribution.negativas} palavras)
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Palavras com carga avaliativa negativa (críticas, problemas)</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center space-y-1 cursor-help">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {stats.prosodiaDistribution.percentualNeutro}%
                      </div>
                      <div className="text-xs text-muted-foreground">Neutras</div>
                      <div className="text-xs text-muted-foreground">
                        ({stats.prosodiaDistribution.neutras} palavras)
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Palavras sem carga avaliativa evidente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex h-4 rounded-full overflow-hidden">
              <div 
                className="bg-green-500" 
                style={{ width: `${stats.prosodiaDistribution.percentualPositivo}%` }}
              />
              <div 
                className="bg-red-500" 
                style={{ width: `${stats.prosodiaDistribution.percentualNegativo}%` }}
              />
              <div 
                className="bg-muted" 
                style={{ width: `${stats.prosodiaDistribution.percentualNeutro}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Interativa de Palavras-Chave */}
      <Card className="card-academic">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tabela de Palavras-Chave</CardTitle>
              <CardDescription>
                Análise estatística completa com LL, MI Score e Prosódia
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-base px-4 py-2">
              {sortedWords.length} palavras
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar palavra ou lema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('palavra')}>
                          <div className="flex items-center gap-2">
                            Palavra
                            {sortColumn === 'palavra' && <ArrowUpDown className="h-3 w-3" />}
                          </div>
                        </TableHead>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clique para ordenar por palavra</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('dominio')}>
                          <div className="flex items-center gap-2">
                            Domínio
                            {sortColumn === 'dominio' && <ArrowUpDown className="h-3 w-3" />}
                          </div>
                        </TableHead>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Domínio semântico da palavra</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TableHead className="cursor-pointer hover:bg-muted/50 text-center" onClick={() => handleSort('frequenciaNormalizada')}>
                          <div className="flex items-center justify-center gap-2">
                            Freq. (%)
                            {sortColumn === 'frequenciaNormalizada' && <ArrowUpDown className="h-3 w-3" />}
                          </div>
                        </TableHead>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Frequência normalizada no corpus</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TableHead className="cursor-pointer hover:bg-muted/50 text-center" onClick={() => handleSort('ll')}>
                          <div className="flex items-center justify-center gap-2">
                            LL
                            {sortColumn === 'll' && <ArrowUpDown className="h-3 w-3" />}
                          </div>
                        </TableHead>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Log-Likelihood: significância estatística da palavra-chave</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TableHead className="cursor-pointer hover:bg-muted/50 text-center" onClick={() => handleSort('mi')}>
                          <div className="flex items-center justify-center gap-2">
                            MI
                            {sortColumn === 'mi' && <ArrowUpDown className="h-3 w-3" />}
                          </div>
                        </TableHead>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mutual Information: força de associação da palavra</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('prosodia')}>
                          <div className="flex items-center gap-2">
                            Prosódia
                            {sortColumn === 'prosodia' && <ArrowUpDown className="h-3 w-3" />}
                          </div>
                        </TableHead>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Carga avaliativa: Positiva, Negativa ou Neutra</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWords.map((palavra, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <button
                        onClick={() => {
                          trackFeatureUsage('kwic_used');
                          openModal(palavra.palavra);
                        }}
                        className="font-medium hover:underline hover:text-primary transition-colors"
                        disabled={!isReady}
                      >
                        {palavra.palavra}
                      </button>
                    </TableCell>
                    <TableCell>
                      {palavra.dominio && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: palavra.cor }}
                          />
                          <span className="text-xs truncate max-w-[150px]">
                            {palavra.dominio}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {palavra.frequenciaNormalizada.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {palavra.ll.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {palavra.mi.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={prosodiaStyles[palavra.prosodia]}>
                        {palavra.prosodia}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KWIC Modal */}
      <KWICModal
        open={isOpen}
        onOpenChange={closeModal}
        word={selectedWord}
        data={kwicData}
      />
    </div>
  );
}
