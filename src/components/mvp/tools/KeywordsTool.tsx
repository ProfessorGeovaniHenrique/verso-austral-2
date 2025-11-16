import { useState, useMemo } from "react";
import { useKeywords } from "@/hooks/useKeywords";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Play, Loader2, FileSearch, AlertCircle, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
import { KeywordEntry, CorpusType, CORPUS_CONFIG } from "@/data/types/corpus-tools.types";

export function KeywordsTool() {
  const [corpusEstudo, setCorpusEstudo] = useState<CorpusType>('gaucho');
  const [corpusReferencia, setCorpusReferencia] = useState<CorpusType>('nordestino');
  const { keywords, isLoading, error, isProcessed, processKeywords } = useKeywords();
  
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
  
  // Filter and sort keywords
  const filteredKeywords = useMemo(() => {
    return keywords
      .filter(kw => {
        // Search filter
        if (searchTerm && !kw.palavra.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        // Significance filter
        if (!filterSignificancia[kw.significancia]) {
          return false;
        }
        
        // Effect filter
        if (!filterEfeito[kw.efeito]) {
          return false;
        }
        
        // LL threshold filter
        if (kw.ll < minLLFilter) {
          return false;
        }
        
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
  
  const handleExportCSV = () => {
    const estudoLabel = CORPUS_CONFIG[corpusEstudo].label;
    const referenciaLabel = CORPUS_CONFIG[corpusReferencia].label;
    
    const csv = [
      ['Rank', 'Palavra', 'Freq Estudo', 'Freq Referência', 'Norm Freq Estudo', 'Norm Freq Referência', 'Log-Likelihood', 'MI Score', 'Efeito', 'Significância'].join(','),
      ...filteredKeywords.map((kw, idx) => [
        idx + 1,
        kw.palavra,
        kw.freqEstudo,
        kw.freqReferencia,
        kw.normFreqEstudo.toFixed(2),
        kw.normFreqReferencia.toFixed(2),
        kw.ll.toFixed(2),
        kw.mi.toFixed(3),
        kw.efeito,
        kw.significancia
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `keywords_${corpusEstudo}_vs_${corpusReferencia}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };
  
  const isValidSelection = corpusEstudo !== corpusReferencia;
  
  return (
    <div className="space-y-6">
      {/* Cabeçalho com descrição */}
      <div className="bg-muted/30 p-4 rounded-lg border border-border">
        <h3 className="font-semibold mb-2 text-lg">Análise de Palavras-Chave</h3>
        <p className="text-sm text-muted-foreground">
          Compare dois corpus para identificar palavras estatisticamente significativas usando Log-Likelihood (LL) 
          e Mutual Information (MI). Palavras com LL &gt; 15.13 têm alta significância estatística (p &lt; 0.0001).
        </p>
      </div>
      
      {/* Grid de seletores */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Corpus de Estudo */}
          <div className="space-y-2">
            <Label htmlFor="corpus-estudo" className="text-sm font-semibold">
              {CORPUS_CONFIG[corpusEstudo].icon} Corpus de Estudo
            </Label>
            <Select value={corpusEstudo} onValueChange={(v) => setCorpusEstudo(v as CorpusType)}>
              <SelectTrigger id="corpus-estudo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CORPUS_CONFIG) as CorpusType[]).map(corpus => (
                  <SelectItem key={corpus} value={corpus}>
                    {CORPUS_CONFIG[corpus].icon} {CORPUS_CONFIG[corpus].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {CORPUS_CONFIG[corpusEstudo].description}
            </p>
          </div>
          
          {/* Corpus de Referência */}
          <div className="space-y-2">
            <Label htmlFor="corpus-referencia" className="text-sm font-semibold">
              {CORPUS_CONFIG[corpusReferencia].icon} Corpus de Referência
            </Label>
            <Select value={corpusReferencia} onValueChange={(v) => setCorpusReferencia(v as CorpusType)}>
              <SelectTrigger id="corpus-referencia" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CORPUS_CONFIG) as CorpusType[]).map(corpus => (
                  <SelectItem key={corpus} value={corpus}>
                    {CORPUS_CONFIG[corpus].icon} {CORPUS_CONFIG[corpus].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {CORPUS_CONFIG[corpusReferencia].description}
            </p>
          </div>
        </div>
        
        {/* Botão Processar + Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Button 
            onClick={() => processKeywords(corpusEstudo, corpusReferencia)}
            disabled={isLoading || !isValidSelection}
            className="w-full sm:w-auto"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Processar Análise
              </>
            )}
          </Button>
          
          {/* Mensagem de validação */}
          {!isValidSelection && (
            <Alert variant="destructive" className="flex-1">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Selecione corpus diferentes para comparação
              </AlertDescription>
            </Alert>
          )}
          
          {/* Status processado */}
          {isProcessed && !isLoading && isValidSelection && (
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
              ✓ Processado com sucesso ({keywords.length} palavras-chave)
            </Badge>
          )}
        </div>
        
        {/* Aviso quando usar corpus pequeno (letra individual) */}
        {isValidSelection && (corpusEstudo === 'marenco-verso' || corpusReferencia === 'marenco-verso') && (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
            <FileSearch className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Análise de letra individual:</strong> Os resultados mostrarão 
              palavras características da música "{CORPUS_CONFIG['marenco-verso'].label.split(' - ')[1]}" 
              comparada ao corpus de referência selecionado.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Mensagem de erro */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      
      {/* Estado inicial vazio */}
      {!isProcessed && !isLoading && keywords.length === 0 && (
        <div className="flex flex-col items-center justify-center h-96 bg-muted/10 rounded-lg border border-dashed border-border">
          <FileSearch className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Pronto para Análise</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md px-4">
            Selecione os corpus de estudo e referência acima e clique em 
            <strong> "Processar Análise"</strong> para gerar as palavras-chave estatisticamente significativas.
          </p>
        </div>
      )}
      
      {/* Tabela de resultados */}
      {isProcessed && keywords.length > 0 && (
        <div className="space-y-4">
          {/* Barra de ferramentas */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-base">
                {filteredKeywords.length} de {keywords.length} palavras-chave
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar palavra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Button onClick={handleExportCSV} variant="outline" size="default">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/20 rounded-lg border border-border">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Significância</Label>
              <div className="flex flex-wrap gap-3">
                {(['Alta', 'Média', 'Baixa'] as const).map(sig => (
                  <div key={sig} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sig-${sig}`}
                      checked={filterSignificancia[sig]}
                      onCheckedChange={(checked) => 
                        setFilterSignificancia(prev => ({ ...prev, [sig]: checked as boolean }))
                      }
                    />
                    <Label htmlFor={`sig-${sig}`} className="text-sm cursor-pointer">
                      {sig}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Efeito</Label>
              <div className="flex flex-wrap gap-3">
                {(['super-representado', 'sub-representado'] as const).map(ef => (
                  <div key={ef} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ef-${ef}`}
                      checked={filterEfeito[ef]}
                      onCheckedChange={(checked) => 
                        setFilterEfeito(prev => ({ ...prev, [ef]: checked as boolean }))
                      }
                    />
                    <Label htmlFor={`ef-${ef}`} className="text-sm cursor-pointer">
                      {ef === 'super-representado' ? 'Super-representado' : 'Sub-representado'}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Threshold Log-Likelihood (LL ≥ {minLLFilter.toFixed(2)})
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={minLLFilter}
                  onChange={(e) => setMinLLFilter(parseFloat(e.target.value) || 3.84)}
                  className="w-20 h-8"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMinLLFilter(3.84)}
                    className={minLLFilter === 3.84 ? 'bg-primary/10' : ''}
                  >
                    3.84 (p&lt;0.05)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMinLLFilter(6.63)}
                    className={minLLFilter === 6.63 ? 'bg-primary/10' : ''}
                  >
                    6.63 (p&lt;0.01)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMinLLFilter(10.83)}
                    className={minLLFilter === 10.83 ? 'bg-primary/10' : ''}
                  >
                    10.83 (p&lt;0.001)
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ajuste o valor mínimo de Log-Likelihood para filtrar palavras-chave por significância estatística
              </p>
            </div>
          </div>
          
          {/* Tabela */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Palavra</TableHead>
                    <TableHead 
                      onClick={() => handleSort('freqEstudo')} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Freq Estudo
                        {sortColumn === 'freqEstudo' && (
                          sortDirection === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('freqReferencia')} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Freq Ref
                        {sortColumn === 'freqReferencia' && (
                          sortDirection === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('normFreqEstudo')} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Norm Estudo
                        {sortColumn === 'normFreqEstudo' && (
                          sortDirection === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('normFreqReferencia')} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Norm Ref
                        {sortColumn === 'normFreqReferencia' && (
                          sortDirection === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('ll')} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Log-Likelihood
                        {sortColumn === 'll' && (
                          sortDirection === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('mi')} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        MI Score
                        {sortColumn === 'mi' && (
                          sortDirection === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Efeito</TableHead>
                    <TableHead>Significância</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeywords.map((kw, idx) => (
                    <TableRow key={`${kw.palavra}-${idx}`} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-semibold">{kw.palavra}</TableCell>
                      <TableCell>{kw.freqEstudo}</TableCell>
                      <TableCell>{kw.freqReferencia}</TableCell>
                      <TableCell>{kw.normFreqEstudo.toFixed(2)}</TableCell>
                      <TableCell>{kw.normFreqReferencia.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{kw.ll.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{kw.mi.toFixed(3)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={kw.efeito === 'super-representado' ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          {kw.efeito === 'super-representado' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {kw.efeito === 'super-representado' ? 'Super' : 'Sub'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            kw.significancia === 'Alta' ? 'destructive' : 
                            kw.significancia === 'Média' ? 'default' : 'outline'
                          }
                        >
                          {kw.significancia}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
