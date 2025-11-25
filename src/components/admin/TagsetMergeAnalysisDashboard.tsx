/**
 * Dashboard de Análise de Mesclagem de Tagsets
 * Detecta sobreposições e sugere ações via IA
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Loader2, GitMerge, Sparkles, AlertCircle } from "lucide-react";
import { detectOverlappingTagsets, OverlapPair } from "@/lib/tagsetOverlapDetection";
import { MergeSuggestionDialog } from "./MergeSuggestionDialog";
import { useTagsetMerge } from "@/hooks/useTagsetMerge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tagset } from "@/hooks/useTagsets";

interface Props {
  tagsets: Tagset[];
  onMergeApplied: () => void;
}

interface MergeSuggestion {
  recommendation: 'merge' | 'keep_separate' | 'reorganize' | 'split';
  confidence: number;
  justification: string;
  mergeStrategy?: any;
  splitStrategy?: any;
  reorganizeStrategy?: any;
  warnings: string[];
}

export const TagsetMergeAnalysisDashboard = ({ tagsets, onMergeApplied }: Props) => {
  const [threshold, setThreshold] = useState(0.3);
  const [overlaps, setOverlaps] = useState<OverlapPair[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPair, setSelectedPair] = useState<OverlapPair | null>(null);
  const [suggestion, setSuggestion] = useState<MergeSuggestion | null>(null);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { mergeTagsets, splitTagset, isMerging, isSplitting } = useTagsetMerge();

  // Filtrar apenas tagsets ativos
  const activeTagsets = useMemo(
    () => tagsets.filter(t => t.status === 'ativo'),
    [tagsets]
  );

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    const detected = detectOverlappingTagsets(activeTagsets, threshold);
    setOverlaps(detected);
    setIsAnalyzing(false);
    toast.success(`Encontrados ${detected.length} pares com sobreposição`);
  };

  const handleRequestSuggestion = async (pair: OverlapPair) => {
    setSelectedPair(pair);
    setIsFetchingSuggestion(true);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-tagset-merge', {
        body: {
          tagsetA: pair.tagsetA,
          tagsetB: pair.tagsetB,
          similarity: pair.similarity,
          allTagsets: activeTagsets
        }
      });

      if (error) throw error;

      setSuggestion(data as MergeSuggestion);
      setDialogOpen(true);
    } catch (error) {
      console.error('Erro ao buscar sugestão:', error);
      toast.error('Erro ao buscar sugestão da IA');
    } finally {
      setIsFetchingSuggestion(false);
    }
  };

  const handleApplyMerge = async (
    survivorId: string,
    absorbedId: string,
    mergedData: Partial<Tagset>
  ) => {
    try {
      await mergeTagsets({ survivorId, absorbedId, mergedData });
      setDialogOpen(false);
      setSelectedPair(null);
      setSuggestion(null);
      onMergeApplied();
      // Re-analisar após aplicar
      handleAnalyze();
    } catch (error) {
      console.error('Erro ao aplicar mesclagem:', error);
    }
  };

  const handleApplySplit = async (
    originalId: string,
    newTagsets: any[],
    rejectionReason: string
  ) => {
    try {
      await splitTagset({ originalId, newTagsets, rejectionReason });
      setDialogOpen(false);
      setSelectedPair(null);
      setSuggestion(null);
      onMergeApplied();
      // Re-analisar após aplicar
      handleAnalyze();
    } catch (error) {
      console.error('Erro ao aplicar divisão:', error);
    }
  };

  // Agrupar por tipo de sobreposição
  const groupedOverlaps = useMemo(() => {
    return {
      high: overlaps.filter(o => o.overlapType === 'high'),
      medium: overlaps.filter(o => o.overlapType === 'medium'),
      low: overlaps.filter(o => o.overlapType === 'low'),
    };
  }, [overlaps]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Análise de Sobreposições de Domínios Semânticos
          </CardTitle>
          <CardDescription>
            Detecte tagsets redundantes ou sobrepostos e receba sugestões da IA para consolidação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controles */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || activeTagsets.length < 2}
            >
              {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analisar Sobreposições
            </Button>
            
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm text-muted-foreground">Threshold:</span>
              <Slider
                value={[threshold * 100]}
                onValueChange={(v) => setThreshold(v[0] / 100)}
                min={10}
                max={90}
                step={5}
                className="flex-1 max-w-xs"
              />
              <Badge variant="outline">{(threshold * 100).toFixed(0)}%</Badge>
            </div>
          </div>

          {/* Resultados */}
          {overlaps.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  📊 Encontrados: {overlaps.length} pares com sobreposição
                </h3>

                {/* Alta sobreposição */}
                {groupedOverlaps.high.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                      🔴 Alta (&gt;70%) - {groupedOverlaps.high.length} pares
                    </h4>
                    {groupedOverlaps.high.map((pair, idx) => (
                      <OverlapCard
                        key={idx}
                        pair={pair}
                        onRequestSuggestion={handleRequestSuggestion}
                        isLoading={isFetchingSuggestion && selectedPair === pair}
                      />
                    ))}
                  </div>
                )}

                {/* Média sobreposição */}
                {groupedOverlaps.medium.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <h4 className="text-sm font-semibold text-yellow-600 flex items-center gap-2">
                      🟡 Média (40-70%) - {groupedOverlaps.medium.length} pares
                    </h4>
                    {groupedOverlaps.medium.map((pair, idx) => (
                      <OverlapCard
                        key={idx}
                        pair={pair}
                        onRequestSuggestion={handleRequestSuggestion}
                        isLoading={isFetchingSuggestion && selectedPair === pair}
                      />
                    ))}
                  </div>
                )}

                {/* Baixa sobreposição */}
                {groupedOverlaps.low.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-green-600 flex items-center gap-2">
                      🟢 Baixa (30-40%) - {groupedOverlaps.low.length} pares
                    </h4>
                    {groupedOverlaps.low.map((pair, idx) => (
                      <OverlapCard
                        key={idx}
                        pair={pair}
                        onRequestSuggestion={handleRequestSuggestion}
                        isLoading={isFetchingSuggestion && selectedPair === pair}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {overlaps.length === 0 && !isAnalyzing && (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Clique em "Analisar Sobreposições" para detectar tagsets redundantes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Sugestão */}
      <MergeSuggestionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tagsetA={selectedPair?.tagsetA!}
        tagsetB={selectedPair?.tagsetB!}
        suggestion={suggestion}
        onApplyMerge={handleApplyMerge}
        onApplySplit={handleApplySplit}
        isProcessing={isMerging || isSplitting}
      />
    </>
  );
};

interface OverlapCardProps {
  pair: OverlapPair;
  onRequestSuggestion: (pair: OverlapPair) => void;
  isLoading: boolean;
}

const OverlapCard = ({ pair, onRequestSuggestion, isLoading }: OverlapCardProps) => {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{pair.tagsetA.codigo}</Badge>
            <span className="font-semibold">{pair.tagsetA.nome}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {pair.tagsetA.descricao?.substring(0, 100)}...
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center px-4">
          <GitMerge className="h-6 w-6 text-muted-foreground mb-1" />
          <Badge className="bg-primary text-primary-foreground">
            {(pair.similarity * 100).toFixed(0)}%
          </Badge>
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{pair.tagsetB.codigo}</Badge>
            <span className="font-semibold">{pair.tagsetB.nome}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {pair.tagsetB.descricao?.substring(0, 100)}...
          </div>
        </div>
      </div>

      {/* Detalhes de sobreposição */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div>
          <strong>Exemplos comuns:</strong>{' '}
          {pair.commonExamples.length > 0 
            ? pair.commonExamples.slice(0, 3).join(', ') 
            : 'Nenhum'}
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div>
          <strong>Palavras comuns:</strong> {pair.commonWords.length}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => onRequestSuggestion(pair)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Sugerir Mesclagem (IA)
        </Button>
      </div>
    </div>
  );
};
