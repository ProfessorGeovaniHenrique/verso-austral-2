/**
 * SongCard Thumbnail Component
 * Sprint CAT-AUDIT-P2 - Refatoração SongCard
 */

import { useState } from 'react';
import { Music, Play } from 'lucide-react';
import { extractYoutubeVideoId } from './types';

interface SongCardThumbnailProps {
  title: string;
  youtubeUrl?: string | null;
  thumbnail?: string;
  isCompact?: boolean;
  onTogglePlayer?: () => void;
}

export function SongCardThumbnail({
  title,
  youtubeUrl,
  thumbnail,
  isCompact = false,
  onTogglePlayer
}: SongCardThumbnailProps) {
  const [thumbnailError, setThumbnailError] = useState(false);
  
  const videoId = youtubeUrl ? extractYoutubeVideoId(youtubeUrl) : null;
  
  const thumbnailUrl = videoId && !thumbnailError
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : thumbnail || null;

  const handleClick = () => {
    if (!isCompact && videoId && onTogglePlayer) {
      onTogglePlayer();
    }
  };

  return (
    <div 
      className={`${isCompact ? 'w-32 h-32' : 'w-32 h-32 md:w-48 md:h-48'} bg-muted flex items-center justify-center relative overflow-hidden rounded-lg group ${!isCompact && videoId ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setThumbnailError(true)}
        />
      ) : (
        <Music className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
      )}
      
      {/* Hover Overlay with Play Icon - Full mode only */}
      {!isCompact && videoId && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
      )}
    </div>
  );
}
