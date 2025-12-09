/**
 * Shared types for SongCard subcomponents
 * Sprint CAT-AUDIT-P2 - Refatoração SongCard
 */

export interface SongData {
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

export interface SongCardCallbacks {
  onView?: (song: SongData) => void;
  onEdit?: (song: SongData) => void;
  onEnrich?: (songId: string) => void;
  onReEnrich?: (songId: string) => void;
  onMarkReviewed?: (songId: string) => void;
  onDelete?: (songId: string) => void;
  onAnnotateSemantic?: (songId: string) => void;
}

export interface SongCardState {
  isEnriching?: boolean;
  isAnnotatingSemantic?: boolean;
}

// Utility function to extract YouTube video ID
export const extractYoutubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
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
