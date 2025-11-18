import { useSubcorpus } from '@/contexts/SubcorpusContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, Hash, TrendingUp, X, Users } from 'lucide-react';

export function SubcorpusIndicator() {
  const { selection, currentMetadata, setSelection } = useSubcorpus();
  
  // Não mostra nada se for corpus completo
  if (selection.mode === 'complete' || !currentMetadata) {
    return null;
  }
  
  const handleClear = () => {
    setSelection({
      mode: 'complete',
      corpusBase: selection.corpusBase,
      artistaA: null,
      artistaB: null
    });
  };
  
  const isCompareMode = selection.mode === 'compare' && selection.artistaB;
  
  return (
    <div className="fixed top-20 right-6 z-50 animate-slide-in-right">
      <Card className="shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3 min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs font-medium">
              {isCompareMode ? 'Modo Comparação' : 'Subcorpus Ativo'}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Artista Principal */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">
                {currentMetadata.artista}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-6">
              <span className="text-muted-foreground">Músicas:</span>
              <span className="font-mono font-medium">{currentMetadata.totalMusicas}</span>
              
              <span className="text-muted-foreground">Palavras:</span>
              <span className="font-mono font-medium">{currentMetadata.totalPalavras.toLocaleString('pt-BR')}</span>
              
              <span className="text-muted-foreground">Riqueza:</span>
              <span className="font-mono font-medium">
                {(currentMetadata.riquezaLexical * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          {/* Segundo Artista (se em modo comparação) */}
          {isCompareMode && selection.artistaB && (
            <>
              <div className="border-t pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-sm text-accent">
                    vs {selection.artistaB}
                  </span>
                </div>
              </div>
            </>
          )}
          
          {/* Ação */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={handleClear}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Voltar ao Corpus Completo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
