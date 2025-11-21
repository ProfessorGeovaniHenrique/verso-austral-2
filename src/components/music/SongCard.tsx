import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, Eye, Edit, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: string;
  genre?: string;
  confidence: number;
  thumbnail?: string;
  status?: string;
}

interface SongCardProps {
  song: Song;
  onView?: (song: Song) => void;
  onEdit?: (song: Song) => void;
  onEnrich?: (songId: string) => void;
  isEnriching?: boolean;
}

export function SongCard({ song, onView, onEdit, onEnrich, isEnriching }: SongCardProps) {
  const getStatusBadge = (status: string = 'pending') => {
    const badges = {
      pending: {
        icon: <AlertCircle className="h-3 w-3" />,
        label: 'Pendente',
        className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
        tooltip: 'Aguardando enriquecimento de metadados'
      },
      enriched: {
        icon: <CheckCircle2 className="h-3 w-3" />,
        label: 'Enriquecido',
        className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
        tooltip: 'Metadados completos e validados'
      },
      processed: {
        icon: <CheckCircle2 className="h-3 w-3" />,
        label: 'Processado',
        className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
        tooltip: 'Processado mas sem enriquecimento'
      }
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={badge.className}>
              {badge.icon}
              <span className="ml-1">{badge.label}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{badge.tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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
          
          {/* Status & Confidence Badges Overlay */}
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            {getStatusBadge(song.status)}
            {song.confidence > 0 && getConfidenceBadge(song.confidence)}
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
        {onEnrich && song.status === 'pending' && (
          <Button 
            variant="default" 
            className="flex-1" 
            onClick={() => onEnrich(song.id)}
            disabled={isEnriching}
          >
            {isEnriching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enriquecendo...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Enriquecer
              </>
            )}
          </Button>
        )}
        {onView && (
          <Button variant="outline" className="flex-1" onClick={() => onView(song)}>
            <Eye className="h-4 w-4 mr-2" />
            Ver
          </Button>
        )}
        {onEdit && (
          <Button variant="ghost" size="icon" onClick={() => onEdit(song)}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
