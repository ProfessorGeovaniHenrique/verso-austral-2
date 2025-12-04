import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, Eye, Edit, Sparkles, Loader2, AlertCircle, CheckCircle2, MoreVertical, RefreshCw, Trash2, Folder, Youtube, Play, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  artist?: string;
  artist_id?: string;
  composer?: string | null;
  album?: string;
  year?: string;
  release_year?: string | null;
  genre?: string | null;
  confidence?: number;
  confidence_score?: number | null;
  thumbnail?: string;
  status?: string | null;
  corpusName?: string | null;
  corpusColor?: string | null;
  youtubeUrl?: string | null;
  youtube_url?: string | null;
  lyrics?: string | null;
  lyrics_source?: string | null;
  lyrics_url?: string | null;
  enrichment_source?: string | null;
  raw_data?: any;
  corpus_id?: string | null;
  upload_id?: string | null;
  created_at?: string;
  updated_at?: string;
  normalized_title?: string | null;
  // Relações do Supabase (joins)
  artists?: {
    id: string;
    name: string;
    genre: string | null;
    corpus_id: string | null;
  };
  corpora?: {
    id: string;
    name: string;
    color: string | null;
  };
}

interface SongCardProps {
  song: Song;
  variant?: 'full' | 'compact';
  onView?: (song: Song) => void;
  onEdit?: (song: Song) => void;
  onEnrich?: (songId: string) => void;
  onReEnrich?: (songId: string) => void;
  onMarkReviewed?: (songId: string) => void;
  onDelete?: (songId: string) => void;
  onAnnotateSemantic?: (songId: string) => void;
  isEnriching?: boolean;
  isAnnotatingSemantic?: boolean;
}

// Função auxiliar para extrair Video ID da URL do YouTube
const extractYoutubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Suporta formatos: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
};

export function SongCard({ 
  song, 
  variant = 'full',
  onView, 
  onEdit, 
  onEnrich, 
  onReEnrich, 
  onMarkReviewed, 
  onDelete,
  onAnnotateSemantic,
  isEnriching,
  isAnnotatingSemantic = false
}: SongCardProps) {
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  
  // Compatibilidade: suporta ambos youtubeUrl e youtube_url
  const youtubeLink = song.youtubeUrl || song.youtube_url;
  const videoId = youtubeLink ? extractYoutubeVideoId(youtubeLink) : null;
   
  // Lógica de thumbnail: prioriza YouTube, depois thumbnail do banco, depois fallback
  const thumbnailUrl = videoId && !thumbnailError
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : song.thumbnail || null;
  
  // Compatibilidade de campos
  const confidence = song.confidence || (song.confidence_score ? song.confidence_score / 100 : 0);
  const releaseYear = song.year || song.release_year;
  const isCompact = variant === 'compact';
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
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${isCompact ? 'mb-2' : ''}`}>
      <CardContent className={`flex flex-row ${isCompact ? 'p-4 gap-4' : 'p-0'}`}>
        {/* Thumbnail + Badges Container */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {/* Thumbnail */}
          <div 
            className={`${isCompact ? 'w-32 h-32' : 'w-32 h-32 md:w-48 md:h-48'} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg group ${!isCompact && videoId ? 'cursor-pointer' : ''}`}
            onClick={() => !isCompact && videoId && setShowVideoPlayer(!showVideoPlayer)}
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={song.title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setThumbnailError(true)}
              />
            ) : (
              <Music className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
            )}
            
            {/* Hover Overlay com Play Icon - Apenas no modo full */}
            {!isCompact && videoId && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
            )}
          </div>
          
          {/* Badges abaixo da thumbnail */}
          <div className="flex flex-wrap gap-1 max-w-[8rem] md:max-w-[12rem]">
            {getStatusBadge(song.status)}
            {confidence > 0 && getConfidenceBadge(confidence)}
            {song.status === 'enriched' && (
              <Badge variant="default" className="text-xs animate-pulse">
                Novo
              </Badge>
            )}
          </div>
        </div>

        {/* Conteúdo (Direita) */}
        <div className={`flex-1 space-y-2 min-w-0 ${isCompact ? '' : 'p-4'}`}>
          {/* Header: Título + Ações */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold line-clamp-2 ${isCompact ? 'text-sm' : 'text-lg'}`} title={song.title}>
                {song.title}
              </h3>
              <p className={`text-muted-foreground ${isCompact ? 'text-xs' : 'text-sm'} mt-1`}>
                Nome do artista: {song.artist || song.artists?.name || 'Desconhecido'}
              </p>
            </div>
            
            {/* Botões de Ação + Dropdown */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Botão de fonte da letra */}
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
                          onClick={() => setShowVideoPlayer(!showVideoPlayer)}
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
                          onClick={() => window.open(youtubeLink!, '_blank', 'noopener,noreferrer')}
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
                        <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 mr-2 ${isAnnotatingSemantic ? 'animate-pulse' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                        </svg>
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
          </div>
          
          {/* Metadados */}
          {isCompact ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {song.composer && (
                  <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Compositor</span>
                      {song.status === 'enriched' && (
                        <Sparkles className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs font-medium leading-tight line-clamp-2">{song.composer}</p>
                  </div>
                )}
                {song.album && (
                  <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Álbum:</span>
                      {song.status === 'enriched' && (
                        <Sparkles className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs font-medium leading-tight line-clamp-2">
                      {song.album}
                    </p>
                  </div>
                )}
                {releaseYear && releaseYear !== '0000' && (
                  <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Ano de Lançamento</span>
                      {song.status === 'enriched' && (
                        <Sparkles className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs font-medium">{releaseYear}</p>
                  </div>
                )}
              </div>
              {(song.enrichment_source || confidence > 0) && (
                <p className="text-[11px] text-muted-foreground">
                  {song.enrichment_source && <span>Fonte: {song.enrichment_source}</span>}
                  {song.enrichment_source && confidence > 0 && <span> | </span>}
                  {confidence > 0 && <span>Confiança: {(confidence * 100).toFixed(0)}%</span>}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Compositor</span>
                  <p className="text-foreground font-medium">{song.composer || 'Não identificado'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ano de Lançamento</span>
                  <p className="text-foreground font-medium flex items-center gap-1">
                    {releaseYear || '—'}
                    {releaseYear && <Edit className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-foreground" />}
                  </p>
                </div>
              </div>
              
              {/* Fonte e Confiança */}
              {(song.enrichment_source || confidence > 0) && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {song.enrichment_source && <span>Fonte: {song.enrichment_source}</span>}
                  {confidence > 0 && (
                    <span className="text-success">Confiança: {(confidence * 100).toFixed(0)}%</span>
                  )}
                </div>
              )}
            </>
          )}
          
          {/* Badges Adicionais */}
          <div className="flex flex-wrap gap-2">
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
            {song.genre && (
              <Badge variant="secondary" className="text-xs">
                {song.genre}
              </Badge>
            )}
          </div>


          {/* YouTube Player Embed */}
          {showVideoPlayer && videoId && (
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-black animate-fade-in">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
