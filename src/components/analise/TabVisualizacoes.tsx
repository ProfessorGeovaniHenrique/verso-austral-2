import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useDashboardAnaliseContext } from '@/contexts/DashboardAnaliseContext';
import { Network, Cloud, AlertCircle, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useCorpusProcessing } from '@/hooks/useCorpusProcessing';
import { toast } from 'sonner';

type HierarchyLevel = 1 | 2 | 3 | 4;

export function TabVisualizacoes() {
  const { processamentoData } = useDashboardAnaliseContext();
  const { processCorpus, isProcessing } = useCorpusProcessing();
  const [selectedLevel, setSelectedLevel] = useState<HierarchyLevel>(1);
  const cloudData = processamentoData.analysisResults?.cloudData || [];

  if (!processamentoData.isProcessed || cloudData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Visualizações Científicas
          </CardTitle>
          <CardDescription>
            Representações visuais dos dados linguísticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Processe um corpus na aba <strong>Processamento</strong> para visualizar as representações gráficas dos domínios semânticos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleLevelChange = async (level: HierarchyLevel) => {
    setSelectedLevel(level);
    toast.info(`Carregando domínios de Nível ${level}...`);
    
    try {
      await processCorpus(
        processamentoData.studySong,
        processamentoData.referenceCorpus,
        level
      );
      toast.success(`Domínios de Nível ${level} carregados com sucesso`);
    } catch (error) {
      console.error('Erro ao carregar nível:', error);
      toast.error('Erro ao carregar domínios de outro nível');
    }
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Nível Hierárquico */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Nível Hierárquico
              </CardTitle>
              <CardDescription>
                Visualize domínios semânticos em diferentes níveis de granularidade
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              Nível {selectedLevel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {([1, 2, 3, 4] as HierarchyLevel[]).map((level) => (
              <Button
                key={level}
                variant={selectedLevel === level ? 'default' : 'outline'}
                onClick={() => handleLevelChange(level)}
                disabled={isProcessing}
                className="flex-1"
              >
                N{level}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            N1: Categorias Gerais • N2: Subcategorias • N3: Especificações • N4: Detalhamento
          </p>
        </CardContent>
      </Card>

      {/* Nuvem de Domínios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Nuvem de Domínios Semânticos (N{selectedLevel})
          </CardTitle>
          <CardDescription>
            Tamanho proporcional ao peso textual de cada domínio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 justify-center items-center min-h-[400px] p-8">
            {cloudData.map((item, idx) => {
              // Tamanho baseado no peso textual (avgScore): 14px + (avgScore * 1.5)
              const fontSize = Math.max(14, Math.min(64, 14 + (item.avgScore * 1.5)));
              return (
                <HoverCard key={idx} openDelay={200}>
                  <HoverCardTrigger asChild>
                    <div
                      className="transition-transform hover:scale-110 cursor-pointer"
                      style={{
                        fontSize: `${fontSize}px`,
                        color: item.color,
                        fontWeight: 'bold',
                      }}
                    >
                      {item.nome}
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-72">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <h4 className="font-semibold text-base">{item.nome}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Peso Textual:</span>
                          <p className="font-semibold">{item.avgScore.toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Palavras:</span>
                          <p className="font-semibold">{item.wordCount}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Nível:</span>
                          <p className="font-semibold">N{selectedLevel}</p>
                        </div>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rede Semântica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4" />
            Rede Semântica (N{selectedLevel})
          </CardTitle>
          <CardDescription>
            Conexões entre domínios semânticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cloudData.slice(0, 8).map((item, idx) => (
              <HoverCard key={idx} openDelay={200}>
                <HoverCardTrigger asChild>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:border-primary transition-colors cursor-pointer">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.codigo}
                    </div>
                    <div className="text-xs text-center font-medium">{item.nome}</div>
                    <Badge variant="secondary" className="text-xs">
                      {item.wordCount} palavras
                    </Badge>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <h4 className="font-semibold text-base">{item.nome}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Código:</span>
                        <p className="font-semibold">{item.codigo}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Peso:</span>
                        <p className="font-semibold">{item.avgScore.toFixed(1)}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Palavras:</span>
                        <p className="font-semibold">{item.wordCount}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nível:</span>
                        <p className="font-semibold">N{selectedLevel}</p>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
