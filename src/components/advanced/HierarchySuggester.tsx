import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, CheckCircle2, XCircle, Edit, Zap, PlayCircle } from "lucide-react";
import { Tagset } from "@/hooks/useTagsets";
import { generateHierarchySuggestions, HierarchySuggestion } from "@/lib/semanticSimilarity";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIRefinedSuggestion {
  tagsetPaiRecomendado: {
    codigo: string | null;
    nome: string | null;
    confianca: number;
  };
  nivelSugerido: number;
  justificativa: string;
  melhorias: {
    descricaoSugerida?: string;
    exemplosAdicionais?: string[];
    alertas?: string[];
  };
  alternativas: Array<{
    codigo: string;
    nome: string;
    razao: string;
  }>;
}

interface HierarchySuggesterProps {
  tagsetsPendentes: Tagset[];
  tagsetsAtivos: Tagset[];
  onAcceptSuggestion: (tagsetId: string, tagsetPaiCodigo: string) => void;
  onRejectTagset: (tagsetId: string) => void;
  onEditManual?: (tagset: Tagset) => void;
}

export function HierarchySuggester({
  tagsetsPendentes,
  tagsetsAtivos,
  onAcceptSuggestion,
  onRejectTagset,
  onEditManual,
}: HierarchySuggesterProps) {
  const [suggestions, setSuggestions] = useState<Map<string, HierarchySuggestion[]>>(new Map());
  const [processing, setProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Map<string, AIRefinedSuggestion>>(new Map());
  const [loadingAI, setLoadingAI] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    completed: number;
    isRunning: boolean;
  }>({ total: 0, completed: 0, isRunning: false });

  useEffect(() => {
    if (tagsetsPendentes.length === 0 || tagsetsAtivos.length === 0) {
      setSuggestions(new Map());
      return;
    }

    setProcessing(true);
    const newSuggestions = new Map<string, HierarchySuggestion[]>();

    // Gera sugestões para cada tagset pendente
    tagsetsPendentes.forEach(pendente => {
      const suggs = generateHierarchySuggestions(pendente, tagsetsAtivos, 3);
      if (suggs.length > 0) {
        newSuggestions.set(pendente.id, suggs);
      }
    });

    setSuggestions(newSuggestions);
    setProcessing(false);
  }, [tagsetsPendentes, tagsetsAtivos]);

  const handleAccept = (tagset: Tagset, suggestion: HierarchySuggestion) => {
    onAcceptSuggestion(tagset.id, suggestion.tagsetPai.codigo);
    toast.success(`DS "${tagset.nome}" vinculado a "${suggestion.tagsetPai.nome}"`);
  };

  const handleReject = (tagset: Tagset) => {
    onRejectTagset(tagset.id);
    toast.info(`DS "${tagset.nome}" rejeitado`);
  };

  const refineWithAI = async (tagset: Tagset) => {
    const loadingId = tagset.id;
    setLoadingAI(prev => new Set(prev).add(loadingId));
    
    try {
      console.log(`[AI Analysis] Starting analysis for: ${tagset.codigo}`);
      
      const { data, error } = await supabase.functions.invoke('refine-tagset-suggestions', {
        body: {
          tagsetPendente: tagset,
          tagsetsAtivos: tagsetsAtivos
        }
      });
      
      if (error) {
        console.error('[AI Analysis] Supabase function error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from AI analysis');
      }
      
      console.log('[AI Analysis] Success:', data);
      setAiSuggestions(prev => new Map(prev).set(tagset.id, data));
      toast.success("Análise IA concluída com sucesso!");
      
    } catch (error) {
      console.error('[AI Analysis] Error:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Erro ao refinar sugestões com IA"
      );
    } finally {
      setLoadingAI(prev => {
        const newSet = new Set(prev);
        newSet.delete(loadingId);
        return newSet;
      });
    }
  };

  const analyzeBatchWithAI = async () => {
    if (tagsetsPendentes.length === 0) {
      toast.info("Não há tagsets pendentes para analisar");
      return;
    }

    const totalTagsets = tagsetsPendentes.length;
    setBatchProgress({ total: totalTagsets, completed: 0, isRunning: true });
    
    console.log(`[Batch AI Analysis] Starting batch analysis of ${totalTagsets} tagsets`);
    toast.info(`Iniciando análise em lote de ${totalTagsets} tagsets...`);

    let completed = 0;
    const errors: string[] = [];

    // Processar em lotes de 3 para evitar sobrecarga
    const batchSize = 3;
    for (let i = 0; i < tagsetsPendentes.length; i += batchSize) {
      const batch = tagsetsPendentes.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (tagset) => {
          try {
            setLoadingAI(prev => new Set(prev).add(tagset.id));
            
            const { data, error } = await supabase.functions.invoke('refine-tagset-suggestions', {
              body: {
                tagsetPendente: tagset,
                tagsetsAtivos: tagsetsAtivos
              }
            });
            
            if (error) throw error;
            if (!data) throw new Error('No data returned');
            
            setAiSuggestions(prev => new Map(prev).set(tagset.id, data));
            completed++;
            setBatchProgress(prev => ({ ...prev, completed }));
            
            console.log(`[Batch AI] ${completed}/${totalTagsets} - Success: ${tagset.codigo}`);
            
          } catch (error) {
            console.error(`[Batch AI] Error analyzing ${tagset.codigo}:`, error);
            errors.push(tagset.nome);
          } finally {
            setLoadingAI(prev => {
              const newSet = new Set(prev);
              newSet.delete(tagset.id);
              return newSet;
            });
          }
        })
      );

      // Pequeno delay entre lotes para evitar rate limiting
      if (i + batchSize < tagsetsPendentes.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setBatchProgress({ total: 0, completed: 0, isRunning: false });
    
    if (errors.length === 0) {
      toast.success(`✨ Análise em lote concluída! ${completed} tagsets analisados com sucesso.`);
    } else {
      toast.warning(
        `Análise concluída: ${completed - errors.length}/${totalTagsets} com sucesso. ${errors.length} com erro: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`
      );
    }
    
    console.log(`[Batch AI Analysis] Completed: ${completed}/${totalTagsets}, Errors: ${errors.length}`);
  };

  if (tagsetsPendentes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestões Inteligentes
          </CardTitle>
          <CardDescription>
            Não há tagsets pendentes para análise
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestões Inteligentes de Hierarquia
            </CardTitle>
            <CardDescription>
              Sistema de análise semântica para posicionamento hierárquico de tagsets pendentes
            </CardDescription>
          </div>
          
          <Button
            onClick={analyzeBatchWithAI}
            disabled={batchProgress.isRunning || tagsetsPendentes.length === 0}
            className="gap-2"
            variant="default"
          >
            <PlayCircle className="h-4 w-4" />
            {batchProgress.isRunning 
              ? `Analisando... (${batchProgress.completed}/${batchProgress.total})`
              : `Analisar Todos (${tagsetsPendentes.length})`
            }
          </Button>
        </div>
        
        {/* Progress Bar para Batch Analysis */}
        {batchProgress.isRunning && (
          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Progresso da análise em lote
              </span>
              <span className="font-medium">
                {batchProgress.completed} / {batchProgress.total}
              </span>
            </div>
            <Progress 
              value={(batchProgress.completed / batchProgress.total) * 100} 
              className="h-2"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {processing ? (
          <div className="text-center py-8 text-muted-foreground">
            Analisando similaridade semântica...
          </div>
        ) : (
          tagsetsPendentes.map(pendente => {
            const suggs = suggestions.get(pendente.id) || [];
            const aiSuggestion = aiSuggestions.get(pendente.id);
            
            return (
              <div key={pendente.id} className="border rounded-lg p-4 space-y-4">
                {/* Tagset Pendente */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{pendente.nome}</h4>
                        <Badge variant="outline" className="text-xs">
                          {pendente.codigo}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Pendente
                        </Badge>
                        
                        {/* Botão de Análise IA */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refineWithAI(pendente)}
                          disabled={loadingAI.has(pendente.id)}
                          className="gap-2 ml-auto"
                        >
                          <Zap className="h-4 w-4" />
                          {loadingAI.has(pendente.id) ? 'Analisando...' : 'Análise IA'}
                        </Button>
                      </div>
                      {pendente.descricao && (
                        <p className="text-sm text-muted-foreground">
                          {pendente.descricao}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReject(pendente)}
                      className="text-destructive hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {pendente.exemplos && pendente.exemplos.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Exemplos:</span>
                      {pendente.exemplos.slice(0, 5).map((ex, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {ex}
                        </Badge>
                      ))}
                      {pendente.exemplos.length > 5 && (
                        <span className="text-xs text-muted-foreground">
                          +{pendente.exemplos.length - 5} mais
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Sugestão Refinada por IA */}
                {aiSuggestion && (
                  <Alert className="border-primary bg-primary/5">
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle className="flex items-center gap-2">
                      Sugestão Refinada por IA (Gemini)
                      <Badge variant="default" className="ml-auto">
                        {aiSuggestion.tagsetPaiRecomendado.confianca}% confiança
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="space-y-3 mt-2">
                      {aiSuggestion.tagsetPaiRecomendado.codigo ? (
                        <>
                          <div>
                            <strong className="text-foreground">Recomendação Principal:</strong>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="default">
                                {aiSuggestion.tagsetPaiRecomendado.nome}
                              </Badge>
                              <Badge variant="outline">
                                [{aiSuggestion.tagsetPaiRecomendado.codigo}]
                              </Badge>
                              <Badge variant="secondary">
                                Nível {aiSuggestion.nivelSugerido}
                              </Badge>
                            </div>
                          </div>
                          
                          <div>
                            <strong className="text-foreground">Justificativa:</strong>
                            <p className="text-sm mt-1 leading-relaxed">
                              {aiSuggestion.justificativa}
                            </p>
                          </div>
                          
                          {aiSuggestion.melhorias.descricaoSugerida && (
                            <div>
                              <strong className="text-foreground">Descrição Melhorada:</strong>
                              <p className="text-sm italic mt-1 text-muted-foreground">
                                "{aiSuggestion.melhorias.descricaoSugerida}"
                              </p>
                            </div>
                          )}
                          
                          {aiSuggestion.melhorias.exemplosAdicionais && aiSuggestion.melhorias.exemplosAdicionais.length > 0 && (
                            <div>
                              <strong className="text-foreground">Exemplos Adicionais Sugeridos:</strong>
                              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                                {aiSuggestion.melhorias.exemplosAdicionais.map((ex, i) => (
                                  <li key={i}>{ex}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {aiSuggestion.melhorias.alertas && aiSuggestion.melhorias.alertas.length > 0 && (
                            <div>
                              <strong className="text-amber-600">⚠️ Alertas:</strong>
                              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                                {aiSuggestion.melhorias.alertas.map((alerta, i) => (
                                  <li key={i} className="text-amber-600">{alerta}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {aiSuggestion.alternativas.length > 0 && (
                            <div>
                              <strong className="text-foreground">Alternativas Viáveis:</strong>
                              <div className="space-y-2 mt-1">
                                {aiSuggestion.alternativas.map((alt, i) => (
                                  <div key={i} className="text-sm border-l-2 border-muted pl-2">
                                    <div className="font-medium">{alt.nome} [{alt.codigo}]</div>
                                    <div className="text-muted-foreground text-xs">{alt.razao}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <Button
                            size="sm"
                            onClick={() => {
                              onAcceptSuggestion(pendente.id, aiSuggestion.tagsetPaiRecomendado.codigo!);
                              toast.success(`DS "${pendente.nome}" vinculado a "${aiSuggestion.tagsetPaiRecomendado.nome}" (sugestão IA)`);
                            }}
                            className="mt-2"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aceitar Sugestão da IA
                          </Button>
                        </>
                      ) : (
                        <div>
                          <strong className="text-foreground">Recomendação:</strong>
                          <p className="text-sm mt-1">
                            A IA sugere que este tagset seja de <strong>Nível 1</strong> (categoria geral, sem pai).
                          </p>
                          <p className="text-sm mt-2 leading-relaxed">
                            <strong>Justificativa:</strong> {aiSuggestion.justificativa}
                          </p>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Sugestões Automáticas */}
                {suggs.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Sugestões de Posicionamento:
                    </div>
                    
                    <div className="space-y-2">
                      {suggs.map((sugg, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {sugg.tagsetPai.nome}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {sugg.tagsetPai.codigo}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Nível {sugg.nivel_sugerido}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {sugg.razao}
                            </p>
                          </div>
                          
                          <Button
                            size="sm"
                            variant={idx === 0 ? "default" : "outline"}
                            onClick={() => handleAccept(pendente, sugg)}
                            className="ml-2"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aceitar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground text-center py-2 bg-muted/30 rounded-md">
                      Nenhuma sugestão automática encontrada
                    </div>
                    {onEditManual && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditManual(pendente)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Curadoria Manual
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Configure manualmente o nível e categoria pai
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
