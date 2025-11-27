import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Library, Music } from 'lucide-react';
import { CorpusType, CORPUS_CONFIG } from '@/data/types/corpus-tools.types';
import { useCorpusArtistsAndSongs } from '@/hooks/useCorpusArtistsAndSongs';

interface CorpusSubcorpusSelectorProps {
  label: string;
  corpusBase: CorpusType;
  onCorpusBaseChange: (corpus: CorpusType) => void;
  mode: 'complete' | 'artist';
  onModeChange: (mode: 'complete' | 'artist') => void;
  selectedArtist?: string | null;
  onArtistChange?: (artist: string) => void;
  disabled?: boolean;
}

export function CorpusSubcorpusSelector({
  label,
  corpusBase,
  onCorpusBaseChange,
  mode,
  onModeChange,
  selectedArtist,
  onArtistChange,
  disabled = false
}: CorpusSubcorpusSelectorProps) {
  const { artists: availableArtists, isLoadingArtists } = useCorpusArtistsAndSongs(corpusBase);
  
  return (
    <Card className="border-primary/10">
      <CardContent className="pt-4 space-y-3">
        <div className="font-medium text-sm text-foreground">{label}</div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground min-w-[80px]">
            Corpus Base:
          </label>
          <Select 
            value={corpusBase} 
            onValueChange={onCorpusBaseChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gaucho">🏞️ Gaúcho</SelectItem>
              <SelectItem value="nordestino">🌵 Nordestino</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={mode === 'complete' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('complete')}
            disabled={disabled}
          >
            <Library className="h-3 w-3 mr-1" />
            Corpus Completo
          </Button>
          <Button 
            variant={mode === 'artist' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('artist')}
            disabled={disabled}
          >
            <Music className="h-3 w-3 mr-1" />
            Artista Específico
          </Button>
        </div>
        
        {mode === 'artist' && (
          <Select 
            value={selectedArtist || ''} 
            onValueChange={onArtistChange}
            disabled={disabled || isLoadingArtists}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingArtists ? "Carregando artistas..." : "Selecione um artista..."} />
            </SelectTrigger>
            <SelectContent>
              {availableArtists.map(artist => (
                <SelectItem key={artist} value={artist}>
                  {artist}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        <Badge variant="secondary" className="text-xs">
          {mode === 'complete' 
            ? `Corpus ${CORPUS_CONFIG[corpusBase].label.split(' ')[2] || corpusBase} completo`
            : selectedArtist 
              ? `Subcorpus: ${selectedArtist}`
              : 'Selecione um artista'
          }
        </Badge>
      </CardContent>
    </Card>
  );
}
