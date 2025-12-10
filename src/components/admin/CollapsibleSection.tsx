import { ReactNode } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollapsibleState } from '@/hooks/useCollapsibleState';

interface CollapsibleSectionProps {
  /** Identificador único para persistência do estado */
  storageKey: string;
  /** Título da seção */
  title: string;
  /** Descrição opcional */
  description?: string;
  /** Ícone opcional */
  icon?: LucideIcon;
  /** Badge opcional no header */
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  /** Estado inicial (default: false = fechado) */
  defaultOpen?: boolean;
  /** Conteúdo da seção */
  children: ReactNode;
  /** Classes extras para o Card */
  className?: string;
  /** Classes extras para o content */
  contentClassName?: string;
  /** Ações adicionais no header (botões, etc) */
  headerActions?: ReactNode;
}

export function CollapsibleSection({
  storageKey,
  title,
  description,
  icon: Icon,
  badge,
  defaultOpen = false,
  children,
  className,
  contentClassName,
  headerActions
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useCollapsibleState(storageKey, defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={className}>
        <CollapsibleTrigger asChild>
          <CardHeader 
            className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
            role="button"
            aria-expanded={isOpen}
            aria-controls={`section-${storageKey}`}
          >
            <div className="flex items-center gap-3">
              {Icon && (
                <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold leading-none tracking-tight">
                    {title}
                  </h2>
                  {badge && (
                    <Badge variant={badge.variant || 'secondary'}>
                      {badge.label}
                    </Badge>
                  )}
                </div>
                {description && (
                  <p className="text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {headerActions && (
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  className="flex items-center gap-2"
                >
                  {headerActions}
                </div>
              )}
              <ChevronDown 
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )} 
                aria-hidden="true"
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent id={`section-${storageKey}`}>
          <CardContent className={contentClassName}>
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * Versão simplificada sem Card wrapper (para uso dentro de outros containers)
 */
interface CollapsibleDivProps {
  storageKey: string;
  title: string;
  badge?: { label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' };
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleDiv({
  storageKey,
  title,
  badge,
  defaultOpen = false,
  children,
  className
}: CollapsibleDivProps) {
  const [isOpen, setIsOpen] = useCollapsibleState(storageKey, defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <div 
          className="flex items-center justify-between py-2 px-1 cursor-pointer hover:bg-muted/30 rounded-md transition-colors"
          role="button"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{title}</span>
            {badge && (
              <Badge variant={badge.variant || 'secondary'} className="text-xs">
                {badge.label}
              </Badge>
            )}
          </div>
          <ChevronDown 
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
            aria-hidden="true"
          />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
