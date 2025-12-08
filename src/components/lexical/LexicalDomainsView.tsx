/**
 * LexicalDomainsView - Visualização de Domínios Semânticos
 * Sprint LF-5 Fase 3: Componente reutilizável para exibir cards de domínios
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Download, Layers } from 'lucide-react';
import { DomainStats, LexicalKeyword } from '@/hooks/useLexicalDomainsData';

interface LexicalDomainsViewProps {
  domains: DomainStats[];
  onWordClick?: (word: string) => void;
  totalWords: number;
}

export function LexicalDomainsView({ domains, onWordClick, totalWords }: LexicalDomainsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeywords, setShowKeywords] = useState(true);

  const filteredDomains = domains.filter(d =>
    d.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.keywords.some(kw => kw.word.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExportCSV = () => {
    const headers = ['Domínio', 'Riqueza Lexical', 'Ocorrências', 'Percentual', 'Palavras'];
    const rows = domains.map(d => [
      d.domain,
      d.wordCount.toString(),
      d.totalOccurrences.toString(),
      d.percentage.toFixed(2) + '%',
      d.keywords.slice(0, 10).map(k => k.word).join('; ')
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dominios-semanticos-${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar domínio ou palavra..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="show-keywords"
              checked={showKeywords}
              onCheckedChange={setShowKeywords}
            />
            <Label htmlFor="show-keywords" className="text-sm">Exibir palavras</Label>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Estatísticas Resumidas */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{domains.length}</div>
          <div className="text-sm text-muted-foreground">Domínios Ativos</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{domains.reduce((sum, d) => sum + d.wordCount, 0)}</div>
          <div className="text-sm text-muted-foreground">Lemas Únicos</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{totalWords.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Ocorrências</div>
        </Card>
      </div>

      {/* Lista de Domínios */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
          {filteredDomains.map((domain, idx) => (
            <Card key={domain.domain} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    {domain.domain}
                  </CardTitle>
                  <Badge variant="secondary">
                    {domain.percentage.toFixed(1)}%
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {domain.wordCount} lemas • {domain.totalOccurrences.toLocaleString()} ocorrências
                </CardDescription>
              </CardHeader>
              
              {showKeywords && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    <TooltipProvider delayDuration={200}>
                      {domain.keywords.slice(0, 8).map(kw => (
                        <Tooltip key={kw.word}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                              onClick={() => onWordClick?.(kw.word)}
                            >
                              {kw.word}
                              <span className="ml-1 text-muted-foreground">
                                ({kw.frequency})
                              </span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="space-y-1">
                              <div>Frequência: {kw.frequency} ({kw.frequencyPercent.toFixed(2)}%)</div>
                              {kw.isHapax && <div className="text-amber-500">Hapax Legomena</div>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {domain.keywords.length > 8 && (
                        <span className="text-xs text-muted-foreground px-2">
                          +{domain.keywords.length - 8} mais
                        </span>
                      )}
                    </TooltipProvider>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>

      {filteredDomains.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum domínio encontrado para "{searchQuery}"
        </Card>
      )}
    </div>
  );
}
