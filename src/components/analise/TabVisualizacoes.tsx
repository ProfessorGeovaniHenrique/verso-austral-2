import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useDashboardAnaliseContext } from '@/contexts/DashboardAnaliseContext';
import { Network, Cloud, AlertCircle, Layers, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useCorpusProcessing } from '@/hooks/useCorpusProcessing';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CongratulatoryModal } from './CongratulatoryModal';
import { useAnalysisTracking, useLevelTracking } from '@/hooks/useAnalysisTracking';

type HierarchyLevel = 1 | 2 | 3 | 4;
type ViewMode = 'domains' | 'keywords';

export function TabVisualizacoes() {
  const { processamentoData } = useDashboardAnaliseContext();
  const { processCorpus, isProcessing } = useCorpusProcessing();
  const { trackFeatureUsage } = useAnalysisTracking();
  const { trackLevelView } = useLevelTracking();
  
  const [selectedLevel, setSelectedLevel] = useState<HierarchyLevel>(1);
  const [viewMode, setViewMode] = useState<ViewMode>('domains');
  const [showCongratulatoryModal, setShowCongratulatoryModal] = useState(false);
  const [hasInteractedWithCloud, setHasInteractedWithCloud] = useState(() => {
    return localStorage.getItem('cloud_first_interaction') === 'true';
  });
  
  const cloudData = processamentoData.analysisResults?.cloudData || [];
  const keywords = processamentoData.analysisResults?.keywords || [];

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
    trackLevelView(level);
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

  const handleCloudInteraction = () => {
    if (!hasInteractedWithCloud) {
      setHasInteractedWithCloud(true);
      localStorage.setItem('cloud_first_interaction', 'true');
      trackFeatureUsage('cloud_explored');
      
      // Exibir modal de parabéns após 500ms
      setTimeout(() => {
        setShowCongratulatoryModal(true);
      }, 500);
    }
  };

  const handleNetworkInteraction = () => {
    trackFeatureUsage('network_explored');
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Modo de Visualização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Modo de Visualização
          </CardTitle>
          <CardDescription>
            Escolha entre visualizar domínios semânticos ou palavras-chave individuais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="domains" className="gap-2">
                <Layers className="h-4 w-4" />
                Domínios Semânticos
              </TabsTrigger>
              <TabsTrigger value="keywords" className="gap-2">
                <Hash className="h-4 w-4" />
                Palavras-chave
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Seletor de Nível Hierárquico - Apenas para modo Domínios */}
      {viewMode === 'domains' && (
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
      )}

      {/* Nuvem de Domínios ou Palavras-chave */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            {viewMode === 'domains' 
              ? `Nuvem de Domínios Semânticos (N${selectedLevel})`
              : 'Nuvem de Palavras-chave por Domínio'
            }
          </CardTitle>
          <CardDescription>
            {viewMode === 'domains'
              ? 'Tamanho proporcional ao peso textual de cada domínio'
              : 'Palavras-chave coloridas por domínio semântico, tamanho por relevância estatística'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 justify-center items-center min-h-[400px] p-8">
            {viewMode === 'domains' ? (
              // Modo Domínios
              cloudData.map((item, idx) => {
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
                        onClick={handleCloudInteraction}
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
              })
            ) : (
              // Modo Palavras-chave
              keywords.slice(0, 80).map((keyword, idx) => {
                // Encontrar o domínio pai para obter a cor
                const domain = cloudData.find(d => d.codigo === keyword.dominio);
                const color = domain?.color || 'hsl(var(--primary))';
                
                // Tamanho baseado no LL (log-likelihood)
                const llScore = keyword.ll || 0;
                const fontSize = Math.max(12, Math.min(48, 12 + (llScore / 5)));
                
                return (
                  <HoverCard key={idx} openDelay={200}>
                  <HoverCardTrigger asChild>
                      <div
                        className="transition-transform hover:scale-110 cursor-pointer"
                        style={{
                          fontSize: `${fontSize}px`,
                          color: color,
                          fontWeight: 600,
                        }}
                        onClick={handleCloudInteraction}
                      >
                        {keyword.palavra}
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <h4 className="font-semibold text-base">{keyword.palavra}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Domínio:</span>
                            <p className="font-semibold">{domain?.nome || keyword.dominio}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Log-Likelihood:</span>
                            <p className="font-semibold">{keyword.ll?.toFixed(2) || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">MI Score:</span>
                            <p className="font-semibold">{keyword.mi?.toFixed(2) || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Frequência:</span>
                            <p className="font-semibold">{keyword.frequencia || 0}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Significância:</span>
                            <Badge variant={
                              keyword.significancia === 'p < 0.0001' ? 'default' :
                              keyword.significancia === 'p < 0.001' ? 'secondary' : 'outline'
                            }>
                              {keyword.significancia || 'N/A'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })
            )}
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
                  <div
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:border-primary transition-colors cursor-pointer"
                    onClick={handleNetworkInteraction}
                  >
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
      
      {/* Modal de Parabéns */}
      <CongratulatoryModal 
        isOpen={showCongratulatoryModal} 
        onClose={() => setShowCongratulatoryModal(false)} 
      />
    </div>
  );
}
