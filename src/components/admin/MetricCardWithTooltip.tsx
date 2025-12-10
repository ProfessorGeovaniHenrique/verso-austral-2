import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardWithTooltipProps {
  title: string;
  value: string | number;
  subtitle?: string;
  tooltip: string;
  icon?: LucideIcon;
  iconClassName?: string;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  valueClassName?: string;
  children?: ReactNode;
}

export function MetricCardWithTooltip({
  title,
  value,
  subtitle,
  tooltip,
  icon: Icon,
  iconClassName,
  badge,
  valueClassName,
  children
}: MetricCardWithTooltipProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-medium tracking-tight">{title}</h2>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={`Informação sobre ${title}`}
                >
                  <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="max-w-[280px] text-sm"
                sideOffset={5}
              >
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {Icon && (
          <Icon 
            className={cn("h-4 w-4 text-muted-foreground", iconClassName)} 
            aria-hidden="true" 
          />
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueClassName)}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
        {badge && (
          <Badge 
            variant={badge.variant || 'secondary'}
            className="mt-2"
          >
            {badge.label}
          </Badge>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

// Componente para tooltip inline em textos
interface InlineTooltipProps {
  text: string;
  tooltip: string;
  className?: string;
}

export function InlineTooltip({ text, tooltip, className }: InlineTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={cn(
              "inline-flex items-center gap-1 cursor-help underline decoration-dotted underline-offset-2",
              className
            )}
          >
            {text}
            <HelpCircle className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-[280px] text-sm"
          sideOffset={5}
        >
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
