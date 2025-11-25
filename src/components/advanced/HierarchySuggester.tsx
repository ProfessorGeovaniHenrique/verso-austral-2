import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Edit, Zap, Lightbulb, TrendingUp, AlertTriangle, PlayCircle, ArrowUpDown, Sparkles } from "lucide-react";
import { Tagset } from "@/hooks/useTagsets";
import { HierarchySuggestion, generateHierarchySuggestions } from "@/lib/semanticSimilarity";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { AITagsetCurator } from "./AITagsetCurator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AIRefinedSuggestion {
  paiRecomendado: string;
  nivelSugerido: number;
  confianca: number;
  justificativa: string;
  melhorias?: {
    descricao?: string;
    exemplosAdicionais?: string[];
    nomeSugerido?: string;
    codigoSugerido?: string;
    justificativaNome?: string;
  };
  alertas?: string[];
  alternativas?: Array<{
    codigo: string;
    nome: string;
    razao: string;
  }>;
}

interface PriorityScore {
  tagsetId: string;
  score: number;
  level: 'high' | 'medium' | 'low';
  factors: {
    aiConfidence: number;
    hierarchicalImpact: number;
    semanticUrgency: number;
    complexity: number;
  };
  reasoning: string;
}

interface HierarchySuggesterProps {
  tagsetsPendentes: Tagset[];
  tagsetsAtivos: Tagset[];
  onAcceptSuggestion: (tagsetId: string, tagsetPaiCodigo: string) => void;
  onRejectTagset: (tagsetId: string) => void;
  onEditManual?: (tagset: Tagset) => void;
  onApplyFullEdit?: (tagsetId: string, updates: Partial<Tagset>) => Promise<void>;
}

export function HierarchySuggester({
  tagsetsPendentes,
  tagsetsAtivos,
  onAcceptSuggestion,
  onRejectTagset,
  onEditManual,
  onApplyFullEdit,
}: HierarchySuggesterProps) {
  const [suggestions, setSuggestions] = useState<Map<string, HierarchySuggestion[]>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<Map<string, AIRefinedSuggestion>>(new Map());
  const [loadingAI, setLoadingAI] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [priorities, setPriorities] = useState<Map<string, PriorityScore>>(new Map());
  const [sortByPriority, setSortByPriority] = useState(false);
  const [curatorOpen, setCuratorOpen] = useState(false);
  const [selectedForCuration, setSelectedForCuration] = useState<{
    tagset: Tagset;
    aiSuggestion: AIRefinedSuggestion;
  } | null>(null);

  useEffect(() => {
    if (tagsetsPendentes.length === 0 || tagsetsAtivos.length === 0) {
      setSuggestions(new Map());
      return;
    }

    setIsProcessing(true);
    const newSuggestions = new Map<string, HierarchySuggestion[]>();

    tagsetsPendentes.forEach(pendente => {
      const suggs = generateHierarchySuggestions(pendente, tagsetsAtivos, 3);
      if (suggs.length > 0) {
        newSuggestions.set(pendente.id, suggs);
      }
    });

    setSuggestions(newSuggestions);
    setIsProcessing(false);
  }, [tagsetsPendentes, tagsetsAtivos]);

  const handleAccept = (tagsetId: string, paiCodigo: string) => {
    onAcceptSuggestion(tagsetId, paiCodigo);
  };

  const handleReject = (tagsetId: string) => {
    onRejectTagset(tagsetId);
  };

  const handleApplyCurated = async (editedTagset: Partial<Tagset> & { tagset_pai: string }) => {
    if (!selectedForCuration) return;
    
    // Usar nova função que aceita todas as edições
    if (onApplyFullEdit) {
      await onApplyFullEdit(selectedForCuration.tagset.id, {
        ...editedTagset,
        categoria_pai: editedTagset.tagset_pai, // Sincronizar com tagset_pai
      });
      toast.success("Tagset curado aplicado");
    } else {
      // Fallback para método antigo
      onAcceptSuggestion(selectedForCuration.tagset.id, editedTagset.tagset_pai);
      toast.success("Tagset curado aplicado (método legado)");
    }
  };

  const refineWithAI = async (pendente: Tagset) => {
    setLoadingAI(prev => new Set(prev).add(pendente.id));

    try {
      const { data, error } = await supabase.functions.invoke('refine-tagset-suggestions', {
        body: { tagsetPendente: pendente, tagsetsAtivos }
      });

      if (error) throw error;
      setAISuggestions(prev => new Map(prev).set(pendente.id, data));
      toast.success(`Análise concluída: ${pendente.nome}`);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro na análise IA');
    } finally {
      setLoadingAI(prev => {
        const next = new Set(prev);
        next.delete(pendente.id);
        return next;
      });
    }
  };

  const calculatePriorities = async () => {
    if (tagsetsPendentes.length === 0) return;

    try {
      const { data, error } = await supabase.functions.invoke('calculate-priority-score', {
        body: {
          tagsetsPendentes,
          aiSuggestions: Object.fromEntries(aiSuggestions),
          tagsetsAtivos
        }
      });

      if (error) throw error;

      const prioritiesMap = new Map<string, PriorityScore>();
      data.priorities.forEach((p: PriorityScore) => prioritiesMap.set(p.tagsetId, p));
      setPriorities(prioritiesMap);
      toast.success("Priorização calculada");
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro na priorização");
    }
  };

  const analyzeBatchWithAI = async () => {
    if (tagsetsPendentes.length === 0) return;
    setBatchProgress({ current: 0, total: tagsetsPendentes.length });

    const batchSize = 3;
    for (let i = 0; i < tagsetsPendentes.length; i += batchSize) {
      const batch = tagsetsPendentes.slice(i, i + batchSize);
      await Promise.all(batch.map(async (p) => {
        await refineWithAI(p);
        setBatchProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null);
      }));
      if (i + batchSize < tagsetsPendentes.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    toast.success("Análise em lote concluída");
    setBatchProgress(null);
    await calculatePriorities();
  };

  const sortedTagsetsPendentes = useMemo(() => {
    if (!sortByPriority || priorities.size === 0) return tagsetsPendentes;
    return [...tagsetsPendentes].sort((a, b) => {
      const pA = priorities.get(a.id);
      const pB = priorities.get(b.id);
      if (!pA && !pB) return 0;
      if (!pA) return 1;
      if (!pB) return -1;
      return pB.score - pA.score;
    });
  }, [tagsetsPendentes, priorities, sortByPriority]);

  const getPriorityBadge = (tagsetId: string) => {
    const priority = priorities.get(tagsetId);
    if (!priority) return null;

    const cfg = {
      high: { v: "destructive" as const, i: "🔴", l: "Alta" },
      medium: { v: "default" as const, i: "🟡", l: "Média" },
      low: { v: "secondary" as const, i: "🟢", l: "Baixa" }
    }[priority.level];

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={cfg.v} className="cursor-help">
              {cfg.i} {cfg.l} ({priority.score})
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{priority.reasoning}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (tagsetsPendentes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sugestões de Hierarquia</CardTitle>
          <CardDescription>Nenhum tagset pendente</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sugestões de Hierarquia</CardTitle>
            <CardDescription>Revise e aprove as sugestões</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={calculatePriorities} disabled={priorities.size > 0} variant="outline" size="sm">
              <ArrowUpDown className="h-4 w-4" /> Calcular Priorização
            </Button>
            {priorities.size > 0 && (
              <Button onClick={() => setSortByPriority(!sortByPriority)} variant={sortByPriority ? "default" : "outline"} size="sm">
                <ArrowUpDown className="h-4 w-4" /> {sortByPriority ? "Ordenado" : "Ordenar"}
              </Button>
            )}
            <Button onClick={analyzeBatchWithAI} disabled={loadingAI.size > 0} variant="default" size="sm">
              <PlayCircle className="h-4 w-4" /> Analisar Todos
            </Button>
          </div>
        </div>
      </CardHeader>

      {batchProgress && (
        <div className="px-6 pb-4">
          <Progress value={(batchProgress.current / batchProgress.total) * 100} />
        </div>
      )}

      <CardContent className="space-y-6">
        {sortedTagsetsPendentes.map((pendente) => {
          const suggs = suggestions.get(pendente.id) || [];
          const aiSugg = aiSuggestions.get(pendente.id);

          return (
            <div key={pendente.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{pendente.codigo}</Badge>
                    <h3 className="font-semibold">{pendente.nome}</h3>
                    {getPriorityBadge(pendente.id)}
                  </div>
                  {pendente.descricao && <p className="text-sm text-muted-foreground mt-1">{pendente.descricao}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => refineWithAI(pendente)} disabled={loadingAI.has(pendente.id)}>
                    <Zap className="h-4 w-4" /> {loadingAI.has(pendente.id) ? "..." : "Analisar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleReject(pendente.id)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {suggs.length > 0 && !aiSugg && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4" /> Sugestões Automáticas:
                  </div>
                  {suggs.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex justify-between p-2 bg-muted/30 rounded">
                      <div className="flex-1">
                        <div><Badge variant="outline">{s.tagsetPai.codigo}</Badge> {s.tagsetPai.nome}</div>
                        <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                      </div>
                      <Button size="sm" onClick={() => handleAccept(pendente.id, s.tagsetPai.codigo)}>
                        <CheckCircle2 className="h-4 w-4" /> Aceitar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {aiSugg && (
                <Alert className="bg-primary/5">
                  <Zap className="h-5 w-5" />
                  <AlertDescription className="space-y-3">
                    <div className="flex justify-between">
                      <strong>Análise Computacional</strong>
                      <Badge>{aiSugg.confianca}%</Badge>
                    </div>
                    <div><strong>Pai:</strong> {aiSugg.paiRecomendado} | <strong>Nível:</strong> {aiSugg.nivelSugerido}</div>
                    <p className="text-sm">{aiSugg.justificativa}</p>

                    {aiSugg.melhorias?.nomeSugerido && (
                      <div className="border-t pt-2">
                        <strong>💡 Nome:</strong> {aiSugg.melhorias.nomeSugerido}
                      </div>
                    )}
                    
                    {aiSugg.alternativas && aiSugg.alternativas.length > 0 && (
                      <div className="space-y-2">
                        <strong><TrendingUp className="inline h-4 w-4" /> Alternativas:</strong>
                        {aiSugg.alternativas.map((alt, i) => (
                          <div key={i} className="flex justify-between p-2 bg-muted/50 rounded">
                            <div><Badge variant="outline">{alt.codigo}</Badge> {alt.nome}</div>
                            <Button size="sm" variant="ghost" onClick={() => handleAccept(pendente.id, alt.codigo)}>
                              <CheckCircle2 className="h-4 w-4" /> Aceitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAccept(pendente.id, aiSugg.paiRecomendado)} className="flex-1">
                        <CheckCircle2 className="h-4 w-4" /> Aceitar Sugestão
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedForCuration({ tagset: pendente, aiSuggestion: aiSugg });
                        setCuratorOpen(true);
                      }} className="flex-1">
                        <Sparkles className="h-4 w-4" /> Editar
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
        })}
      </CardContent>

      {selectedForCuration && (
        <AITagsetCurator
          open={curatorOpen}
          onOpenChange={setCuratorOpen}
          tagsetOriginal={selectedForCuration.tagset}
          aiSuggestion={selectedForCuration.aiSuggestion}
          onApply={handleApplyCurated}
        />
      )}
    </Card>
  );
}
