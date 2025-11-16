import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Search, Loader2, ChevronDown, ChevronUp, MousePointerClick } from "lucide-react";
import { CorpusType, CORPUS_CONFIG } from "@/data/types/corpus-tools.types";
import { useTools } from "@/contexts/ToolsContext";
import { toast } from "sonner";

interface WordEntry {
  palavra: string;
  frequencia: number;
  frequenciaNormalizada: number;
}

export function WordlistTool() {
  const [corpusType, setCorpusType] = useState<CorpusType>('gaucho');
  const [wordlist, setWordlist] = useState<WordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<'frequencia' | 'palavra'>('frequencia');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { navigateToKWIC } = useTools();

  const loadWordlist = async () => {
    setIsLoading(true);
    try {
      const config = CORPUS_CONFIG[corpusType];
      const response = await fetch(config.estudoPath);
      const text = await response.text();
      
      const lines = text.split('\n').filter(line => line.trim());
      const words: WordEntry[] = lines.map(line => {
        const [palavra, freq] = line.split('\t');
        return {
          palavra: palavra.trim(),
          frequencia: parseInt(freq) || 0,
          frequenciaNormalizada: 0
        };
      });

      // Calculate normalized frequencies (per 10,000 words)
      const totalWords = words.reduce((sum, w) => sum + w.frequencia, 0);
      words.forEach(w => {
        w.frequenciaNormalizada = (w.frequencia / totalWords) * 10000;
      });

      setWordlist(words);
      toast.success(`${words.length.toLocaleString('pt-BR')} palavras carregadas`);
    } catch (error) {
      console.error('Erro ao carregar wordlist:', error);
      toast.error('Erro ao carregar wordlist');
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
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'frequencia' ? 'desc' : 'asc');
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
    link.download = `wordlist_${corpusType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Wordlist exportada com sucesso');
  };

  const handleWordClick = (palavra: string) => {
    navigateToKWIC(palavra);
    toast.success(`Buscando "${palavra}" no KWIC...`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Corpus</Label>
            <Select value={corpusType} onValueChange={(v) => setCorpusType(v as CorpusType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CORPUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.icon} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
          <Button 
            onClick={loadWordlist} 
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Gerar Wordlist
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleExportCSV}
            variant="outline"
            disabled={wordlist.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {wordlist.length > 0 && (
        <>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Clique em qualquer palavra para analisá-la no KWIC
            </p>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('palavra')}
                      className="flex items-center gap-1 p-0 h-auto font-semibold hover:bg-transparent"
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
                      className="flex items-center gap-1 p-0 h-auto font-semibold hover:bg-transparent ml-auto"
                    >
                      Frequência
                      {sortColumn === 'frequencia' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Freq. Norm.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWordlist.slice(0, 100).map((word, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleWordClick(word.palavra)}
                              className="font-mono text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer text-left"
                            >
                              {word.palavra}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Clique para analisar no KWIC</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">{word.frequencia.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right">{word.frequenciaNormalizada.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredWordlist.length > 100 && (
            <p className="text-sm text-muted-foreground text-center">
              Mostrando 100 de {filteredWordlist.length.toLocaleString('pt-BR')} resultados. Exporte para ver todos.
            </p>
          )}
        </>
      )}
    </div>
  );
}
