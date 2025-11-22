import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { CurationSuggestion } from '@/hooks/useTagsetCuration';
import { useTagsets } from '@/hooks/useTagsets';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface TagsetData {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  exemplos: string[] | null;
  nivel_profundidade: number | null;
  categoria_pai: string | null;
}

interface CurationResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tagset: TagsetData | null;
  suggestion: CurationSuggestion | null;
}

export function CurationResultDialog({
  isOpen,
  onClose,
  tagset,
  suggestion,
}: CurationResultDialogProps) {
  const { updateTagset } = useTagsets();
  const [isApplying, setIsApplying] = useState(false);
  
  const [selectedChanges, setSelectedChanges] = useState({
    nome: true,
    descricao: true,
    exemplos: true,
    nivel: true,
    pai: true,
  });

  if (!tagset || !suggestion) return null;

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-500';
    if (confidence > 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence > 0.8) return 'Confiança Alta';
    if (confidence > 0.6) return 'Confiança Média';
    return 'Confiança Baixa';
  };

  const handleApplySelected = async () => {
    setIsApplying(true);
    try {
      const updates: any = {};

      if (selectedChanges.nome && suggestion.nome_sugerido) {
        updates.nome = suggestion.nome_sugerido;
      }

      if (selectedChanges.descricao && suggestion.descricao_sugerida) {
        updates.descricao = suggestion.descricao_sugerida;
      }

      if (selectedChanges.exemplos && suggestion.exemplos_adicionais) {
        const currentExemplos = tagset.exemplos || [];
        updates.exemplos = [...currentExemplos, ...suggestion.exemplos_adicionais];
      }

      if (selectedChanges.nivel && suggestion.nivel_recomendado) {
        updates.nivel_profundidade = suggestion.nivel_recomendado;
      }

      if (selectedChanges.pai && suggestion.pai_recomendado) {
        updates.categoria_pai = suggestion.pai_recomendado.codigo;
      }

      await updateTagset(tagset.id, updates);
      
      toast.success('Curadoria aplicada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao aplicar curadoria:', error);
      toast.error('Erro ao aplicar alterações da curadoria');
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyAll = async () => {
    setSelectedChanges({
      nome: true,
      descricao: true,
      exemplos: true,
      nivel: true,
      pai: true,
    });
    await handleApplySelected();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Resultado da Curadoria com IA
          </DialogTitle>
          <DialogDescription>
            {tagset.codigo} - {tagset.nome}
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de Confiança Geral */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Confiança Geral da Análise</span>
              <Badge variant="outline" className={getConfidenceColor(suggestion.confianca_geral)}>
                {getConfidenceBadge(suggestion.confianca_geral)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress 
              value={suggestion.confianca_geral * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {(suggestion.confianca_geral * 100).toFixed(0)}% de confiança
            </p>
          </CardContent>
        </Card>

        {/* Alertas */}
        {suggestion.alertas && suggestion.alertas.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alertas da IA</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {suggestion.alertas.map((alerta, idx) => (
                  <li key={idx} className="text-sm">{alerta}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Justificativa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Justificativa da IA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{suggestion.justificativa}</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Comparação: Nome */}
          {suggestion.nome_sugerido && suggestion.nome_sugerido !== tagset.nome && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Nome do Domínio</CardTitle>
                  <Checkbox
                    checked={selectedChanges.nome}
                    onCheckedChange={(checked) =>
                      setSelectedChanges(prev => ({ ...prev, nome: checked as boolean }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Atual</p>
                    <Badge variant="outline">{tagset.nome}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      Sugerido
                    </p>
                    <Badge>{suggestion.nome_sugerido}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparação: Descrição */}
          {suggestion.descricao_sugerida && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Descrição</CardTitle>
                  <Checkbox
                    checked={selectedChanges.descricao}
                    onCheckedChange={(checked) =>
                      setSelectedChanges(prev => ({ ...prev, descricao: checked as boolean }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Atual</p>
                    <p className="text-sm">{tagset.descricao || 'Sem descrição'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      Sugerido
                    </p>
                    <p className="text-sm">{suggestion.descricao_sugerida}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Exemplos Adicionais */}
          {suggestion.exemplos_adicionais && suggestion.exemplos_adicionais.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Exemplos Adicionais Sugeridos</CardTitle>
                  <Checkbox
                    checked={selectedChanges.exemplos}
                    onCheckedChange={(checked) =>
                      setSelectedChanges(prev => ({ ...prev, exemplos: checked as boolean }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {suggestion.exemplos_adicionais.map((exemplo, idx) => (
                    <Badge key={idx} variant="secondary">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {exemplo}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nível Recomendado */}
          {suggestion.nivel_recomendado && suggestion.nivel_recomendado !== tagset.nivel_profundidade && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Nível Hierárquico</CardTitle>
                  <Checkbox
                    checked={selectedChanges.nivel}
                    onCheckedChange={(checked) =>
                      setSelectedChanges(prev => ({ ...prev, nivel: checked as boolean }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Atual</p>
                    <Badge variant="outline">Nível {tagset.nivel_profundidade}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      Sugerido
                    </p>
                    <Badge>Nível {suggestion.nivel_recomendado}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pai Recomendado */}
          {suggestion.pai_recomendado && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Categoria Pai</CardTitle>
                  <Checkbox
                    checked={selectedChanges.pai}
                    onCheckedChange={(checked) =>
                      setSelectedChanges(prev => ({ ...prev, pai: checked as boolean }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Atual</p>
                    <Badge variant="outline">{tagset.categoria_pai || 'Nenhum'}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      Sugerido
                    </p>
                    <Badge>
                      {suggestion.pai_recomendado.codigo} - {suggestion.pai_recomendado.nome}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confiança: {(suggestion.pai_recomendado.confianca * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isApplying}
          >
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleApplySelected}
              disabled={isApplying || !Object.values(selectedChanges).some(v => v)}
            >
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aplicar Selecionados
            </Button>
            <Button
              type="button"
              onClick={handleApplyAll}
              disabled={isApplying}
            >
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Aplicar Todas
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
