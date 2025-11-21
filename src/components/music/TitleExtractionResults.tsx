import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Music, User, Copy, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface Artist {
  id: string;
  name: string;
  songCount: number;
}

interface TitleExtractionResultsProps {
  results: {
    totalSongs: number;
    uniqueArtists: number;
    duplicatesRemoved: number;
    artists: Artist[];
  };
}

export function TitleExtractionResults({ results }: TitleExtractionResultsProps) {
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());

  const toggleArtist = (artistId: string) => {
    setExpandedArtists(prev => {
      const next = new Set(prev);
      if (next.has(artistId)) {
        next.delete(artistId);
      } else {
        next.add(artistId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Músicas</p>
                <p className="text-2xl font-bold">{results.totalSongs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <User className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Artistas Únicos</p>
                <p className="text-2xl font-bold">{results.uniqueArtists}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Copy className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duplicatas Removidas</p>
                <p className="text-2xl font-bold">{results.duplicatesRemoved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Artists List */}
      <Card>
        <CardHeader>
          <CardTitle>Músicas por Artista</CardTitle>
          <CardDescription>
            Clique em um artista para ver detalhes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {results.artists.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Nenhum artista encontrado
              </p>
            )}
            
            {results.artists.map(artist => (
              <Collapsible
                key={artist.id}
                open={expandedArtists.has(artist.id)}
                onOpenChange={() => toggleArtist(artist.id)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          expandedArtists.has(artist.id) ? 'rotate-180' : ''
                        }`}
                      />
                      <span className="font-medium">{artist.name}</span>
                    </div>
                    <Badge variant="secondary">
                      {artist.songCount} {artist.songCount === 1 ? 'música' : 'músicas'}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-2">
                  <p className="text-sm text-muted-foreground">
                    Este artista possui {artist.songCount} música(s) no arquivo carregado.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
