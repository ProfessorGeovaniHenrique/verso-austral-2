import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Loader2, Sparkles, Check, ChevronDown, ChevronRight, 
  AlertTriangle, CheckCircle, HelpCircle, X 
} from 'lucide-react';
import { MultiSelectInsignias } from '@/components/ui/multi-select-insignias';
import { INSIGNIAS_OPTIONS } from '@/data/types/cultural-insignia.types';
import { GroupedInsigniaEntry, useValidateByWord, useUpdateInsigniasByWord } from '@/hooks/useGroupedInsigniaCuration';
import { useAnalyzeSingleInsignia, InsigniaAnalysisResult } from '@/hooks/useInsigniaAnalysis';

interface GroupedInsigniaRowProps {
  entry: GroupedInsigniaEntry;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
}

export function GroupedInsigniaRow({ entry, isSelected, onSelectionChange }: GroupedInsigniaRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInsignias, setEditedInsignias] = useState<string[]>(entry.insignias_atuais);
  const [analysis, setAnalysis] = useState<InsigniaAnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const validateMutation = useValidateByWord();
  const updateMutation = useUpdateInsigniasByWord();
  const analyzeMutation = useAnalyzeSingleInsignia();

  const isFullyValidated = entry.validados_count === entry.ocorrencias;
  const isPartiallyValidated = entry.validados_count > 0 && entry.validados_count < entry.ocorrencias;

  const getInsigniaLabel = (insignia: string) => {
    const option = INSIGNIAS_OPTIONS.find(o => o.value === insignia);
    return option?.label || insignia;
  };

  const getConsensoIcon = () => {
    switch (entry.consenso) {
      case 'total':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'parcial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'nenhum':
        return <HelpCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getConsensoLabel = () => {
    switch (entry.consenso) {
      case 'total':
        return '100% consenso';
      case 'parcial':
        return 'Consenso parcial';
      case 'nenhum':
        return 'Sem consenso';
    }
  };

  const handleValidateAll = async () => {
    await validateMutation.mutateAsync(entry.palavra);
  };

  const handleSaveEdit = async () => {
    await updateMutation.mutateAsync({ 
      palavra: entry.palavra, 
      insignias: editedInsignias 
    });
    setIsEditing(false);
  };

  const handleAnalyze = async () => {
    const result = await analyzeMutation.mutateAsync({ 
      palavra: entry.palavra 
    });
    setAnalysis(result);
    setShowAnalysis(true);
  };

  const handleApplySuggestion = async () => {
    if (!analysis) return;
    await updateMutation.mutateAsync({ 
      palavra: entry.palavra, 
      insignias: analysis.insignias_sugeridas 
    });
    setShowAnalysis(false);
    setAnalysis(null);
  };

  const isLoading = validateMutation.isPending || updateMutation.isPending || analyzeMutation.isPending;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <tr className={`border-b transition-colors hover:bg-muted/50 ${isFullyValidated ? 'bg-green-50/30 dark:bg-green-950/10' : ''} ${isSelected ? 'bg-primary/5' : ''}`}>
        {/* Checkbox */}
        <td className="p-3 w-10">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={onSelectionChange}
            disabled={isLoading}
          />
        </td>

        {/* Palavra + Ocorrências */}
        <td className="p-3">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <span className="font-medium">{entry.palavra}</span>
            <Badge variant="outline" className="text-xs">
              {entry.ocorrencias}x
            </Badge>
            {isFullyValidated && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                ✓ Validado
              </Badge>
            )}
            {isPartiallyValidated && (
              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                {entry.validados_count}/{entry.ocorrencias}
              </Badge>
            )}
          </div>
        </td>

        {/* Insígnias */}
        <td className="p-3">
          <div className="flex flex-wrap gap-1">
            {entry.insignias_atuais.length > 0 ? (
              entry.insignias_atuais.map(insignia => (
                <Badge key={insignia} variant="secondary" className="text-xs">
                  {getInsigniaLabel(insignia)}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Nenhuma</span>
            )}
          </div>

          {/* Analysis Result */}
          {showAnalysis && analysis && (
            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 mb-1">
                    <Sparkles className="h-3 w-3" />
                    Sugestão ({(analysis.confianca * 100).toFixed(0)}%):
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {analysis.insignias_sugeridas.length > 0 ? (
                      analysis.insignias_sugeridas.map(i => (
                        <Badge key={i} className="text-xs bg-amber-100 text-amber-700">
                          {getInsigniaLabel(i)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem insígnias</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{analysis.justificativa}</p>
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 text-green-600"
                    onClick={handleApplySuggestion}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => setShowAnalysis(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </td>

        {/* Consenso */}
        <td className="p-3">
          <div className="flex items-center gap-1.5">
            {getConsensoIcon()}
            <span className="text-xs text-muted-foreground">{getConsensoLabel()}</span>
          </div>
        </td>

        {/* Confiança Média */}
        <td className="p-3 text-sm">
          {entry.confianca_media > 0 ? `${(entry.confianca_media * 100).toFixed(0)}%` : '-'}
        </td>

        {/* Ações */}
        <td className="p-3">
          <div className="flex items-center gap-1">
            {/* Analisar com IA */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAnalyze}
              disabled={isLoading || showAnalysis}
              className="h-8 px-2 text-xs"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </>
              )}
            </Button>

            {/* Validar Todos */}
            {!isFullyValidated && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleValidateAll}
                disabled={isLoading}
                className="h-8 px-2 text-xs text-green-600 hover:text-green-700"
              >
                {validateMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Validar {entry.ocorrencias > 1 ? `(${entry.ocorrencias})` : ''}
                  </>
                )}
              </Button>
            )}

            {/* Editar */}
            <Popover open={isEditing} onOpenChange={setIsEditing}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isLoading}
                  className="h-8 px-2 text-xs"
                >
                  Editar
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Editar insígnias para todas as {entry.ocorrencias} ocorrências de "{entry.palavra}"
                  </p>
                  <MultiSelectInsignias 
                    value={editedInsignias} 
                    onChange={setEditedInsignias} 
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        `Salvar (${entry.ocorrencias})`
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </td>
      </tr>

      {/* Expanded Details - Individual Entries */}
      <CollapsibleContent asChild>
        <tr>
          <td colSpan={6} className="p-0">
            <div className="bg-muted/30 p-4 border-b">
              <p className="text-xs text-muted-foreground mb-2">
                {entry.ocorrencias} ocorrências • {entry.validados_count} validadas • {entry.pendentes_count} pendentes
              </p>
              <div className="flex flex-wrap gap-2">
                {entry.ids.slice(0, 10).map((id, i) => (
                  <Badge key={id} variant="outline" className="text-xs">
                    ID: {id.slice(0, 8)}...
                  </Badge>
                ))}
                {entry.ids.length > 10 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{entry.ids.length - 10} mais
                  </Badge>
                )}
              </div>
            </div>
          </td>
        </tr>
      </CollapsibleContent>
    </Collapsible>
  );
}
