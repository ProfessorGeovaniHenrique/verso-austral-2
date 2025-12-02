import { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, Check, Edit, AlertTriangle, Link2, Pencil, Award, Sparkles, Loader2, Layers } from 'lucide-react';
import { SemanticLexiconEntry } from '@/hooks/useSemanticLexiconData';
import { KWICInlineDisplay } from './KWICInlineDisplay';
import { useReclassifyMG } from '@/hooks/useReclassifyMG';
import { cn } from '@/lib/utils';

interface Props {
  entry: SemanticLexiconEntry;
  onValidate: (entry: SemanticLexiconEntry) => void;
  onRefresh?: () => void;
}

const getConfidenceColor = (confidence: number | null): string => {
  if (confidence === null) return 'bg-muted';
  if (confidence >= 0.90) return 'bg-green-500/10';
  if (confidence >= 0.70) return 'bg-yellow-500/10';
  return 'bg-red-500/10';
};

const getSourceBadge = (fonte: string | null) => {
  switch (fonte) {
    case 'gemini_flash':
    case 'gemini_flash_mg_refinement':
      return <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">Gemini</Badge>;
    case 'gpt5':
    case 'gpt5_mg_refinement':
      return <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600">GPT-5</Badge>;
    case 'rule_based':
      return <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">Regras</Badge>;
    case 'manual':
    case 'human_validated':
      return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">Manual</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{fonte || '?'}</Badge>;
  }
};

// Check if this is an MG word classified only at N1 level
const isMGN1Only = (entry: SemanticLexiconEntry): boolean => {
  return entry.tagset_codigo === 'MG' && 
    (entry.fonte === 'rule_based' || !entry.tagset_n2);
};

// Check if ANY domain is classified only at N1 level (no dots in code)
const isDSN1Only = (entry: SemanticLexiconEntry): boolean => {
  return entry.tagset_codigo && 
    !entry.tagset_codigo.includes('.') && 
    entry.tagset_codigo !== 'NC';
};

export function SemanticWordRow({ entry, onValidate, onRefresh }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { reclassifySingle, isProcessing } = useReclassifyMG();

  const confidence = entry.confianca !== null ? Math.round(entry.confianca * 100) : null;
  const needsReview = confidence !== null && confidence < 80 && 
    entry.fonte !== 'manual' && entry.fonte !== 'human_validated';
  const showMGRefine = isMGN1Only(entry);
  const showDSRefine = isDSN1Only(entry) && !showMGRefine; // Only show if not already showing MG refine

  const handleRefine = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await reclassifySingle(entry, { 
      model: 'gemini',
      onSuccess: onRefresh 
    });
  };

  return (
    <>
      <TableRow 
        className={cn(
          'cursor-pointer transition-colors hover:bg-muted/50',
          getConfidenceColor(entry.confianca),
          needsReview && 'border-l-2 border-l-amber-500',
          showMGRefine && 'border-l-2 border-l-blue-500',
          showDSRefine && 'border-l-2 border-l-purple-500'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand toggle */}
        <TableCell className="w-8 p-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>

        {/* Palavra */}
        <TableCell className="font-mono font-medium">
          {entry.palavra}
          {entry.lema && entry.lema !== entry.palavra && (
            <span className="text-xs text-muted-foreground ml-1">({entry.lema})</span>
          )}
        </TableCell>

        {/* Tagset */}
        <TableCell>
          <Badge variant="secondary" className="font-mono text-xs">
            {entry.tagset_codigo}
          </Badge>
          {showMGRefine && (
            <Badge variant="outline" className="ml-1 text-xs bg-blue-500/10 text-blue-600">
              MG N1
            </Badge>
          )}
          {showDSRefine && (
            <Badge variant="outline" className="ml-1 text-xs bg-purple-500/10 text-purple-600">
              DS N1
            </Badge>
          )}
        </TableCell>

        {/* Domain N1 */}
        <TableCell className="text-sm">
          {entry.tagset_n1 || entry.tagset_codigo?.split('.')[0] || '-'}
        </TableCell>

        {/* POS */}
        <TableCell className="text-xs text-muted-foreground">
          {entry.pos || '-'}
        </TableCell>

        {/* Confidence */}
        <TableCell>
          {confidence !== null ? (
            <span className={cn(
              'text-sm font-medium',
              confidence >= 90 ? 'text-green-600' :
              confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {confidence}%
            </span>
          ) : '-'}
        </TableCell>

        {/* Source */}
        <TableCell>
          {getSourceBadge(entry.fonte)}
        </TableCell>

        {/* Flags */}
        <TableCell>
          <div className="flex gap-1">
            {entry.is_polysemous && (
              <span title="Polissêmica">
                <AlertTriangle className="h-3 w-3 text-purple-500" />
              </span>
            )}
            {entry.is_mwe && (
              <span title="MWE">
                <Link2 className="h-3 w-3 text-blue-500" />
              </span>
            )}
            {entry.is_spelling_deviation && (
              <span title="Desvio ortográfico">
                <Pencil className="h-3 w-3 text-amber-500" />
              </span>
            )}
            {entry.insignias_culturais && entry.insignias_culturais.length > 0 && (
              <span title="Com insígnias">
                <Award className="h-3 w-3 text-green-500" />
              </span>
            )}
          </div>
        </TableCell>

        {/* Actions */}
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            {showMGRefine && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600"
                onClick={handleRefine}
                disabled={isProcessing}
                title="Refinar MG para nível mais específico"
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Refinar MG
                  </>
                )}
              </Button>
            )}
            {showDSRefine && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-600"
                onClick={handleRefine}
                disabled={isProcessing}
                title="Refinar DS para nível mais específico"
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Layers className="h-3 w-3 mr-1" />
                    Refinar DS
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onValidate(entry)}
            >
              {needsReview ? (
                <>
                  <Edit className="h-3 w-3 mr-1" />
                  Revisar
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Validar
                </>
              )}
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded content */}
      {isExpanded && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={9} className="p-4">
            <div className="space-y-3">
              {/* KWIC Display */}
              <KWICInlineDisplay 
                palavra={entry.palavra} 
                songId={entry.song_id}
              />

              {/* MG N1 Warning */}
              {showMGRefine && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 text-blue-700 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    Esta palavra está classificada apenas no nível 1 (MG). 
                    Clique em "Refinar MG" para classificação mais específica com Gemini.
                  </span>
                </div>
              )}

              {/* DS N1 Warning */}
              {showDSRefine && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 text-purple-700 text-sm">
                  <Layers className="h-4 w-4" />
                  <span>
                    Esta palavra está classificada apenas no nível 1 ({entry.tagset_codigo}). 
                    Clique em "Refinar DS" para classificação mais específica com IA.
                  </span>
                </div>
              )}

              {/* Additional info */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
                {entry.is_spelling_deviation && entry.forma_padrao && (
                  <div>
                    <span className="font-medium">Forma padrão:</span> {entry.forma_padrao}
                  </div>
                )}
                {entry.is_mwe && entry.mwe_text && (
                  <div>
                    <span className="font-medium">Expressão:</span> {entry.mwe_text}
                  </div>
                )}
                {entry.insignias_culturais && entry.insignias_culturais.length > 0 && (
                  <div>
                    <span className="font-medium">Insígnias:</span> {entry.insignias_culturais.join(', ')}
                  </div>
                )}
                {entry.cached_at && (
                  <div>
                    <span className="font-medium">Anotado em:</span> {new Date(entry.cached_at).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
