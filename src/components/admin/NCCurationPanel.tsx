import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  RefreshCw, 
  Sparkles, 
  Check, 
  X, 
  Eye,
  Loader2,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { useNCCuration, NCWord, NCSuggestion } from '@/hooks/useNCCuration';
import { NCWordDetailModal } from './NCWordDetailModal';

type FilterType = 'all' | 'with_suggestion' | 'high_confidence' | 'no_suggestion';

// Componente memoizado para evitar re-renders
export const NCCurationPanel = React.memo(function NCCurationPanel() {
  const {
    ncWords,
    stats,
    suggestions,
    selectedWords,
    isLoading,
    isLoadingSuggestions,
    isValidating,
    refetch,
    getSuggestions,
    validateWord,
    rejectSuggestion,
    toggleSelection,
    selectHighConfidence,
    clearSelection,
    validateSelected,
  } = useNCCuration();

  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedWord, setSelectedWord] = useState<NCWord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Filtrar palavras
  const filteredWords = ncWords.filter(word => {
    const suggestion = suggestions.get(word.palavra);
    switch (filter) {
      case 'with_suggestion':
        return !!suggestion;
      case 'high_confidence':
        return suggestion && suggestion.confianca >= 0.85;
      case 'no_suggestion':
        return !suggestion;
      default:
        return true;
    }
  });

  // Progresso
  const progressPercent = stats.total > 0 
    ? Math.round((stats.validated / stats.total) * 100) 
    : 0;

  // Confiança badge color
  const getConfidenceBadge = (confianca: number) => {
    if (confianca >= 0.9) return 'default';
    if (confianca >= 0.75) return 'secondary';
    return 'outline';
  };

  // Fonte badge
  const getFonteBadge = (fonte: NCSuggestion['fonte']) => {
    switch (fonte) {
      case 'dialectal_lexicon':
        return { label: '📚 Léxico', variant: 'default' as const };
      case 'pattern_match':
        return { label: '🔤 Padrão', variant: 'secondary' as const };
      case 'ai_gemini':
        return { label: '🤖 IA', variant: 'outline' as const };
    }
  };

  const handleValidateSuggestion = (word: NCWord) => {
    const suggestion = suggestions.get(word.palavra);
    if (!suggestion) return;

    validateWord({
      palavra: word.palavra,
      tagset_codigo: suggestion.tagset_sugerido,
      justificativa: `[Auto] ${suggestion.fonte}: ${suggestion.justificativa}`,
      aplicar_a_todas: true
    });
  };

  const handleOpenDetail = (word: NCWord) => {
    setSelectedWord(word);
    setDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <div>
                <CardTitle className="text-lg">Curadoria de Palavras NC</CardTitle>
                <CardDescription>
                  Classificar palavras não identificadas com sugestões inteligentes
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
              <Button 
                size="sm" 
                onClick={() => getSuggestions()}
                disabled={isLoadingSuggestions}
              >
                {isLoadingSuggestions ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Sugerir IA
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Progresso: {stats.validated}/{stats.total} validadas ({progressPercent}%)
              </span>
              <span className="text-muted-foreground">
                {stats.suggested} sugestões • {stats.high_confidence} alta confiança
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Filtros e Ações em Lote */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas ({ncWords.length})</SelectItem>
                  <SelectItem value="with_suggestion">Com sugestão ({stats.suggested})</SelectItem>
                  <SelectItem value="high_confidence">Alta confiança ({stats.high_confidence})</SelectItem>
                  <SelectItem value="no_suggestion">Sem sugestão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {selectedWords.size > 0 && (
                <>
                  <Badge variant="secondary">{selectedWords.size} selecionadas</Badge>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Limpar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={validateSelected}
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Validar Selecionados
                  </Button>
                </>
              )}
              {selectedWords.size === 0 && stats.high_confidence > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => selectHighConfidence()}
                >
                  Selecionar alta confiança
                </Button>
              )}
            </div>
          </div>

          {/* Tabela */}
          {filteredWords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {ncWords.length === 0 
                ? '✅ Nenhuma palavra NC encontrada'
                : 'Nenhuma palavra corresponde ao filtro'}
            </div>
          ) : (
            <ScrollArea className="h-[500px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Palavra</TableHead>
                    <TableHead className="text-center">Ocorr.</TableHead>
                    <TableHead>Sugestão</TableHead>
                    <TableHead className="text-center">Conf.</TableHead>
                    <TableHead className="text-center">Fonte</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWords.map((word) => {
                    const suggestion = suggestions.get(word.palavra);
                    const isSelected = selectedWords.has(word.palavra);

                    return (
                      <TableRow 
                        key={word.palavra + word.contexto_hash}
                        className={isSelected ? 'bg-primary/5' : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(word.palavra)}
                            disabled={!suggestion}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium">{word.palavra}</span>
                          {word.needs_correction && (
                            <Badge variant="secondary" className="ml-2 text-xs">🔧</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{word.hits_count || 1}</Badge>
                        </TableCell>
                        <TableCell>
                          {suggestion ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-sm">
                                {suggestion.tagset_nome}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {suggestion.tagset_sugerido}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              ❓ Sem sugestão
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {suggestion && (
                            <Badge variant={getConfidenceBadge(suggestion.confianca)}>
                              {Math.round(suggestion.confianca * 100)}%
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {suggestion && (
                            <Badge variant={getFonteBadge(suggestion.fonte).variant}>
                              {getFonteBadge(suggestion.fonte).label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {suggestion && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                  onClick={() => handleValidateSuggestion(word)}
                                  disabled={isValidating}
                                  title="Aceitar sugestão"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => rejectSuggestion(word.palavra)}
                                  title="Rejeitar sugestão"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleOpenDetail(word)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <NCWordDetailModal
        word={selectedWord}
        suggestion={selectedWord ? suggestions.get(selectedWord.palavra) : undefined}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onSuccess={() => refetch()}
      />
    </>
  );
});
