/**
 * 📊 CACHE STATUS INDICATOR
 * 
 * Mostra status do cache das ferramentas de análise
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Database, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useAnalysisTools, ToolKey } from '@/contexts/AnalysisToolsContext';

const TOOL_LABELS: Record<ToolKey, string> = {
  // Ferramentas Estilísticas
  lexical: 'Léxico',
  syntactic: 'Sintaxe',
  rhetorical: 'Retórica',
  cohesion: 'Coesão',
  speech: 'Fala',
  mind: 'Mind',
  foregrounding: 'Desvio',
  // Ferramentas Básicas
  wordlist: 'Wordlist',
  keywords: 'Keywords',
  kwic: 'KWIC',
  dispersion: 'Dispersão',
  ngrams: 'N-grams'
};

export function CacheStatusIndicator() {
  const { toolsCache, clearAllToolsCache, currentCorpusHash } = useAnalysisTools();
  
  const cachedTools = (Object.keys(toolsCache) as ToolKey[]).filter(key => {
    const cache = toolsCache[key];
    return cache && !cache.isStale && cache.corpusHash === currentCorpusHash;
  });
  
  const staleTools = (Object.keys(toolsCache) as ToolKey[]).filter(key => {
    const cache = toolsCache[key];
    return cache && (cache.isStale || cache.corpusHash !== currentCorpusHash);
  });
  
  const totalCached = cachedTools.length;
  const totalStale = staleTools.length;
  
  if (totalCached === 0 && totalStale === 0) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <Database className="h-4 w-4 text-muted-foreground" />
              {totalCached > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" />
                  {totalCached} em cache
                </Badge>
              )}
              {totalStale > 0 && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  {totalStale} desatualizado{totalStale > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">Cache de Resultados</p>
              {totalCached > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ferramentas com cache válido: {cachedTools.map(k => TOOL_LABELS[k]).join(', ')}
                </p>
              )}
              {totalStale > 0 && (
                <p className="text-xs text-amber-600">
                  Ferramentas desatualizadas: {staleTools.map(k => TOOL_LABELS[k]).join(', ')}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                O cache é invalidado automaticamente ao mudar o corpus.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {(totalCached > 0 || totalStale > 0) && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2"
          onClick={clearAllToolsCache}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
