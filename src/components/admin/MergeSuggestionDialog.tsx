/**
 * Dialog para exibir sugestão de mesclagem/split da IA
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, GitMerge, GitBranch, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { Tagset } from "@/hooks/useTagsets";
import { toast } from "sonner";

interface MergeStrategy {
  survivorTagset: 'A' | 'B' | 'new';
  mergedName: string;
  mergedCodigo: string;
  mergedDescricao: string;
  mergedExemplos: string[];
  mergedNivel: number;
  mergedPai: string | null;
}

interface SplitStrategy {
  targetTagset: 'A' | 'B';
  splitIntoTagsets: Array<{
    name: string;
    codigo: string;
    description: string;
    examples: string[];
    nivel: number;
    pai: string | null;
  }>;
  reasoning: string;
}

interface ReorganizeStrategy {
  tagsetA_newParent: string | null;
  tagsetB_newParent: string | null;
  reasoning: string;
}

interface MergeSuggestion {
  recommendation: 'merge' | 'keep_separate' | 'reorganize' | 'split';
  confidence: number;
  justification: string;
  mergeStrategy?: MergeStrategy;
  splitStrategy?: SplitStrategy;
  reorganizeStrategy?: ReorganizeStrategy;
  warnings: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagsetA: Tagset;
  tagsetB: Tagset;
  suggestion: MergeSuggestion | null;
  onApplyMerge: (survivorId: string, absorbedId: string, mergedData: Partial<Tagset>) => void;
  onApplySplit: (originalId: string, newTagsets: any[], rejectionReason: string) => void;
  isProcessing: boolean;
}

export const MergeSuggestionDialog = ({
  open,
  onOpenChange,
  tagsetA,
  tagsetB,
  suggestion,
  onApplyMerge,
  onApplySplit,
  isProcessing,
}: Props) => {
  if (!suggestion) return null;

  const getRecommendationIcon = () => {
    switch (suggestion.recommendation) {
      case 'merge': return <GitMerge className="h-5 w-5" />;
      case 'split': return <GitBranch className="h-5 w-5" />;
      case 'reorganize': return <ArrowRight className="h-5 w-5" />;
      case 'keep_separate': return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getRecommendationLabel = () => {
    switch (suggestion.recommendation) {
      case 'merge': return 'MESCLAR';
      case 'split': return 'DIVIDIR';
      case 'reorganize': return 'REORGANIZAR';
      case 'keep_separate': return 'MANTER SEPARADOS';
    }
  };

  const getRecommendationColor = () => {
    switch (suggestion.recommendation) {
      case 'merge': return 'bg-blue-500';
      case 'split': return 'bg-purple-500';
      case 'reorganize': return 'bg-orange-500';
      case 'keep_separate': return 'bg-green-500';
    }
  };

  const handleApply = () => {
    if (suggestion.recommendation === 'merge' && suggestion.mergeStrategy) {
      const strategy = suggestion.mergeStrategy;
      
      // Determinar IDs
      const survivorId = strategy.survivorTagset === 'A' ? tagsetA.id : tagsetB.id;
      const absorbedId = strategy.survivorTagset === 'A' ? tagsetB.id : tagsetA.id;
      
      // Se criar novo, usar ID do survivor mas com dados completamente novos
      const mergedData: Partial<Tagset> = {
        codigo: strategy.mergedCodigo,
        nome: strategy.mergedName,
        descricao: strategy.mergedDescricao,
        exemplos: strategy.mergedExemplos,
        nivel_profundidade: strategy.mergedNivel,
        categoria_pai: strategy.mergedPai,
        tagset_pai: strategy.mergedPai,
      };
      
      onApplyMerge(survivorId, absorbedId, mergedData);
    } else if (suggestion.recommendation === 'split' && suggestion.splitStrategy) {
      const strategy = suggestion.splitStrategy;
      const originalId = strategy.targetTagset === 'A' ? tagsetA.id : tagsetB.id;
      
      onApplySplit(
        originalId, 
        strategy.splitIntoTagsets,
        `Dividido em ${strategy.splitIntoTagsets.length} domínios: ${strategy.reasoning}`
      );
    } else {
      toast.error('Ação não implementada ainda para esta recomendação');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestão de Mesclagem por IA
          </DialogTitle>
          <DialogDescription>
            Análise baseada em similaridade semântica e contexto hierárquico
          </DialogDescription>
        </DialogHeader>

        {/* Recomendação */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className={`${getRecommendationColor()} text-white flex items-center gap-2 px-4 py-2`}>
              {getRecommendationIcon()}
              {getRecommendationLabel()}
            </Badge>
            <Badge variant="outline">
              Confiança: {suggestion.confidence}%
            </Badge>
          </div>

          {/* Justificativa */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              💡 Justificativa
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {suggestion.justification}
            </p>
          </div>

          {/* Merge Strategy */}
          {suggestion.recommendation === 'merge' && suggestion.mergeStrategy && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <GitMerge className="h-4 w-4" />
                Tagset Resultante
              </h4>
              <div className="space-y-2 text-sm">
                <div><strong>Código:</strong> {suggestion.mergeStrategy.mergedCodigo}</div>
                <div><strong>Nome:</strong> {suggestion.mergeStrategy.mergedName}</div>
                <div><strong>Nível:</strong> {suggestion.mergeStrategy.mergedNivel}</div>
                <div><strong>Pai:</strong> {suggestion.mergeStrategy.mergedPai || 'Nenhum (raiz)'}</div>
                <Separator />
                <div><strong>Descrição:</strong></div>
                <p className="text-muted-foreground">{suggestion.mergeStrategy.mergedDescricao}</p>
                <div><strong>Exemplos:</strong> {suggestion.mergeStrategy.mergedExemplos.join(', ')}</div>
              </div>
            </div>
          )}

          {/* Split Strategy */}
          {suggestion.recommendation === 'split' && suggestion.splitStrategy && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Divisão Proposta
              </h4>
              <p className="text-sm text-muted-foreground">{suggestion.splitStrategy.reasoning}</p>
              <Separator />
              <div className="space-y-3">
                {suggestion.splitStrategy.splitIntoTagsets.map((newTagset, idx) => (
                  <div key={idx} className="border border-border rounded p-3 space-y-1 text-sm">
                    <div><strong>{newTagset.codigo}:</strong> {newTagset.name}</div>
                    <div className="text-muted-foreground">{newTagset.description}</div>
                    <div className="text-xs">Exemplos: {newTagset.examples.join(', ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reorganize Strategy */}
          {suggestion.recommendation === 'reorganize' && suggestion.reorganizeStrategy && (
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Reorganização Hierárquica
              </h4>
              <p className="text-sm text-muted-foreground">{suggestion.reorganizeStrategy.reasoning}</p>
              <Separator />
              <div className="space-y-2 text-sm">
                <div>
                  <strong>{tagsetA.nome}:</strong> Novo pai = {suggestion.reorganizeStrategy.tagsetA_newParent || 'Raiz'}
                </div>
                <div>
                  <strong>{tagsetB.nome}:</strong> Novo pai = {suggestion.reorganizeStrategy.tagsetB_newParent || 'Raiz'}
                </div>
              </div>
            </div>
          )}

          {/* Avisos */}
          {suggestion.warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                Avisos
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {suggestion.warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {suggestion.recommendation !== 'keep_separate' && (
            <Button 
              onClick={handleApply}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processando...' : '✓ Aplicar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
