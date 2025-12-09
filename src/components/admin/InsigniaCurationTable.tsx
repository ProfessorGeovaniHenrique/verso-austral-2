import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Search, ChevronLeft, ChevronRight, Sparkles, Check, Trash2, 
  Loader2, RefreshCw, X, Layers, List 
} from 'lucide-react';
import { InsigniaCurationRow } from './InsigniaCurationRow';
import { GroupedInsigniaRow } from './GroupedInsigniaRow';
import { 
  useInsigniaCuration, 
  InsigniaCurationFilters,
  useBatchValidateInsignias,
  useBatchRemoveInsignias
} from '@/hooks/useInsigniaCuration';
import { 
  useGroupedInsigniaCuration,
  useValidateByWord,
  useUpdateInsigniasByWord
} from '@/hooks/useGroupedInsigniaCuration';
import { useAnalyzeBatchInsignias, useApplyAnalysisSuggestion, InsigniaAnalysisResult } from '@/hooks/useInsigniaAnalysis';
import { INSIGNIAS_OPTIONS } from '@/data/types/cultural-insignia.types';
import { toast } from 'sonner';

export function InsigniaCurationTable() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<InsigniaCurationFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [batchAnalysisResults, setBatchAnalysisResults] = useState<InsigniaAnalysisResult[]>([]);
  const [showBatchResults, setShowBatchResults] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'individual'>('grouped');

  // Individual view hooks
  const { data: individualData, isLoading: individualLoading, refetch: refetchIndividual } = useInsigniaCuration(filters, page);
  
  // Grouped view hooks
  const { data: groupedData, isLoading: groupedLoading, refetch: refetchGrouped } = useGroupedInsigniaCuration(filters, page);

  const batchValidate = useBatchValidateInsignias();
  const batchRemove = useBatchRemoveInsignias();
  const batchAnalyze = useAnalyzeBatchInsignias();
  const applySuggestion = useApplyAnalysisSuggestion();
  const validateByWord = useValidateByWord();
  const updateByWord = useUpdateInsigniasByWord();

  const isGroupedView = viewMode === 'grouped';
  const isLoading = isGroupedView ? groupedLoading : individualLoading;
  
  const entries = individualData?.entries || [];
  const groupedEntries = groupedData?.entries || [];
  const totalPages = isGroupedView ? (groupedData?.totalPages || 0) : (individualData?.totalPages || 0);
  const totalCount = isGroupedView ? (groupedData?.totalCount || 0) : (individualData?.totalCount || 0);
  const uniqueWords = groupedData?.uniqueWords || 0;

  const refetch = () => {
    refetchIndividual();
    refetchGrouped();
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput || undefined }));
    setPage(0);
  };

  const handleFilterChange = (key: keyof InsigniaCurationFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
    setSelectedIds(new Set());
    setSelectedWords(new Set());
  };

  const clearFilters = () => {
    setFilters({});
    setSearchInput('');
    setPage(0);
    setSelectedIds(new Set());
    setSelectedWords(new Set());
  };

  const toggleSelection = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleWordSelection = (palavra: string, selected: boolean) => {
    setSelectedWords(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(palavra);
      } else {
        next.delete(palavra);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (isGroupedView) {
      if (selectedWords.size === groupedEntries.length) {
        setSelectedWords(new Set());
      } else {
        setSelectedWords(new Set(groupedEntries.map(e => e.palavra)));
      }
    } else {
      if (selectedIds.size === entries.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(entries.map(e => e.id)));
      }
    }
  };

  const handleBatchValidate = async () => {
    if (isGroupedView) {
      if (selectedWords.size === 0) {
        toast.warning('Selecione ao menos uma palavra');
        return;
      }
      
      let totalValidated = 0;
      for (const palavra of selectedWords) {
        try {
          const count = await validateByWord.mutateAsync(palavra);
          totalValidated += count;
        } catch (error) {
          console.error('Error validating word:', palavra, error);
        }
      }
      toast.success(`${totalValidated} entradas validadas em ${selectedWords.size} palavras`);
      setSelectedWords(new Set());
    } else {
      if (selectedIds.size === 0) {
        toast.warning('Selecione ao menos uma entrada');
        return;
      }
      await batchValidate.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBatchRemove = async () => {
    if (selectedIds.size === 0) {
      toast.warning('Selecione ao menos uma entrada');
      return;
    }
    await batchRemove.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBatchAnalyze = async () => {
    const palavras = isGroupedView 
      ? Array.from(selectedWords)
      : entries.filter(e => selectedIds.has(e.id)).map(e => e.palavra);
    
    if (palavras.length === 0) {
      toast.warning('Selecione ao menos uma palavra');
      return;
    }

    toast.loading('Analisando com Gemini...', { id: 'batch-analyze' });
    
    try {
      const results = await batchAnalyze.mutateAsync({ palavras });
      setBatchAnalysisResults(results);
      setShowBatchResults(true);
      toast.success(`${results.length} palavras analisadas`, { id: 'batch-analyze' });
    } catch (error) {
      toast.error('Erro na análise em lote', { id: 'batch-analyze' });
    }
  };

  const applyAllSuggestions = async () => {
    toast.loading('Aplicando sugestões...', { id: 'apply-all' });
    
    let applied = 0;
    for (const result of batchAnalysisResults) {
      try {
        await updateByWord.mutateAsync({ 
          palavra: result.palavra, 
          insignias: result.insignias_sugeridas 
        });
        applied++;
      } catch (error) {
        console.error('Error applying suggestion:', error);
      }
    }

    toast.success(`${applied} palavras atualizadas`, { id: 'apply-all' });
    setShowBatchResults(false);
    setBatchAnalysisResults([]);
    setSelectedIds(new Set());
    setSelectedWords(new Set());
    refetch();
  };

  const isOperating = batchValidate.isPending || batchRemove.isPending || batchAnalyze.isPending || validateByWord.isPending;
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== null && v !== '');
  const selectionCount = isGroupedView ? selectedWords.size : selectedIds.size;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Curadoria de Insígnias</CardTitle>
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 ml-4 p-1 bg-muted rounded-lg">
              <Button
                size="sm"
                variant={isGroupedView ? 'secondary' : 'ghost'}
                onClick={() => {
                  setViewMode('grouped');
                  setPage(0);
                  setSelectedIds(new Set());
                  setSelectedWords(new Set());
                }}
                className="h-7 px-2 text-xs"
              >
                <Layers className="h-3 w-3 mr-1" />
                Agrupado
              </Button>
              <Button
                size="sm"
                variant={!isGroupedView ? 'secondary' : 'ghost'}
                onClick={() => {
                  setViewMode('individual');
                  setPage(0);
                  setSelectedIds(new Set());
                  setSelectedWords(new Set());
                }}
                className="h-7 px-2 text-xs"
              >
                <List className="h-3 w-3 mr-1" />
                Individual
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3 mt-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar palavra..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-48"
            />
            <Button size="sm" variant="secondary" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Insignia Filter */}
          <Select
            value={filters.insignia || 'all'}
            onValueChange={(v) => handleFilterChange('insignia', v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Insígnia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas insígnias</SelectItem>
              {INSIGNIAS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Without Insignia */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="without-insignia"
              checked={filters.withoutInsignia || false}
              onCheckedChange={(checked) => handleFilterChange('withoutInsignia', checked)}
            />
            <label htmlFor="without-insignia" className="text-sm cursor-pointer">
              Sem insígnia
            </label>
          </div>

          {/* Validated Filter */}
          <Select
            value={filters.validated === true ? 'validated' : filters.validated === false ? 'pending' : 'all'}
            onValueChange={(v) => handleFilterChange('validated', v === 'all' ? null : v === 'validated')}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="validated">✓ Validados</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Selection Toolbar */}
        {selectionCount > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg mt-3">
            <Badge variant="secondary">
              {selectionCount} {isGroupedView ? 'palavras' : 'entradas'} selecionadas
            </Badge>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBatchAnalyze}
              disabled={isOperating}
            >
              {batchAnalyze.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Analisar Lote
            </Button>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBatchValidate}
              disabled={isOperating}
              className="text-green-600"
            >
              {(batchValidate.isPending || validateByWord.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              Validar {isGroupedView ? 'Palavras' : 'Lote'}
            </Button>
            
            {!isGroupedView && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchRemove}
                disabled={isOperating}
              >
                {batchRemove.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Remover Insígnias
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedIds(new Set());
                setSelectedWords(new Set());
              }}
            >
              Cancelar
            </Button>
          </div>
        )}

        {/* Batch Analysis Results */}
        {showBatchResults && batchAnalysisResults.length > 0 && (
          <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-amber-700 dark:text-amber-300">
                Resultados da Análise em Lote ({batchAnalysisResults.length} palavras)
              </span>
              <div className="flex gap-2">
                <Button size="sm" onClick={applyAllSuggestions}>
                  Aplicar Todas
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowBatchResults(false)}>
                  Fechar
                </Button>
              </div>
            </div>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {batchAnalysisResults.map((result, idx) => (
                  <div key={`${result.palavra}-${idx}`} className="flex items-center justify-between p-2 bg-background rounded">
                    <span className="font-medium">{result.palavra}</span>
                    <div className="flex items-center gap-2">
                      {result.insignias_sugeridas.length > 0 ? (
                        result.insignias_sugeridas.map(ins => (
                          <Badge key={ins} variant="secondary">{ins}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem insígnias</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({(result.confianca * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Stats */}
        <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
          {isGroupedView ? (
            <span>
              <strong>{uniqueWords.toLocaleString()}</strong> palavras únicas ({totalCount.toLocaleString()} ocorrências)
            </span>
          ) : (
            <span>{totalCount.toLocaleString()} entradas encontradas</span>
          )}
          <span>Página {page + 1} de {totalPages || 1}</span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (isGroupedView ? groupedEntries.length === 0 : entries.length === 0) ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma entrada encontrada com os filtros atuais
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={
                        isGroupedView 
                          ? (selectedWords.size === groupedEntries.length && groupedEntries.length > 0)
                          : (selectedIds.size === entries.length && entries.length > 0)
                      }
                      onCheckedChange={selectAll}
                    />
                  </th>
                  <th className="p-3 text-left text-sm font-medium">
                    {isGroupedView ? 'Palavra (Ocorrências)' : 'Palavra'}
                  </th>
                  <th className="p-3 text-left text-sm font-medium">Insígnias</th>
                  <th className="p-3 text-left text-sm font-medium">
                    {isGroupedView ? 'Consenso' : 'Corpus'}
                  </th>
                  <th className="p-3 text-left text-sm font-medium">Confiança</th>
                  <th className="p-3 text-left text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isGroupedView ? (
                  groupedEntries.map(entry => (
                    <GroupedInsigniaRow
                      key={entry.palavra}
                      entry={entry}
                      isSelected={selectedWords.has(entry.palavra)}
                      onSelectionChange={(selected) => toggleWordSelection(entry.palavra, selected)}
                    />
                  ))
                ) : (
                  entries.map(entry => (
                    <InsigniaCurationRow
                      key={entry.id}
                      entry={entry}
                      isSelected={selectedIds.has(entry.id)}
                      onSelectionChange={(selected) => toggleSelection(entry.id, selected)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(0, Math.min(page - 2 + i, totalPages - 1));
              return (
                <Button
                  key={`page-${i}-${pageNum}`}
                  variant={pageNum === page ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum + 1}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
