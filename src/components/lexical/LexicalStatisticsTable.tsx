/**
 * LexicalStatisticsTable - Tabela de Estatísticas de Palavras-Chave
 * Sprint LF-5 Fase 3: Tabela interativa com ordenação e paginação
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { LexicalKeyword } from '@/hooks/useLexicalDomainsData';

interface LexicalStatisticsTableProps {
  keywords: LexicalKeyword[];
  onWordClick?: (word: string) => void;
}

type SortField = 'word' | 'domain' | 'frequency' | 'frequencyPercent' | 'isHapax';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 50;

export function LexicalStatisticsTable({ keywords, onWordClick }: LexicalStatisticsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('frequency');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    let result = keywords.filter(kw =>
      kw.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kw.domain.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'word':
          comparison = a.word.localeCompare(b.word);
          break;
        case 'domain':
          comparison = a.domain.localeCompare(b.domain);
          break;
        case 'frequency':
          comparison = a.frequency - b.frequency;
          break;
        case 'frequencyPercent':
          comparison = a.frequencyPercent - b.frequencyPercent;
          break;
        case 'isHapax':
          comparison = (a.isHapax ? 1 : 0) - (b.isHapax ? 1 : 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [keywords, searchQuery, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExportCSV = () => {
    const headers = ['Palavra', 'Domínio', 'Frequência', 'Freq %', 'Hapax'];
    const rows = filteredAndSorted.map(kw => [
      kw.word,
      kw.domain,
      kw.frequency.toString(),
      kw.frequencyPercent.toFixed(4) + '%',
      kw.isHapax ? 'Sim' : 'Não'
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estatisticas-lexicais-${Date.now()}.csv`;
    link.click();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Estatísticas Detalhadas</CardTitle>
            <CardDescription>
              {filteredAndSorted.length.toLocaleString()} palavras • Página {currentPage} de {totalPages}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('word')}
                >
                  <div className="flex items-center">
                    Palavra <SortIcon field="word" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('domain')}
                >
                  <div className="flex items-center">
                    Domínio <SortIcon field="domain" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
                  onClick={() => handleSort('frequency')}
                >
                  <div className="flex items-center justify-end">
                    Freq <SortIcon field="frequency" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
                  onClick={() => handleSort('frequencyPercent')}
                >
                  <div className="flex items-center justify-end">
                    Freq % <SortIcon field="frequencyPercent" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors text-center"
                  onClick={() => handleSort('isHapax')}
                >
                  <div className="flex items-center justify-center">
                    Hapax <SortIcon field="isHapax" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((kw, idx) => (
                <TableRow 
                  key={`${kw.word}-${idx}`}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => onWordClick?.(kw.word)}
                >
                  <TableCell className="font-medium">{kw.word}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {kw.domain}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {kw.frequency.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {kw.frequencyPercent.toFixed(3)}%
                  </TableCell>
                  <TableCell className="text-center">
                    {kw.isHapax && (
                      <Badge variant="outline" className="text-xs">
                        ✓
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} de {filteredAndSorted.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
