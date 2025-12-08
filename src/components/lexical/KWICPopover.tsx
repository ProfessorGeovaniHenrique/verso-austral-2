/**
 * 📚 KWIC POPOVER
 * Sprint LF-8: Popover de concordâncias inline para clicks em palavras
 * 
 * Exibe KWIC (Keyword In Context) diretamente no componente,
 * sem necessidade de navegar para outra página.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Search, X } from "lucide-react";
import { generateKWIC, exportKWICToCSV } from "@/services/kwicService";
import { CorpusCompleto, KWICContext } from "@/data/types/full-text-corpus.types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface KWICPopoverProps {
  word: string;
  corpus: CorpusCompleto | null;
  children: React.ReactNode;
  onOpenKWICTool?: (word: string) => void;
}

export function KWICPopover({ 
  word, 
  corpus, 
  children, 
  onOpenKWICTool 
}: KWICPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<KWICContext[]>([]);
  
  // Gerar KWIC quando popover abre
  useEffect(() => {
    if (isOpen && corpus && word) {
      setIsLoading(true);
      
      // Pequeno timeout para não travar a UI
      const timer = setTimeout(() => {
        try {
          const contexts = generateKWIC(corpus, word, 5, 5);
          setResults(contexts);
        } catch (error) {
          console.error('Erro ao gerar KWIC:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, corpus, word]);
  
  const handleExport = () => {
    if (results.length === 0) return;
    
    const csv = exportKWICToCSV(results);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kwic_${word}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('KWIC exportado');
  };
  
  const handleOpenFullTool = () => {
    if (onOpenKWICTool) {
      onOpenKWICTool(word);
    }
    setIsOpen(false);
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[500px] max-w-[90vw] p-0 bg-popover border-border shadow-lg z-50"
        align="start"
        sideOffset={5}
      >
        <div className="p-3 border-b border-border bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <span className="font-medium">KWIC: </span>
              <Badge variant="secondary" className="font-mono">
                {word}
              </Badge>
              {!isLoading && (
                <Badge variant="outline" className="text-xs">
                  {results.length} ocorrências
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma ocorrência encontrada</p>
              {!corpus && (
                <p className="text-xs mt-1">Corpus não carregado</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.slice(0, 10).map((ctx, idx) => (
                <div key={idx} className="px-3 py-2 text-sm hover:bg-muted/30 transition-colors">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-muted-foreground text-right flex-1 min-w-0 truncate">
                      {ctx.contextoEsquerdo}
                    </span>
                    <span className="font-bold text-primary shrink-0 px-1">
                      {ctx.palavra}
                    </span>
                    <span className="text-muted-foreground flex-1 min-w-0 truncate">
                      {ctx.contextoDireito}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                    {ctx.metadata.artista} — {ctx.metadata.musica}
                  </div>
                </div>
              ))}
              {results.length > 10 && (
                <div className="px-3 py-2 text-center text-xs text-muted-foreground bg-muted/30">
                  +{results.length - 10} ocorrências adicionais
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        {results.length > 0 && (
          <div className="p-2 border-t border-border bg-muted/30 flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="text-xs h-7"
            >
              Exportar CSV
            </Button>
            {onOpenKWICTool && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFullTool}
                className="text-xs h-7 gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Ver Completo
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
