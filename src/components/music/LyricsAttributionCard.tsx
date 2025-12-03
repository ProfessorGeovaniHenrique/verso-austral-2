/**
 * LyricsAttributionCard - Exibe letra com atribuição de fonte
 * Todas as letras devem ter fonte verificável com URL
 */

import { ExternalLink, FileText, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

interface LyricsAttributionCardProps {
  lyrics: string | null;
  lyricsSource: string | null;
  lyricsUrl: string | null;
  maxHeight?: number;
}

// Format source name for display
function formatSourceName(source: string | null): string {
  if (!source) return 'Arquivo Original';
  
  const names: Record<string, string> = {
    'letras.mus.br': 'Letras.mus.br',
    'genius': 'Genius',
    'web_search': 'Pesquisa Web',
    'manual': 'Inserção Manual',
    'original': 'Arquivo Original'
  };
  
  return names[source] || source;
}

// Get source color for badge
function getSourceColor(source: string | null): string {
  const colors: Record<string, string> = {
    'letras.mus.br': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'genius': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'web_search': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'manual': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'original': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  };
  
  return colors[source || 'original'] || colors['original'];
}

export function LyricsAttributionCard({
  lyrics,
  lyricsSource,
  lyricsUrl,
  maxHeight = 300
}: LyricsAttributionCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!lyrics) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between p-2 h-auto"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ver Letra</span>
            {lyricsSource && (
              <Badge variant="secondary" className={`text-xs ${getSourceColor(lyricsSource)}`}>
                {formatSourceName(lyricsSource)}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <div className="rounded-lg border bg-muted/30 overflow-hidden">
          {/* Lyrics Content */}
          <ScrollArea className="p-4" style={{ maxHeight }}>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
              {lyrics}
            </pre>
          </ScrollArea>
          
          {/* Attribution Footer */}
          <div className="border-t bg-background/50 p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground">Fonte:</span>
                
                {lyricsUrl ? (
                  <a 
                    href={lyricsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {formatSourceName(lyricsSource)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {formatSourceName(lyricsSource)}
                  </Badge>
                )}
              </div>
              
              {/* External Link Button */}
              {lyricsUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  asChild
                >
                  <a 
                    href={lyricsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Ver no site original
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
            
            {/* Legal Notice */}
            <p className="text-[10px] text-muted-foreground mt-2 flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>
                Letra exibida para fins educacionais e de pesquisa. 
                Todos os direitos pertencem aos autores e editoras originais.
              </span>
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}