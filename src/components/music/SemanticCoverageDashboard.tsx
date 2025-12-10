/**
 * Dashboard de Cobertura Semântica
 * Exibe métricas de cobertura por corpus e artista com ações rápidas
 * Memoizado para evitar re-renders desnecessários
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Brain, 
  RefreshCw, 
  Loader2, 
  Search,
  ChevronUp,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { 
  useSemanticCoverage, 
  ArtistCoverage, 
  getCoverageLevel, 
  getCoverageBadgeVariant,
  CoverageLevel 
} from '@/hooks/useSemanticCoverage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COVERAGE_COLORS: Record<CoverageLevel, string> = {
  none: 'hsl(var(--destructive))',
  partial: 'hsl(var(--muted-foreground))',
  good: 'hsl(var(--primary))',
  complete: 'hsl(142 76% 36%)', // green
};

const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  none: 'Sem anotação',
  partial: 'Parcial (<50%)',
  good: 'Boa (50-99%)',
  complete: 'Completa (100%)',
};

type SortField = 'name' | 'coverage' | 'words' | 'confidence';
type SortDir = 'asc' | 'desc';

interface Props {
  corpusFilter?: string;
  onAnnotateArtists?: (artistIds: string[]) => void;
}

// Componente memoizado para evitar re-renders
export const SemanticCoverageDashboard = React.memo(function SemanticCoverageDashboard({ corpusFilter, onAnnotateArtists }: Props) {
  const { 
    corpusCoverage, 
    artistCoverage, 
    qualityMetrics,
    globalCoveragePercent,
    isLoading, 
    isRefreshing,
    refresh 
  } = useSemanticCoverage({ corpusFilter });

  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [coverageFilter, setCoverageFilter] = useState<CoverageLevel | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('coverage');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [isAnnotating, setIsAnnotating] = useState(false);

  // Filter and sort artists
  const filteredArtists = useMemo(() => {
    let result = [...artistCoverage];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => a.artistName.toLowerCase().includes(query));
    }
    
    // Coverage filter
    if (coverageFilter !== 'all') {
      result = result.filter(a => getCoverageLevel(a.coveragePercent) === coverageFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.artistName.localeCompare(b.artistName);
          break;
        case 'coverage':
          cmp = a.coveragePercent - b.coveragePercent;
          break;
        case 'words':
          cmp = a.annotatedWords - b.annotatedWords;
          break;
        case 'confidence':
          cmp = a.avgConfidence - b.avgConfidence;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    
    return result;
  }, [artistCoverage, searchQuery, coverageFilter, sortField, sortDir]);

  // Toggle artist selection
  const toggleArtist = (artistId: string) => {
    const newSelected = new Set(selectedArtists);
    if (newSelected.has(artistId)) {
      newSelected.delete(artistId);
    } else {
      newSelected.add(artistId);
    }
    setSelectedArtists(newSelected);
  };

  // Select all filtered artists
  const selectAll = () => {
    setSelectedArtists(new Set(filteredArtists.map(a => a.artistId)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedArtists(new Set());
  };

  // Handle annotate selected artists
  const handleAnnotateSelected = async () => {
    if (selectedArtists.size === 0) {
      toast.warning('Selecione ao menos um artista');
      return;
    }

    setIsAnnotating(true);
    const artistIds = Array.from(selectedArtists);
    
    try {
      // Call annotation for each artist
      for (const artistId of artistIds) {
        const artist = artistCoverage.find(a => a.artistId === artistId);
        toast.info(`Iniciando anotação: ${artist?.artistName}`);
        
        const { error } = await supabase.functions.invoke('annotate-artist-songs', {
          body: { artistId }
        });
        
        if (error) {
          toast.error(`Erro ao anotar ${artist?.artistName}: ${error.message}`);
        }
      }
      
      toast.success(`Anotação iniciada para ${artistIds.length} artista(s)`);
      clearSelection();
      
      // Refresh after a delay
      setTimeout(refresh, 2000);
      
      if (onAnnotateArtists) {
        onAnnotateArtists(artistIds);
      }
    } catch (err) {
      toast.error('Erro ao iniciar anotação');
    } finally {
      setIsAnnotating(false);
    }
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Chart data
  const chartData = corpusCoverage.map(c => ({
    name: c.corpusName.replace('Corpus ', ''),
    coverage: Math.round(c.coveragePercent * 10) / 10,
    songs: c.annotatedSongs,
    total: c.totalSongs,
    level: getCoverageLevel(c.coveragePercent),
  }));

  return (
    <div className="space-y-6">
      {/* Header with global coverage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Cobertura Semântica</h3>
            <p className="text-sm text-muted-foreground">
              {globalCoveragePercent}% do catálogo anotado
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Corpus Coverage Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {corpusCoverage.map(corpus => {
          const level = getCoverageLevel(corpus.coveragePercent);
          return (
            <Card key={corpus.corpusId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {corpus.corpusName.replace('Corpus ', '')}
                  <Badge variant={getCoverageBadgeVariant(level)}>
                    {Math.round(corpus.coveragePercent)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={corpus.coveragePercent} 
                  className="h-2 mb-2"
                />
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">{corpus.annotatedSongs}</span>
                    /{corpus.totalSongs} músicas
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{corpus.uniqueWords.toLocaleString()}</span>
                    {' '}palavras únicas
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quality Metrics */}
      {qualityMetrics && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Métricas de Qualidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{qualityMetrics.totalCachedWords.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Palavras</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{qualityMetrics.ncCount}</div>
                <div className="text-xs text-muted-foreground">Não Classificadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{qualityMetrics.n2PlusCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">N2+ Profundidade</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{qualityMetrics.avgConfidence}</div>
                <div className="text-xs text-muted-foreground">Confiança Média</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{qualityMetrics.highConfidencePercent}%</div>
                <div className="text-xs text-muted-foreground">Alta Confiança</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cobertura por Corpus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Cobertura']}
                  labelFormatter={(label) => `Corpus ${label}`}
                />
                <Bar dataKey="coverage" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={COVERAGE_COLORS[entry.level]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Artist Coverage Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Cobertura por Artista</CardTitle>
              <CardDescription>
                {filteredArtists.length} artistas • {selectedArtists.size} selecionados
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAll}
                disabled={filteredArtists.length === 0}
              >
                Selecionar Todos
              </Button>
              <Button 
                size="sm" 
                onClick={handleAnnotateSelected}
                disabled={selectedArtists.size === 0 || isAnnotating}
              >
                {isAnnotating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Anotar Seleção ({selectedArtists.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={coverageFilter} onValueChange={(v) => setCoverageFilter(v as CoverageLevel | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar cobertura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    {COVERAGE_LABELS.none}
                  </div>
                </SelectItem>
                <SelectItem value="partial">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    {COVERAGE_LABELS.partial}
                  </div>
                </SelectItem>
                <SelectItem value="good">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {COVERAGE_LABELS.good}
                  </div>
                </SelectItem>
                <SelectItem value="complete">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {COVERAGE_LABELS.complete}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={selectedArtists.size === filteredArtists.length && filteredArtists.length > 0}
                      onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Artista
                      <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('coverage')}
                  >
                    <div className="flex items-center gap-1">
                      Cobertura
                      <SortIcon field="coverage" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('words')}
                  >
                    <div className="flex items-center gap-1">
                      Palavras
                      <SortIcon field="words" />
                    </div>
                  </TableHead>
                  <TableHead>NC</TableHead>
                  <TableHead>N2+</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('confidence')}
                  >
                    <div className="flex items-center gap-1">
                      Conf.
                      <SortIcon field="confidence" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArtists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum artista encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredArtists.slice(0, 100).map(artist => {
                    const level = getCoverageLevel(artist.coveragePercent);
                    return (
                      <TableRow key={artist.artistId}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedArtists.has(artist.artistId)}
                            onCheckedChange={() => toggleArtist(artist.artistId)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{artist.artistName}</div>
                          {artist.corpusName && (
                            <div className="text-xs text-muted-foreground">
                              {artist.corpusName.replace('Corpus ', '')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={artist.coveragePercent} className="h-2 w-16" />
                            <Badge variant={getCoverageBadgeVariant(level)} className="text-xs">
                              {Math.round(artist.coveragePercent)}%
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {artist.annotatedSongs}/{artist.totalSongs} músicas
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{artist.annotatedWords.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          {artist.ncCount > 0 ? (
                            <Badge variant="destructive" className="text-xs">{artist.ncCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {artist.n2PlusCount > 0 ? (
                            <Badge variant="default" className="text-xs">{artist.n2PlusCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={artist.avgConfidence >= 0.8 ? 'text-green-600' : ''}>
                            {artist.avgConfidence.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredArtists.length > 100 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Mostrando 100 de {filteredArtists.length} artistas
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
