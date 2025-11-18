import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Search, Loader2, ChevronDown, ChevronUp, MousePointerClick, Music } from "lucide-react";
import { useTools } from "@/contexts/ToolsContext";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { toast } from "sonner";

interface WordEntry {
  palavra: string;
  frequencia: number;
  frequenciaNormalizada: number;
}

export function WordlistTool() {
  const { wordlistState, setWordlistState, navigateToKWIC } = useTools();
  const { getFilteredCorpus, currentMetadata } = useSubcorpus();
  const [isLoading, setIsLoading] = useState(false);
  
  // Usar estado do context
  const wordlist = wordlistState.wordlist;
  const setWordlist = (val: WordEntry[]) => setWordlistState({ wordlist: val });
  const searchTerm = wordlistState.searchTerm;
  const setSearchTerm = (val: string) => setWordlistState({ searchTerm: val });
  const sortColumn = wordlistState.sortColumn;
  const setSortColumn = (val: 'frequencia' | 'palavra') => setWordlistState({ sortColumn: val });
  const sortDirection = wordlistState.sortDirection;
  const setSortDirection = (val: 'asc' | 'desc') => setWordlistState({ sortDirection: val });

  const loadWordlist = async () => {
    setIsLoading(true);
    try {
      const corpus = await getFilteredCorpus();
      
      // Extrair palavras e contar frequências
      const frequencyMap = new Map<string, number>();
      corpus.musicas.forEach(musica => {
        musica.palavras.forEach(palavra => {
          const palavraLower = palavra.toLowerCase();
          frequencyMap.set(palavraLower, (frequencyMap.get(palavraLower) || 0) + 1);
        });
      });
      
      // Converter para array e calcular freq normalizada
      const totalTokens = corpus.totalPalavras;
      const words = Array.from(frequencyMap.entries()).map(([text, frequency]) => ({
        palavra: text,
        frequencia: frequency,
        frequenciaNormalizada: (frequency / totalTokens) * 10000
      }));
      
      setWordlist(words);
      toast.success(`${words.length.toLocaleString('pt-BR')} palavras únicas`);
    } catch (error) {
      console.error('Erro ao gerar wordlist:', error);
      toast.error('Erro ao gerar wordlist');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWordlist = useMemo(() => {
    return wordlist
      .filter(w => !searchTerm || w.palavra.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortColumn === 'palavra') {
          return sortDirection === 'asc' 
            ? a.palavra.localeCompare(b.palavra, 'pt-BR')
            : b.palavra.localeCompare(a.palavra, 'pt-BR');
        }
        return sortDirection === 'asc'
          ? a.frequencia - b.frequencia
          : b.frequencia - a.frequencia;
      });
  }, [wordlist, searchTerm, sortColumn, sortDirection]);

  const handleSort = (column: 'frequencia' | 'palavra') => {
    if (sortColumn === column) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      setSortColumn(column);
      const defaultDirection = column === 'frequencia' ? 'desc' : 'asc';
      setSortDirection(defaultDirection);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Rank', 'Palavra', 'Frequência', 'Freq. Normalizada'].join(','),
      ...filteredWordlist.map((w, idx) => [
        idx + 1,
        w.palavra,
        w.frequencia,
        w.frequenciaNormalizada.toFixed(2)
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const subcorpusLabel = currentMetadata ? `_${currentMetadata.artista.replace(/\s+/g, '_')}` : '';
    link.download = `wordlist${subcorpusLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Wordlist exportada com sucesso');
  };

  const handleWordClick = (palavra: string) => {
    navigateToKWIC(palavra);
    toast.success(`Buscando "${palavra}" no KWIC...`);
  };

  return (
    <div className="space-y-6">
      {/* Indicador de Subcorpus */}
      {currentMetadata && (
        <Alert className="border-primary/20 bg-primary/5">
          <Music className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-3">
            <span>
              Analisando subcorpus: <strong className="text-primary">{currentMetadata.artista}</strong>
            </span>
            <Badge variant="outline" className="gap-1">
              {currentMetadata.totalMusicas} músicas
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {currentMetadata.totalPalavras.toLocaleString()} palavras
            </span>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Controles */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Buscar palavra</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite para filtrar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={loadWordlist} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              'Gerar Wordlist'
            )}
          </Button>
          
          {wordlist.length > 0 && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {/* Tabela */}
      {wordlist.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('palavra')}
                    className="flex items-center gap-1 hover:bg-transparent p-0 h-auto font-semibold"
                  >
                    Palavra
                    {sortColumn === 'palavra' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('frequencia')}
                    className="flex items-center justify-end gap-1 hover:bg-transparent p-0 h-auto font-semibold ml-auto"
                  >
                    Frequência
                    {sortColumn === 'frequencia' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="font-semibold">Freq. Norm.</TooltipTrigger>
                      <TooltipContent>Por 10.000 palavras</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="w-20 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWordlist.slice(0, 100).map((word, idx) => (
                <TableRow key={word.palavra}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-mono font-medium">{word.palavra}</TableCell>
                  <TableCell className="text-right">{word.frequencia.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{word.frequenciaNormalizada.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleWordClick(word.palavra)}
                            className="h-8 w-8"
                          >
                            <MousePointerClick className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver no KWIC</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredWordlist.length > 100 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Mostrando 100 de {filteredWordlist.length.toLocaleString('pt-BR')} palavras.
              Exporte o CSV para ver todos os resultados.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
