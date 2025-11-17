/**
 * ☁️ NUVEM DE DOMÍNIOS SEMÂNTICOS
 * 
 * Visualização interativa dos domínios semânticos com:
 * - Filtros por nível hierárquico
 * - Toggle DS/Palavras
 * - Modo nuvem e tabela
 * - Tamanho proporcional a LL/MI score
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cloud, TableIcon, Filter, Sparkles } from 'lucide-react';
import { useAnnotationGate } from '@/hooks/useAnnotationGate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type ViewMode = 'domains' | 'words';
type HierarchyLevel = 'all' | '1' | '2' | '3' | '4';

interface DomainData {
  codigo: string;
  nome: string;
  nivel: number;
  wordCount: number;
  avgScore: number;
  color: string;
  palavras: string[];
}

export function SemanticDomainsCloud() {
  const { hasProcessedCorpus, isLoading } = useAnnotationGate();
  const [viewMode, setViewMode] = useState<ViewMode>('domains');
  const [hierarchyLevel, setHierarchyLevel] = useState<HierarchyLevel>('all');
  const [displayMode, setDisplayMode] = useState<'cloud' | 'table'>('cloud');

  // Mock data - será substituído por dados reais do backend
  const mockDomains: DomainData[] = [
    { codigo: 'N1', nome: 'Natureza', nivel: 1, wordCount: 45, avgScore: 8.5, color: '#22c55e', palavras: ['campo', 'céu', 'terra'] },
    { codigo: 'N1.1', nome: 'Paisagem', nivel: 2, wordCount: 23, avgScore: 7.2, color: '#86efac', palavras: ['pampa', 'coxilha'] },
    { codigo: 'T1', nome: 'Trabalho', nivel: 1, wordCount: 38, avgScore: 9.1, color: '#f59e0b', palavras: ['lida', 'tropear'] },
    { codigo: 'C1', nome: 'Cultura', nivel: 1, wordCount: 52, avgScore: 10.5, color: '#8b5cf6', palavras: ['payador', 'milonga'] },
  ];

  const filteredDomains = useMemo(() => {
    if (hierarchyLevel === 'all') return mockDomains;
    return mockDomains.filter(d => d.nivel === parseInt(hierarchyLevel));
  }, [hierarchyLevel]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasProcessedCorpus) {
    return (
      <Alert className="border-yellow-500/20 bg-yellow-500/5">
        <Sparkles className="h-4 w-4 text-yellow-500" />
        <AlertDescription>
          <strong>Processamento Necessário</strong>
          <p className="mt-2">
            Complete a <strong>Etiquetagem Semântica</strong> (Passo 1) primeiro para visualizar os domínios semânticos.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Domínios Semânticos
            </CardTitle>
            <CardDescription>
              Visualização interativa dos domínios identificados no corpus
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button
              variant={displayMode === 'cloud' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('cloud')}
            >
              <Cloud className="h-4 w-4 mr-2" />
              Nuvem
            </Button>
            <Button
              variant={displayMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('table')}
            >
              <TableIcon className="h-4 w-4 mr-2" />
              Tabela
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={hierarchyLevel} onValueChange={(v) => setHierarchyLevel(v as HierarchyLevel)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Níveis</SelectItem>
                <SelectItem value="1">Nível 1 (Raiz)</SelectItem>
                <SelectItem value="2">Nível 2</SelectItem>
                <SelectItem value="3">Nível 3</SelectItem>
                <SelectItem value="4">Nível 4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="domains">Domínios</TabsTrigger>
              <TabsTrigger value="words">Palavras</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Visualização */}
        {displayMode === 'cloud' ? (
          <div className="min-h-[400px] bg-muted/20 rounded-lg flex items-center justify-center p-8">
            <div className="flex flex-wrap gap-4 justify-center">
              {filteredDomains.map((domain) => (
                <div
                  key={domain.codigo}
                  className="transition-all hover:scale-110 cursor-pointer"
                  style={{
                    fontSize: `${Math.max(14, domain.avgScore * 2)}px`,
                    color: domain.color,
                    fontWeight: 600,
                  }}
                  title={`${domain.nome} (${domain.wordCount} palavras)`}
                >
                  {viewMode === 'domains' ? domain.nome : domain.palavras.join(' · ')}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Domínio</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead className="text-right">Palavras</TableHead>
                <TableHead className="text-right">Score Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.map((domain) => (
                <TableRow key={domain.codigo}>
                  <TableCell>
                    <Badge variant="outline" style={{ borderColor: domain.color, color: domain.color }}>
                      {domain.codigo}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{domain.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Nível {domain.nivel}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{domain.wordCount}</TableCell>
                  <TableCell className="text-right font-mono">{domain.avgScore.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
