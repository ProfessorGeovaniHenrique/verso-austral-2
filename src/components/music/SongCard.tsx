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
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusConfig = {
      pending: { 
        label: 'Pendente', 
        variant: 'warning' as const,
        icon: AlertCircle,
        tooltip: 'Aguardando enriquecimento de metadados'
      },
      enriched: { 
        label: 'Enriquecida', 
        variant: 'success' as const,
        icon: CheckCircle2,
        tooltip: 'Metadados enriquecidos com sucesso'
      },
      processed: { 
        label: 'Processada', 
        variant: 'info' as const,
        icon: CheckCircle2,
        tooltip: 'Música processada do arquivo original'
      },
      error: {
        label: 'Erro',
        variant: 'destructive' as const,
        icon: AlertCircle,
        tooltip: 'Falha no enriquecimento - clique para tentar novamente'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={config.variant} className="flex items-center gap-1 cursor-help">
              <Icon className="w-3 h-3" />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (confidence === undefined || confidence === 0) return null;
    
    const getVariantAndTooltip = (score: number) => {
      if (score >= 0.8) return { variant: 'success' as const, tooltip: 'Alta confiança - Dados verificados' };
      if (score >= 0.5) return { variant: 'warning' as const, tooltip: 'Confiança média - Revisar dados' };
      return { variant: 'destructive' as const, tooltip: 'Baixa confiança - Verificação necessária' };
    };

    const { variant, tooltip } = getVariantAndTooltip(confidence);
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={variant} className="cursor-help">
              ✓ {(confidence * 100).toFixed(0)}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
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
