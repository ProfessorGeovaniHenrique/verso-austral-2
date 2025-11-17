import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Layers, Tag } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { getDemoAnalysisResults } from "@/services/demoCorpusService";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface TabGalaxyProps {
  demo?: boolean;
}

type ViewMode = 'domains' | 'keywords';

export function TabGalaxy({ demo = false }: TabGalaxyProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('domains');
  const [isLoading, setIsLoading] = useState(false);
  const [demoData, setDemoData] = useState<any>(null);

  useEffect(() => {
    if (demo) {
      setIsLoading(true);
      getDemoAnalysisResults()
        .then(result => {
          setDemoData(result);
          toast.success('Visualização carregada com sucesso');
        })
        .catch(error => {
          console.error('Erro ao carregar dados demo:', error);
          toast.error('Erro ao carregar visualização');
        })
        .finally(() => setIsLoading(false));
    }
  }, [demo]);

  const cloudItems = useMemo(() => {
    if (!demoData) return [];

    if (viewMode === 'domains') {
      // Visualização por domínios semânticos
      return demoData.dominios.map((d: any) => ({
        label: d.dominio,
        size: d.percentual * 3, // Tamanho proporcional ao percentual
        color: d.cor,
        type: 'domain' as const,
        tooltip: {
          nome: d.dominio,
          descricao: d.descricao,
          ocorrencias: d.ocorrencias,
          riquezaLexical: d.riquezaLexical,
          percentual: d.percentual,
          avgLL: d.avgLL
        }
      }));
    } else {
      // Visualização por palavras-chave (agrupadas por domínio)
      const keywords = demoData.keywords.filter((k: any) => k.significancia !== 'Baixa');
      return keywords.map((k: any) => ({
        label: k.palavra,
        size: Math.max(12, k.ll / 2), // Tamanho proporcional ao LL score
        color: k.cor,
        type: 'keyword' as const,
        tooltip: {
          palavra: k.palavra,
          dominio: k.dominio,
          frequencia: k.frequencia,
          ll: k.ll,
          mi: k.mi,
          significancia: k.significancia,
          prosody: k.prosody
        }
      }));
    }
  }, [demoData, viewMode]);

  if (!demo) {
    return (
      <Card className="card-academic">
        <CardHeader>
          <CardTitle className="section-header-academic flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Nuvem de Domínios Semânticos
          </CardTitle>
          <CardDescription className="section-description-academic">
            Visualização interativa - Disponível apenas em modo demo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg border">
            <p className="text-muted-foreground">Dados não disponíveis no modo padrão</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="card-academic">
        <CardHeader>
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card-academic">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="section-header-academic flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Nuvem Semântica - "Quando o Verso Vem pras Casa"
              </CardTitle>
              <CardDescription className="section-description-academic mt-2">
                Visualização por {viewMode === 'domains' ? 'domínios semânticos' : 'palavras-chave'} com magnitude proporcional
              </CardDescription>
            </div>
            
            {/* Toggle de Visualização */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'domains' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('domains')}
                className="gap-2"
              >
                <Layers className="w-4 h-4" />
                Domínios
              </Button>
              <Button
                variant={viewMode === 'keywords' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('keywords')}
                className="gap-2"
              >
                <Tag className="w-4 h-4" />
                Palavras-chave
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Info sobre o modo atual */}
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              {viewMode === 'domains' ? (
                <>
                  <strong>Visualização por Domínios:</strong> Tamanho proporcional ao percentual temático. 
                  Passe o mouse sobre os domínios para ver detalhes.
                </>
              ) : (
                <>
                  <strong>Visualização por Palavras-chave:</strong> Tamanho proporcional ao Log-Likelihood (keyness). 
                  Cores herdadas dos domínios semânticos. Apenas palavras de significância média/alta.
                </>
              )}
            </p>
          </div>

          {/* Nuvem Semântica */}
          <div className="min-h-[500px] bg-white rounded-lg border p-8 flex items-center justify-center">
            <TooltipProvider>
              <div className="flex flex-wrap gap-4 justify-center items-center max-w-6xl">
                {cloudItems.map((item, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div
                        className="transition-all hover:scale-105 cursor-pointer select-none"
                        style={{
                          fontSize: `${item.size}px`,
                          fontWeight: 600,
                          color: item.color,
                          lineHeight: 1.2,
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {item.label}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      {item.type === 'domain' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-bold text-base">{item.tooltip.nome}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.tooltip.descricao}</p>
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                            <div>
                              <div className="text-xs text-muted-foreground">Ocorrências</div>
                              <div className="text-sm font-semibold">{item.tooltip.ocorrencias}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Riqueza Lexical</div>
                              <div className="text-sm font-semibold">{item.tooltip.riquezaLexical} lemas</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">% Temático</div>
                              <div className="text-sm font-semibold">{item.tooltip.percentual.toFixed(2)}%</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">LL Médio</div>
                              <div className="text-sm font-semibold">{item.tooltip.avgLL.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Tag className="w-3 h-3" style={{ color: item.color }} />
                            <span className="font-bold text-base">{item.tooltip.palavra}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ borderColor: item.color, color: item.color }}
                            >
                              {item.tooltip.dominio}
                            </Badge>
                            <Badge 
                              variant={item.tooltip.prosody > 0 ? 'default' : item.tooltip.prosody < 0 ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {item.tooltip.prosody > 0 ? 'Positiva' : item.tooltip.prosody < 0 ? 'Negativa' : 'Neutra'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                            <div>
                              <div className="text-xs text-muted-foreground">Freq.</div>
                              <div className="text-sm font-semibold">{item.tooltip.frequencia}×</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">LL</div>
                              <div className="text-sm font-semibold">{item.tooltip.ll.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">MI</div>
                              <div className="text-sm font-semibold">{item.tooltip.mi.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <Badge variant="outline" className="text-xs">
                              {item.tooltip.significancia} Significância
                            </Badge>
                          </div>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Legenda */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>
                {viewMode === 'domains' 
                  ? `${cloudItems.length} domínios semânticos identificados`
                  : `${cloudItems.length} palavras-chave de alta/média significância`
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
