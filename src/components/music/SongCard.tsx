import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, Eye, Edit, Sparkles, Loader2, AlertCircle, CheckCircle2, MoreVertical, RefreshCw, Trash2, Folder, Youtube } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
  corpusName?: string | null;
  corpusColor?: string | null;
  youtubeUrl?: string | null;
}

interface SongCardProps {
  song: Song;
  onView?: (song: Song) => void;
  onEdit?: (song: Song) => void;
  onEnrich?: (songId: string) => void;
  onReEnrich?: (songId: string) => void;
  onMarkReviewed?: (songId: string) => void;
  onDelete?: (songId: string) => void;
  isEnriching?: boolean;
}

export function SongCard({ song, onView, onEdit, onEnrich, onReEnrich, onMarkReviewed, onDelete, isEnriching }: SongCardProps) {
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
          
          {/* Status & Confidence Badges + Menu Overlay */}
          <div className="absolute top-2 right-2 flex gap-2">
            <div className="flex flex-col gap-2">
              {getStatusBadge(song.status)}
              {song.confidence > 0 && getConfidenceBadge(song.confidence)}
            </div>
            
            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0 shadow-sm"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(song)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Manualmente
                  </DropdownMenuItem>
                )}
                {onReEnrich && (
                  <DropdownMenuItem onClick={() => onReEnrich(song.id)} disabled={isEnriching}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isEnriching ? 'animate-spin' : ''}`} />
                    Re-enriquecer
                  </DropdownMenuItem>
                )}
                {onMarkReviewed && song.status !== 'approved' && (
                  <DropdownMenuItem onClick={() => onMarkReviewed(song.id)}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marcar como Revisado
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(song.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deletar Música
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
            {song.corpusName && (
              <Badge 
                variant="outline" 
                className="border-2 text-xs"
                style={{ borderColor: song.corpusColor || '#3B82F6' }}
              >
                <Folder className="w-3 h-3 mr-1" />
                {song.corpusName}
              </Badge>
            )}
            {song.youtubeUrl && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => window.open(song.youtubeUrl!, '_blank', 'noopener,noreferrer')}
                    >
                      <Youtube className="w-3 h-3 mr-1" />
                      YouTube
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Assistir vídeo no YouTube</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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
