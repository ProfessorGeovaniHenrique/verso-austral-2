import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, Info, FileSearch } from 'lucide-react';
import { useDuplicateAnalysis, DuplicateAnalysis } from '@/hooks/useDuplicateAnalysis';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const AVAILABLE_SOURCES = [
  { value: 'Navarro 2014', label: 'Dicionário Nordestino (Navarro 2014)' },
  { value: 'I', label: 'Vocabulário Sul-Rio-Grandense Vol. I' },
  { value: 'II', label: 'Vocabulário Sul-Rio-Grandense Vol. II' },
  { value: 'Rocha Pombo', label: 'Dicionário de Sinônimos (Rocha Pombo)' },
];

export function DuplicateAnalysisDashboard() {
  const [selectedSource, setSelectedSource] = useState<string>('Navarro 2014');
  const { analysis, isAnalyzing, analyzeDuplicates } = useDuplicateAnalysis();

  const handleAnalyze = async () => {
    await analyzeDuplicates(selectedSource);
  };

  return (
    <div className="space-y-6">
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Análise de Duplicatas
          </CardTitle>
          <CardDescription>
            Detecta verbetes duplicados dentro de cada dicionário específico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              Esta análise detecta apenas duplicatas <strong>dentro do mesmo dicionário</strong>. 
              Verbetes repetidos entre diferentes dicionários são esperados e enriquecem o corpus.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Dicionário</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_SOURCES.map(source => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isAnalyzing ? 'Analisando...' : 'Analisar Duplicatas'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {analysis && (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Entradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.totalEntries}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Verbetes Únicos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{analysis.uniqueEntries}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Duplicatas Encontradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{analysis.duplicateCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Taxa Duplicação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant={analysis.duplicateRate > 10 ? 'destructive' : 'secondary'}>
                    {analysis.duplicateRate}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interpretação */}
          <Card>
            <CardHeader>
              <CardTitle>Interpretação dos Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.duplicateRate === 0 ? (
                <Alert className="border-green-500 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-600">Excelente!</AlertTitle>
                  <AlertDescription>
                    Nenhuma duplicata detectada. O dicionário <strong>{analysis.dictionarySource}</strong> 
                    está com 100% de unicidade.
                  </AlertDescription>
                </Alert>
              ) : analysis.duplicateRate < 5 ? (
                <Alert className="border-purple-500 bg-purple-50">
                  <Info className="h-4 w-4 text-purple-600" />
                  <AlertTitle className="text-purple-600">Boa Qualidade</AlertTitle>
                  <AlertDescription>
                    Taxa de duplicação baixa ({analysis.duplicateRate}%). 
                    Alguns verbetes possuem múltiplas entradas, possivelmente por acepções diferentes.
                  </AlertDescription>
                </Alert>
              ) : analysis.duplicateRate < 15 ? (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-600">Atenção</AlertTitle>
                  <AlertDescription>
                    Taxa de duplicação moderada ({analysis.duplicateRate}%). 
                    Recomenda-se revisar os verbetes duplicados para possível consolidação.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Alta Duplicação</AlertTitle>
                  <AlertDescription>
                    Taxa de duplicação alta ({analysis.duplicateRate}%). 
                    Recomenda-se urgentemente revisar e consolidar os verbetes duplicados.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Top Duplicatas */}
          {analysis.topDuplicates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top 20 Verbetes Duplicados</CardTitle>
                <CardDescription>
                  Verbetes com maior número de ocorrências duplicadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Verbete</TableHead>
                        <TableHead className="text-right">Ocorrências</TableHead>
                        <TableHead>Classes Gramaticais</TableHead>
                        <TableHead>Definições</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.topDuplicates.map((dup) => (
                        <TableRow key={dup.verbete}>
                          <TableCell className="font-medium">{dup.verbete}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">{dup.occurrences}x</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {[...new Set(dup.entries.map(e => e.classe_gramatical))].map(pos => (
                                <Badge key={pos} variant="outline" className="text-xs">
                                  {pos || 'indefinido'}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {dup.entries.map(e => 
                                Array.isArray(e.definicoes) ? e.definicoes.length : 0
                              ).reduce((a, b) => a + b, 0)} definições totais
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
