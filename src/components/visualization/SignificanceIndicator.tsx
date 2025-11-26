import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SignificanceIndicatorProps {
  difference: number;
  significance: 'ns' | '*' | '**' | '***';
  pValue: number;
  metric?: string;
  showIcon?: boolean;
}

export function SignificanceIndicator({
  difference,
  significance,
  pValue,
  metric,
  showIcon = true
}: SignificanceIndicatorProps) {
  const getVariant = () => {
    if (significance === 'ns') return 'outline';
    if (significance === '*') return 'secondary';
    return 'default';
  };

  const getColor = () => {
    if (difference > 0) return 'text-green-500';
    if (difference < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getIcon = () => {
    if (difference > 0) return <TrendingUp className="h-3 w-3" />;
    if (difference < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getSignificanceLabel = () => {
    switch (significance) {
      case 'ns':
        return 'Não significativo';
      case '*':
        return 'Significativo (p < 0.05)';
      case '**':
        return 'Muito significativo (p < 0.01)';
      case '***':
        return 'Altamente significativo (p < 0.001)';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {showIcon && (
              <span className={getColor()}>
                {getIcon()}
              </span>
            )}
            <Badge variant={getVariant()} className="gap-1">
              <span className={getColor()}>
                {difference > 0 ? '+' : ''}{difference.toFixed(2)}%
              </span>
              <span className="text-muted-foreground ml-1">
                {significance}
              </span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{getSignificanceLabel()}</p>
            <p className="text-xs text-muted-foreground">
              p-value: {pValue.toFixed(4)}
            </p>
            {metric && (
              <p className="text-xs text-muted-foreground">
                Métrica: {metric}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
