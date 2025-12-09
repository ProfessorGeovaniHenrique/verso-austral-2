/**
 * SongCard Orchestrator Component
 * Sprint CAT-AUDIT-P2 - Refatoração de 501 para ~120 linhas
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SongCardThumbnail } from './SongCardThumbnail';
import { SongCardMetadata } from './SongCardMetadata';
import { SongCardActions } from './SongCardActions';
import { SongCardPlayer } from './SongCardPlayer';
import { StatusBadge, ConfidenceBadge, CorpusBadge, GenreBadge } from './SongCardBadges';
import { SongData, extractYoutubeVideoId } from './types';

// Re-export Song type for backwards compatibility
export type Song = SongData;

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
  
  const youtubeLink = song.youtubeUrl || song.youtube_url;
  const videoId = youtubeLink ? extractYoutubeVideoId(youtubeLink) : null;
  const confidence = song.confidence || (song.confidence_score ? song.confidence_score / 100 : 0);
  const releaseYear = song.year || song.release_year;
  const isCompact = variant === 'compact';

  const callbacks = { onView, onEdit, onEnrich, onReEnrich, onMarkReviewed, onDelete, onAnnotateSemantic };
  const state = { isEnriching, isAnnotatingSemantic };

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${isCompact ? 'mb-2' : ''}`}>
      <CardContent className={`flex flex-row ${isCompact ? 'p-4 gap-4' : 'p-0'}`}>
        {/* Thumbnail + Badges Container */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <SongCardThumbnail
            title={song.title}
            youtubeUrl={youtubeLink}
            thumbnail={song.thumbnail}
            isCompact={isCompact}
            onTogglePlayer={() => setShowVideoPlayer(!showVideoPlayer)}
          />
          
          {/* Badges below thumbnail */}
          <div className="flex flex-wrap gap-1 max-w-[8rem] md:max-w-[12rem]">
            <StatusBadge status={song.status} />
            {confidence > 0 && <ConfidenceBadge confidence={confidence} />}
            {song.status === 'enriched' && (
              <Badge variant="default" className="text-xs animate-pulse">
                Novo
              </Badge>
            )}
          </div>
        </div>

        {/* Content (Right) */}
        <div className={`flex-1 space-y-2 min-w-0 ${isCompact ? '' : 'p-4'}`}>
          {/* Header: Title + Actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold line-clamp-2 ${isCompact ? 'text-sm' : 'text-lg'}`} title={song.title}>
                {song.title}
              </h3>
              <p className={`text-muted-foreground ${isCompact ? 'text-xs' : 'text-sm'} mt-1`}>
                Nome do artista: {song.artist || song.artists?.name || 'Desconhecido'}
              </p>
            </div>
            
            <SongCardActions
              song={song}
              callbacks={callbacks}
              state={state}
              videoId={videoId}
              youtubeUrl={youtubeLink}
              isCompact={isCompact}
              onTogglePlayer={() => setShowVideoPlayer(!showVideoPlayer)}
            />
          </div>
          
          {/* Metadata */}
          <SongCardMetadata
            composer={song.composer}
            album={song.album}
            releaseYear={releaseYear}
            enrichmentSource={song.enrichment_source}
            confidence={confidence}
            status={song.status}
            isCompact={isCompact}
          />
          
          {/* Additional Badges */}
          <div className="flex flex-wrap gap-2">
            <CorpusBadge corpusName={song.corpusName} corpusColor={song.corpusColor} />
            <GenreBadge genre={song.genre} />
          </div>

          {/* YouTube Player Embed */}
          <SongCardPlayer videoId={videoId || ''} show={showVideoPlayer} />
        </div>
      </CardContent>
    </Card>
  );
}
