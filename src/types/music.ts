/**
 * Tipos unificados para o sistema de música
 * FASE 0: Substituição de todas as interfaces duplicadas
 */

// ===== DADOS PARSEADOS DE PLANILHAS =====
export interface ParsedMusicData {
  titulo: string;
  artista: string;
  compositor?: string;
  ano?: string;
  letra?: string;
  album?: string;
  genero?: string;
  fonte: string;
}

// ===== SCHEMA DO BANCO (SUPABASE) =====
export interface SongDB {
  id: string;
  title: string;
  normalized_title: string | null;
  artist_id: string;
  composer: string | null;
  release_year: string | null;
  lyrics: string | null;
  status: 'pending' | 'enriched' | 'error';
  confidence_score: number | null;
  enrichment_source: string | null;
  youtube_url: string | null;
  corpus_id: string | null;
  upload_id: string | null;
  raw_data: any | null;
  created_at: string;
  updated_at: string;
}

export interface ArtistDB {
  id: string;
  name: string;
  normalized_name: string;
  genre: string | null;
  biography: string | null;
  biography_source: string | null;
  biography_updated_at: string | null;
  corpus_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorpusDB {
  id: string;
  name: string;
  normalized_name: string;
  description: string | null;
  color: string;
  icon: string;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ===== TIPOS COM RELAÇÕES (JOINS) =====
export interface SongWithRelations extends SongDB {
  artists: {
    id: string;
    name: string;
    genre: string | null;
    normalized_name: string;
  } | null;
  corpora: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export interface ArtistWithRelations extends ArtistDB {
  corpora: {
    id: string;
    name: string;
    color: string;
  } | null;
}

// ===== ESTATÍSTICAS =====
export interface CatalogStats {
  totalSongs: number;
  totalArtists: number;
  pendingSongs: number;
  enrichedSongs: number;
  errorSongs: number;
  avgConfidence: number;
}

// ===== RESULTADOS DE OPERAÇÕES =====
export interface EnrichmentResult {
  success: boolean;
  songId: string;
  data?: {
    composer?: string;
    release_year?: string;
    youtube_url?: string;
    confidence_score?: number;
    enrichment_source?: string;
  };
  error?: string;
}

export interface ImportResult {
  artistsCreated: number;
  songsCreated: number;
  duplicatesSkipped: number;
  artistIds: Record<string, string>;
  songIds: string[];
}
