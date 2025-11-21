import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Music, TrendingUp, ArrowRight } from 'lucide-react';

export interface Artist {
  id: string;
  name: string;
  songCount: number;
  averageConfidence: number;
  topGenres: string[];
}

interface ArtistCardProps {
  artist: Artist;
  onViewSongs?: (artist: Artist) => void;
}

export function ArtistCard({ artist, onViewSongs }: ArtistCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 50) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Artist Info */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <User className="h-8 w-8 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate" title={artist.name}>
                {artist.name}
              </h3>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Music className="h-4 w-4" />
                  <span>{artist.songCount} música(s)</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className={getConfidenceColor(artist.averageConfidence)}>
                    {Math.round(artist.averageConfidence)}% conf.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Genres */}
          {artist.topGenres.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Gêneros principais:</p>
              <div className="flex flex-wrap gap-2">
                {artist.topGenres.slice(0, 3).map((genre, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
                {artist.topGenres.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{artist.topGenres.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          {onViewSongs && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onViewSongs(artist)}
            >
              Ver Todas as Músicas
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
