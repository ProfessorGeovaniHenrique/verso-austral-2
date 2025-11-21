import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, Eye, Edit } from 'lucide-react';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: string;
  genre?: string;
  confidence: number;
  thumbnail?: string;
}

interface SongCardProps {
  song: Song;
  onView?: (song: Song) => void;
  onEdit?: (song: Song) => void;
}

export function SongCard({ song, onView, onEdit }: SongCardProps) {
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge className="bg-green-500 hover:bg-green-600">Alta ({confidence})</Badge>;
    } else if (confidence >= 50) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Média ({confidence})</Badge>;
    } else {
      return <Badge variant="destructive">Baixa ({confidence})</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
          {song.thumbnail ? (
            <img
              src={song.thumbnail}
              alt={song.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="h-16 w-16 text-muted-foreground" />
          )}
          
          {/* Confidence Badge Overlay */}
          <div className="absolute top-2 right-2">
            {getConfidenceBadge(song.confidence)}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-lg line-clamp-2" title={song.title}>
            {song.title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-1" title={song.artist}>
            {song.artist}
          </p>
          
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {song.album && (
              <span className="line-clamp-1" title={song.album}>📀 {song.album}</span>
            )}
            {song.year && <span>📅 {song.year}</span>}
            {song.genre && (
              <Badge variant="secondary" className="text-xs">
                {song.genre}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        {onView && (
          <Button variant="outline" className="flex-1" onClick={() => onView(song)}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        )}
        {onEdit && (
          <Button variant="secondary" className="flex-1" onClick={() => onEdit(song)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
