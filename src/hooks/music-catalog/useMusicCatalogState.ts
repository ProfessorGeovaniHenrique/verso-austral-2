/**
 * Hook centralizado para gerenciar todos os estados do MusicCatalog
 * Sprint F2.1 - Refatoração
 */

import { useState, useCallback, useEffect } from 'react';
import { useCatalogData } from '@/hooks/useCatalogData';
import { useArtistSongs } from '@/hooks/useArtistSongs';
import { useEnrichmentQualityMetrics } from '@/hooks/useEnrichmentQualityMetrics';
import { useSemanticAnnotationCatalog } from '@/hooks/useSemanticAnnotationCatalog';
import { Song } from '@/components/music/SongCard';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from '@/lib/performanceUtils';

export type ViewType = 'songs' | 'artists' | 'stats' | 'metrics' | 'validation' | 'deduplication' | 'scraping-jobs' | 'enrichment-jobs';
export type ViewMode = 'table' | 'grid';

export interface MusicCatalogState {
  // View states
  view: ViewType;
  setView: (v: ViewType) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  
  // Search & Filter states
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  debouncedSearchQuery: string;
  selectedLetter: string;
  setSelectedLetter: (l: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  selectedCorpusFilter: string;
  setSelectedCorpusFilter: (c: string) => void;
  showSuspiciousOnly: boolean;
  setShowSuspiciousOnly: (s: boolean) => void;
  
  // Pagination
  currentArtistPage: number;
  setCurrentArtistPage: (p: number | ((prev: number) => number)) => void;
  ARTISTS_PER_PAGE: number;
  
  // Selection states
  selectedArtistId: string | null;
  setSelectedArtistId: (id: string | null) => void;
  
  // Data states
  songs: Song[];
  setSongs: (s: Song[]) => void;
  allSongs: Song[];
  setAllSongs: (s: Song[]) => void;
  songsWithoutYouTube: Song[];
  setSongsWithoutYouTube: (s: Song[]) => void;
  corpora: any[];
  setCorpora: (c: any[]) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  
  // Modal states
  enrichingIds: Set<string>;
  setEnrichingIds: (fn: (prev: Set<string>) => Set<string>) => void;
  batchModalOpen: boolean;
  setBatchModalOpen: (o: boolean) => void;
  youtubeModalOpen: boolean;
  setYoutubeModalOpen: (o: boolean) => void;
  pendingSongsForBatch: any[];
  setPendingSongsForBatch: (s: any[]) => void;
  isSheetOpen: boolean;
  setIsSheetOpen: (o: boolean) => void;
  isClearingCatalog: boolean;
  setIsClearingCatalog: (c: boolean) => void;
  enrichingByLetter: boolean;
  setEnrichingByLetter: (e: boolean) => void;
  
  // Artist enrichment modal
  isEnrichmentModalOpen: boolean;
  setIsEnrichmentModalOpen: (o: boolean) => void;
  songsToEnrich: Array<{ id: string; title: string; artist: string }>;
  setSongsToEnrich: (s: Array<{ id: string; title: string; artist: string }>) => void;
  
  // Override states
  artistStatsOverrides: Map<string, { pendingSongs: number; enrichedPercentage: number }>;
  setArtistStatsOverrides: (fn: (prev: Map<string, any>) => Map<string, any>) => void;
  artistBioOverrides: Map<string, { biography: string; biography_source: string; biography_updated_at: string }>;
  setArtistBioOverrides: (fn: (prev: Map<string, any>) => Map<string, any>) => void;
  
  // Refresh state
  isDataRefreshing: boolean;
  setIsDataRefreshing: (r: boolean) => void;
  pendingCountForLetter: number;
  setPendingCountForLetter: (c: number) => void;
  
  // Hooks data
  catalogSongs: any[];
  artistsWithStats: any[];
  catalogStats: any;
  catalogLoading: boolean;
  reload: () => Promise<void>;
  reloadWithDelay: (delay?: number) => Promise<void>;
  artistSongs: any[];
  artistSongsLoading: boolean;
  reloadArtistSongs: () => Promise<void>;
  enrichmentMetrics: any;
  metricsLoading: boolean;
  refetchMetrics: () => void;
  
  // Semantic annotation
  annotateSong: (songId: string, title: string) => Promise<any>;
  annotateArtist: (artistId: string, artistName: string) => Promise<any>;
  checkSongCoverage: (songId: string) => Promise<any>;
  isAnnotatingSong: (songId: string) => boolean;
  isAnnotatingArtist: (artistId: string) => boolean;
  songProgress: Map<string, any>;
  artistJob: any;
}

export function useMusicCatalogState(): MusicCatalogState {
  // View states
  const [view, setView] = useState<ViewType>('songs');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCorpusFilter, setSelectedCorpusFilter] = useState<string>('all');
  const [showSuspiciousOnly, setShowSuspiciousOnly] = useState(false);
  
  // Pagination
  const [currentArtistPage, setCurrentArtistPage] = useState(1);
  const ARTISTS_PER_PAGE = 24;
  
  // Selection states
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  
  // Data states
  const [songs, setSongs] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [songsWithoutYouTube, setSongsWithoutYouTube] = useState<Song[]>([]);
  const [corpora, setCorpora] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
  const [pendingSongsForBatch, setPendingSongsForBatch] = useState<any[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClearingCatalog, setIsClearingCatalog] = useState(false);
  const [enrichingByLetter, setEnrichingByLetter] = useState(false);
  
  // Artist enrichment modal
  const [isEnrichmentModalOpen, setIsEnrichmentModalOpen] = useState(false);
  const [songsToEnrich, setSongsToEnrich] = useState<Array<{ id: string; title: string; artist: string }>>([]);
  
  // Override states
  const [artistStatsOverrides, setArtistStatsOverrides] = useState<Map<string, any>>(new Map());
  const [artistBioOverrides, setArtistBioOverrides] = useState<Map<string, any>>(new Map());
  
  // Refresh state
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [pendingCountForLetter, setPendingCountForLetter] = useState<number>(0);
  
  // Hooks
  const { 
    songs: catalogSongs,
    artists: artistsWithStats, 
    stats: catalogStats, 
    loading: catalogLoading, 
    reload,
    reloadWithDelay
  } = useCatalogData();
  
  const { songs: artistSongs, loading: artistSongsLoading, reload: reloadArtistSongs } = useArtistSongs(selectedArtistId);
  const { data: enrichmentMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useEnrichmentQualityMetrics();
  
  const {
    annotateSong,
    annotateArtist,
    checkSongCoverage,
    isAnnotatingSong,
    isAnnotatingArtist,
    songProgress,
    artistJob,
  } = useSemanticAnnotationCatalog();
  
  // Debounce search
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchQuery(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetSearch(searchQuery);
  }, [searchQuery, debouncedSetSearch]);
  
  // Load corpora on mount
  useEffect(() => {
    const loadCorpora = async () => {
      const { data } = await supabase
        .from('corpora')
        .select('id, name, color, normalized_name')
        .order('name');
      setCorpora(data || []);
    };
    loadCorpora();
  }, []);
  
  // Reset page on filter change
  useEffect(() => {
    setCurrentArtistPage(1);
  }, [selectedLetter, debouncedSearchQuery, selectedCorpusFilter]);
  
  return {
    view, setView,
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    debouncedSearchQuery,
    selectedLetter, setSelectedLetter,
    statusFilter, setStatusFilter,
    selectedCorpusFilter, setSelectedCorpusFilter,
    showSuspiciousOnly, setShowSuspiciousOnly,
    currentArtistPage, setCurrentArtistPage,
    ARTISTS_PER_PAGE,
    selectedArtistId, setSelectedArtistId,
    songs, setSongs,
    allSongs, setAllSongs,
    songsWithoutYouTube, setSongsWithoutYouTube,
    corpora, setCorpora,
    loading, setLoading,
    enrichingIds, setEnrichingIds,
    batchModalOpen, setBatchModalOpen,
    youtubeModalOpen, setYoutubeModalOpen,
    pendingSongsForBatch, setPendingSongsForBatch,
    isSheetOpen, setIsSheetOpen,
    isClearingCatalog, setIsClearingCatalog,
    enrichingByLetter, setEnrichingByLetter,
    isEnrichmentModalOpen, setIsEnrichmentModalOpen,
    songsToEnrich, setSongsToEnrich,
    artistStatsOverrides, setArtistStatsOverrides,
    artistBioOverrides, setArtistBioOverrides,
    isDataRefreshing, setIsDataRefreshing,
    pendingCountForLetter, setPendingCountForLetter,
    catalogSongs,
    artistsWithStats,
    catalogStats,
    catalogLoading,
    reload,
    reloadWithDelay,
    artistSongs,
    artistSongsLoading,
    reloadArtistSongs: reloadArtistSongs || (async () => {}),
    enrichmentMetrics,
    metricsLoading,
    refetchMetrics,
    annotateSong,
    annotateArtist,
    checkSongCoverage,
    isAnnotatingSong,
    isAnnotatingArtist,
    songProgress,
    artistJob,
  };
}
