import { useState } from 'react';
import { useSubcorpora } from '@/hooks/useSubcorpora';
import { SubcorpusDashboard } from '@/components/subcorpus/SubcorpusDashboard';
import { SubcorpusSelector } from '@/components/subcorpus/SubcorpusSelector';
import { KeywordsComparisonChart } from '@/components/subcorpus/KeywordsComparisonChart';
import { DomainRadarComparison } from '@/components/subcorpus/DomainRadarComparison';
import { Card, CardContent } from '@/components/ui/card';
import { SubcorpusComparisonMode, ComparativoSubcorpora } from '@/data/types/subcorpus.types';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function TabSubcorpus() {
  const { subcorpora, isLoading, compareArtists } = useSubcorpora('gaucho');
  const [mode, setMode] = useState<SubcorpusComparisonMode>('compare');
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparativoSubcorpora | null>(null);
  
  const handleCompare = () => {
    if (!selectedA) return;
    
    const artistaB = mode === 'compare' ? selectedB : undefined;
    const result = compareArtists(selectedA, artistaB);
    
    if (result) {
      setComparison(result);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando subcorpora...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Título e Descrição */}
      <div>
        <h1 className="text-3xl font-bold">Análise de Subcorpora</h1>
        <p className="text-muted-foreground mt-2">
          Explore e compare os subcorpora (artistas) do corpus gaúcho
        </p>
      </div>
      
      {/* Seletor de Comparação */}
      <SubcorpusSelector
        subcorpora={subcorpora}
        mode={mode}
        selectedA={selectedA}
        selectedB={selectedB}
        onModeChange={setMode}
        onSelectA={setSelectedA}
        onSelectB={setSelectedB}
        onCompare={handleCompare}
      />
      
      {/* Resultado da Comparação */}
      {comparison && (
        <div className="space-y-6">
          {/* Overview Comparativo */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Subcorpus A */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary">
                    {comparison.subcorpusA.artista}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>{comparison.subcorpusA.totalMusicas}</strong> músicas</p>
                    <p><strong>{comparison.subcorpusA.totalPalavras.toLocaleString('pt-BR')}</strong> palavras</p>
                    <p>Riqueza Lexical: <strong>{(comparison.subcorpusA.riquezaLexical * 100).toFixed(1)}%</strong></p>
                  </div>
                </div>
                
                {/* Subcorpus B */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary">
                    {comparison.subcorpusB.artista}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>{comparison.subcorpusB.totalMusicas}</strong> músicas</p>
                    <p><strong>{comparison.subcorpusB.totalPalavras.toLocaleString('pt-BR')}</strong> palavras</p>
                    <p>Riqueza Lexical: <strong>{(comparison.subcorpusB.riquezaLexical * 100).toFixed(1)}%</strong></p>
                  </div>
                </div>
              </div>
              
              {/* Estatísticas de Vocabulário */}
              <div className="mt-6 pt-6 border-t space-y-2">
                <h4 className="font-semibold">Análise de Vocabulário</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Compartilhadas</p>
                    <p className="text-2xl font-bold text-primary">
                      {comparison.palavrasExclusivas.compartilhadas.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Exclusivas de {comparison.subcorpusA.artista}</p>
                    <p className="text-2xl font-bold">
                      {comparison.palavrasExclusivas.apenasA.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Exclusivas de {comparison.subcorpusB.artista}</p>
                    <p className="text-2xl font-bold">
                      {comparison.palavrasExclusivas.apenasB.length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Keywords Comparativas */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-bold mb-4">Keywords Distintivas</h3>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Keywords A */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold">{comparison.subcorpusA.artista}</h4>
                    <Badge variant="secondary">
                      Top {Math.min(20, comparison.keywordsComparativas.keywordsA.length)}
                    </Badge>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Palavra</TableHead>
                        <TableHead className="text-right">Freq</TableHead>
                        <TableHead className="text-right">LL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.keywordsComparativas.keywordsA.slice(0, 20).map((kw) => (
                        <TableRow key={kw.palavra}>
                          <TableCell className="font-mono">{kw.palavra}</TableCell>
                          <TableCell className="text-right">{kw.freqEstudo}</TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant={kw.significancia === 'Alta' ? 'destructive' : 'secondary'}
                              className="gap-1"
                            >
                              {kw.efeito === 'super-representado' ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {kw.ll.toFixed(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Keywords B */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold">{comparison.subcorpusB.artista}</h4>
                    <Badge variant="secondary">
                      Top {Math.min(20, comparison.keywordsComparativas.keywordsB.length)}
                    </Badge>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Palavra</TableHead>
                        <TableHead className="text-right">Freq</TableHead>
                        <TableHead className="text-right">LL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.keywordsComparativas.keywordsB.slice(0, 20).map((kw) => (
                        <TableRow key={kw.palavra}>
                          <TableCell className="font-mono">{kw.palavra}</TableCell>
                          <TableCell className="text-right">{kw.freqEstudo}</TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant={kw.significancia === 'Alta' ? 'destructive' : 'secondary'}
                              className="gap-1"
                            >
                              {kw.efeito === 'super-representado' ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {kw.ll.toFixed(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Visualizações Gráficas */}
          <KeywordsComparisonChart
            keywordsA={comparison.keywordsComparativas.keywordsA}
            keywordsB={comparison.keywordsComparativas.keywordsB}
            artistaA={comparison.subcorpusA.artista}
            artistaB={comparison.subcorpusB.artista}
          />
          
          {comparison.dominiosComparativos && (
            <DomainRadarComparison
              dominiosA={comparison.dominiosComparativos.dominiosA}
              dominiosB={comparison.dominiosComparativos.dominiosB}
              artistaA={comparison.subcorpusA.artista}
              artistaB={comparison.subcorpusB.artista}
            />
          )}
        </div>
      )}
      
      {/* Dashboard de Todos os Subcorpora */}
      {!comparison && (
        <>
          <Alert>
            <AlertDescription>
              Selecione os subcorpora acima e clique em "Comparar" para visualizar a análise comparativa.
            </AlertDescription>
          </Alert>
          
          <SubcorpusDashboard
            subcorpora={subcorpora}
            onSelectSubcorpus={setSelectedA}
            selectedArtista={selectedA}
          />
        </>
      )}
    </div>
  );
}
