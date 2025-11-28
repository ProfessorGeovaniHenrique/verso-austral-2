import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useChildDomains } from '@/hooks/useChildDomains';
import { Loader2, ChevronRight } from 'lucide-react';

interface DomainCardWithChildrenProps {
  codigo: string;
  nome: string;
  cor: string;
  availableDomains: string[];
  children: React.ReactNode;
}

export function DomainCardWithChildren({ 
  codigo, 
  nome, 
  cor,
  availableDomains,
  children 
}: DomainCardWithChildrenProps) {
  const { childDomains, isLoading } = useChildDomains(codigo, availableDomains);

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      
      {childDomains.length > 0 && (
        <TooltipContent 
          side="right" 
          align="start"
          className="max-w-md p-4 z-[10000]"
          sideOffset={8}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: cor }}
              />
              <h4 className="font-semibold text-sm">{nome}</h4>
            </div>
            
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Carregando subcategorias...
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  Subcategorias (N2) encontradas no corpus:
                </p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {childDomains.map(child => (
                    <div 
                      key={child.codigo}
                      className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <Badge variant="outline" className="text-[10px] shrink-0 px-1.5 py-0">
                        {child.codigo}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-tight">{child.nome}</p>
                        {child.descricao && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                            {child.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
