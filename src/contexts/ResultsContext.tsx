import React, { createContext, useContext, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

export interface EnrichedSong {
  id: string;
  title: string;
  artist: string;
  composer?: string;
  releaseYear?: string;
  lyrics?: string;
  confidenceScore: number;
  enrichmentSource?: string;
  status: string;
  createdAt: string;
}

export interface EnrichmentMetrics {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  averageConfidence: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  processingTime?: number;
}

export interface ErrorEntry {
  id: string;
  songId: string;
  songTitle: string;
  error: string;
  timestamp: string;
}

interface ResultsContextType {
  enrichedSongs: EnrichedSong[];
  metrics: EnrichmentMetrics;
  errorLog: ErrorEntry[];
  setEnrichedSongs: (songs: EnrichedSong[]) => void;
  addEnrichedSong: (song: EnrichedSong) => void;
  updateMetrics: () => void;
  addError: (error: ErrorEntry) => void;
  exportToExcel: () => void;
  exportToJSON: () => void;
  exportToCSV: () => void;
  clearResults: () => void;
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

export function ResultsProvider({ children }: { children: React.ReactNode }) {
  const [enrichedSongs, setEnrichedSongs] = useState<EnrichedSong[]>([]);
  const [metrics, setMetrics] = useState<EnrichmentMetrics>({
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    averageConfidence: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
  });
  const [errorLog, setErrorLog] = useState<ErrorEntry[]>([]);

  const addEnrichedSong = useCallback((song: EnrichedSong) => {
    setEnrichedSongs(prev => [...prev, song]);
  }, []);

  const updateMetrics = useCallback(() => {
    const total = enrichedSongs.length;
    const successful = enrichedSongs.filter(s => s.status === 'enriched').length;
    const errors = enrichedSongs.filter(s => s.status === 'error').length;

    const avgConfidence = total > 0
      ? enrichedSongs.reduce((sum, s) => sum + s.confidenceScore, 0) / total
      : 0;

    const high = enrichedSongs.filter(s => s.confidenceScore >= 80).length;
    const medium = enrichedSongs.filter(s => s.confidenceScore >= 50 && s.confidenceScore < 80).length;
    const low = enrichedSongs.filter(s => s.confidenceScore < 50).length;

    setMetrics({
      totalProcessed: total,
      successCount: successful,
      errorCount: errors,
      averageConfidence: avgConfidence,
      highConfidence: high,
      mediumConfidence: medium,
      lowConfidence: low,
    });
  }, [enrichedSongs]);

  const addError = useCallback((error: ErrorEntry) => {
    setErrorLog(prev => [...prev, error]);
  }, []);

  const exportToExcel = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(enrichedSongs.map(song => ({
      'Título': song.title,
      'Artista': song.artist,
      'Compositor': song.composer || '',
      'Ano': song.releaseYear || '',
      'Confiança (%)': song.confidenceScore,
      'Fonte': song.enrichmentSource || '',
      'Status': song.status,
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Músicas Enriquecidas');

    XLSX.writeFile(wb, `musicas-enriquecidas-${Date.now()}.xlsx`);
  }, [enrichedSongs]);

  const exportToJSON = useCallback(() => {
    const dataStr = JSON.stringify(enrichedSongs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `musicas-enriquecidas-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [enrichedSongs]);

  const exportToCSV = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(enrichedSongs);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `musicas-enriquecidas-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [enrichedSongs]);

  const clearResults = useCallback(() => {
    setEnrichedSongs([]);
    setErrorLog([]);
    setMetrics({
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      averageConfidence: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
    });
  }, []);

  return (
    <ResultsContext.Provider
      value={{
        enrichedSongs,
        metrics,
        errorLog,
        setEnrichedSongs,
        addEnrichedSong,
        updateMetrics,
        addError,
        exportToExcel,
        exportToJSON,
        exportToCSV,
        clearResults,
      }}
    >
      {children}
    </ResultsContext.Provider>
  );
}

export function useResults() {
  const context = useContext(ResultsContext);
  if (!context) {
    throw new Error('useResults must be used within ResultsProvider');
  }
  return context;
}
