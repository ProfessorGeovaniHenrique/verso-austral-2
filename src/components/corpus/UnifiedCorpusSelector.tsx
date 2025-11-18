import { useSubcorpus } from '@/contexts/SubcorpusContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Music, Library, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnifiedCorpusSelectorProps {
  allowComparison?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export function UnifiedCorpusSelector({ allowComparison = false, layout = 'horizontal' }: UnifiedCorpusSelectorProps) {
  const { selection, setSelection, currentMetadata, availableArtists, isLoading } = useSubcorpus();
  
  const handleModeChange = (mode: 'complete' | 'single' | 'compare') => {
    setSelection({ ...selection, mode });
  };
  
  const handleCorpusChange = (corpusBase: 'gaucho' | 'nordestino') => {
    setSelection({ 
      ...selection, 
      corpusBase,
      artistaA: null, // Reset seleção de artista
      artistaB: null
    });
  };
  
  const handleArtistaAChange = (artista: string) => {
    setSelection({ ...selection, artistaA: artista });
  };
  
  const handleArtistaBChange = (artista: string) => {
    setSelection({ ...selection, artistaB: artista });
  };
  
  const isVertical = layout === 'vertical';

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent mb-4">
      <CardContent className="pt-6">
        <div className={isVertical ? "space-y-4" : "grid grid-cols-[auto_1fr] gap-4 items-start"}>
          {/* Toggle: Corpus Completo vs Subcorpus */}
          <div className={isVertical ? "flex flex-col gap-2" : "flex gap-2"}>
            <Button 
              variant={selection.mode === 'complete' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('complete')}
              className={isVertical ? "w-full justify-start gap-2" : "gap-2"}
            >
              <Library className="h-4 w-4" />
              Corpus Completo
            </Button>
            <Button 
              variant={selection.mode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('single')}
              className={isVertical ? "w-full justify-start gap-2" : "gap-2"}
            >
              <Music className="h-4 w-4" />
              Subcorpus
            </Button>
            {allowComparison && (
              <Button 
                variant={selection.mode === 'compare' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('compare')}
                className={isVertical ? "w-full justify-start gap-2" : "gap-2"}
              >
                <Users className="h-4 w-4" />
                Comparar
              </Button>
            )}
          </div>
          
          {/* Seleção dinâmica baseada no modo */}
          <div className="space-y-3">
            {/* Seletor de Corpus Base (sempre visível) */}
            <div className={isVertical ? "flex flex-col gap-2" : "flex items-center gap-3"}>
              <label className={isVertical ? "text-sm font-medium" : "text-sm font-medium min-w-[100px]"}>
                Corpus Base:
              </label>
              <Select 
                value={selection.corpusBase} 
                onValueChange={handleCorpusChange}
                disabled={isLoading}
              >
                <SelectTrigger className={isVertical ? "w-full" : "w-[200px]"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gaucho">Gaúcho Consolidado</SelectItem>
                  <SelectItem value="nordestino">Nordestino</SelectItem>
                </SelectContent>
              </Select>
              
              {selection.mode === 'complete' && currentMetadata === null && (
                <Badge variant="secondary" className="gap-1">
                  <Library className="h-3 w-3" />
                  Corpus completo ativo
                </Badge>
              )}
            </div>
            
            {/* Modo Subcorpus Individual */}
            {selection.mode === 'single' && (
              <div className={isVertical ? "flex flex-col gap-2" : "flex items-center gap-3"}>
                <label className={isVertical ? "text-sm font-medium" : "text-sm font-medium min-w-[100px]"}>
                  Artista:
                </label>
                <Select 
                  value={selection.artistaA || ''} 
                  onValueChange={handleArtistaAChange}
                  disabled={isLoading || availableArtists.length === 0}
                >
                  <SelectTrigger className={isVertical ? "w-full" : "w-[200px]"}>
                    <SelectValue placeholder="Selecione um artista" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {availableArtists.map(artista => (
                      <SelectItem key={artista} value={artista}>
                        {artista}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {!isVertical && currentMetadata && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline" className="gap-1">
                      <Music className="h-3 w-3" />
                      {currentMetadata.totalMusicas} músicas
                    </Badge>
                    <span>•</span>
                    <span>{currentMetadata.totalPalavras.toLocaleString()} palavras</span>
                    <span>•</span>
                    <span className="font-medium text-primary">
                      Riqueza: {(currentMetadata.riquezaLexical * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Modo Comparativo */}
            {selection.mode === 'compare' && allowComparison && (
              <div className="space-y-3">
                <div className={isVertical ? "flex flex-col gap-2" : "flex items-center gap-3"}>
                  <label className={isVertical ? "text-sm font-medium" : "text-sm font-medium min-w-[100px]"}>
                    Estudo:
                  </label>
                  <Select 
                    value={selection.artistaA || ''} 
                    onValueChange={handleArtistaAChange}
                    disabled={isLoading || availableArtists.length === 0}
                  >
                    <SelectTrigger className={isVertical ? "w-full" : "w-[200px]"}>
                      <SelectValue placeholder="Selecione artista A" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {availableArtists.map(artista => (
                        <SelectItem key={artista} value={artista}>
                          {artista}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className={isVertical ? "flex flex-col gap-2" : "flex items-center gap-3"}>
                  <label className={isVertical ? "text-sm font-medium" : "text-sm font-medium min-w-[100px]"}>
                    Referência:
                  </label>
                  <Select 
                    value={selection.artistaB || 'resto'} 
                    onValueChange={(value) => {
                      if (value === 'resto') {
                        handleArtistaBChange('');
                      } else {
                        handleArtistaBChange(value);
                      }
                    }}
                    disabled={isLoading || availableArtists.length === 0}
                  >
                    <SelectTrigger className={isVertical ? "w-full" : "w-[200px]"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="resto">Resto do Corpus</SelectItem>
                      {availableArtists
                        .filter(a => a !== selection.artistaA)
                        .map(artista => (
                          <SelectItem key={artista} value={artista}>
                            {artista}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
