/**
 * SongCard Actions Component
 * Sprint CAT-AUDIT-P2 - Refatoração SongCard
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Edit, 
  MoreVertical, 
  RefreshCw, 
  Trash2, 
  Youtube, 
  Play, 
  ExternalLink, 
  CheckCircle2,
  Brain
} from 'lucide-react';
import { SongData, SongCardCallbacks, SongCardState } from './types';

interface SongCardActionsProps {
  song: SongData;
  callbacks: SongCardCallbacks;
  state: SongCardState;
  videoId: string | null;
  youtubeUrl: string | null;
  isCompact?: boolean;
  onTogglePlayer?: () => void;
}

export function SongCardActions({
  song,
  callbacks,
  state,
  videoId,
  youtubeUrl,
  isCompact = false,
  onTogglePlayer
}: SongCardActionsProps) {
  const { onEdit, onReEnrich, onMarkReviewed, onDelete, onAnnotateSemantic } = callbacks;
  const { isEnriching, isAnnotatingSemantic } = state;

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {/* Lyrics source button */}
      {song.lyrics_url && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-primary hover:text-primary/80 hover:bg-primary/10"
                onClick={() => window.open(song.lyrics_url!, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ver letra em {song.lyrics_source || 'fonte original'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {videoId && (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={onTogglePlayer}
                >
                  <Play className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assistir no card</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => window.open(youtubeUrl!, '_blank', 'noopener,noreferrer')}
                >
                  <Youtube className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Abrir no YouTube</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
      
      {!isCompact && song.status === 'enriched' && (
        <Badge variant="success" className="text-xs">
          Enriquecido
        </Badge>
      )}
      
      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
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
          {onAnnotateSemantic && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onAnnotateSemantic(song.id)}
                disabled={isAnnotatingSemantic || !song.lyrics}
              >
                <Brain className={`w-4 h-4 mr-2 ${isAnnotatingSemantic ? 'animate-pulse' : ''}`} />
                {isAnnotatingSemantic ? 'Anotando...' : 'Anotar Semanticamente'}
              </DropdownMenuItem>
            </>
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
  );
}
