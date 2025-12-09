/**
 * SongCard Badges Component
 * Sprint CAT-AUDIT-P2 - Refatoração SongCard
 */

import { Badge } from '@/components/ui/badge';
import { Folder } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status?: string | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return null;
  
  const statusConfig = {
    pending: { 
      label: 'Pendente', 
      variant: 'warning' as const,
      icon: AlertCircle,
      tooltip: 'Aguardando enriquecimento de metadados'
    },
    enriched: { 
      label: 'Enriquecida', 
      variant: 'success' as const,
      icon: CheckCircle2,
      tooltip: 'Metadados enriquecidos com sucesso'
    },
    processed: { 
      label: 'Processada', 
      variant: 'info' as const,
      icon: CheckCircle2,
      tooltip: 'Música processada do arquivo original'
    },
    error: {
      label: 'Erro',
      variant: 'destructive' as const,
      icon: AlertCircle,
      tooltip: 'Falha no enriquecimento - clique para tentar novamente'
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className="flex items-center gap-1 cursor-help">
            <Icon className="w-3 h-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ConfidenceBadgeProps {
  confidence?: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence === undefined || confidence === 0) return null;
  
  const getVariantAndTooltip = (score: number) => {
    if (score >= 0.8) return { variant: 'success' as const, tooltip: 'Alta confiança - Dados verificados' };
    if (score >= 0.5) return { variant: 'warning' as const, tooltip: 'Confiança média - Revisar dados' };
    return { variant: 'destructive' as const, tooltip: 'Baixa confiança - Verificação necessária' };
  };

  const { variant, tooltip } = getVariantAndTooltip(confidence);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="cursor-help">
            ✓ {(confidence * 100).toFixed(0)}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CorpusBadgeProps {
  corpusName?: string | null;
  corpusColor?: string | null;
}

export function CorpusBadge({ corpusName, corpusColor }: CorpusBadgeProps) {
  if (!corpusName) return null;

  return (
    <Badge 
      variant="outline" 
      className="border-2 text-xs"
      style={{ borderColor: corpusColor || 'hsl(var(--primary))' }}
    >
      <Folder className="w-3 h-3 mr-1" />
      {corpusName}
    </Badge>
  );
}

interface GenreBadgeProps {
  genre?: string | null;
}

export function GenreBadge({ genre }: GenreBadgeProps) {
  if (!genre) return null;

  return (
    <Badge variant="secondary" className="text-xs">
      {genre}
    </Badge>
  );
}
