import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ParsedMusic } from '@/lib/excelParser';

export type UploadState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

interface ProcessingContextType {
  uploadState: UploadState;
  progress: number;
  parsedData: ParsedMusic[];
  error: string | null;
  fileName: string | null;
  uploadFile: (file: File) => Promise<void>;
  setProgress: (progress: number) => void;
  setParsedData: (data: ParsedMusic[]) => void;
  setUploadState: (state: UploadState) => void;
  setError: (error: string | null) => void;
  resetProcessing: () => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export function ProcessingProvider({ children }: { children: React.ReactNode }) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ParsedMusic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploadState('uploading');
    setError(null);
    setFileName(file.name);
    setProgress(0);

    try {
      // Create worker for Excel parsing
      const worker = new Worker(
        new URL('../workers/excelParser.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.postMessage({ file, action: 'parse' });

      worker.onmessage = (e) => {
        const { success, data, error: workerError } = e.data;

        if (success) {
          setParsedData(data);
          setUploadState('complete');
          setProgress(100);
        } else {
          setError(workerError || 'Failed to parse file');
          setUploadState('error');
        }

        worker.terminate();
      };

      worker.onerror = (err) => {
        setError(err.message || 'Worker error');
        setUploadState('error');
        worker.terminate();
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setUploadState('error');
    }
  }, []);

  const resetProcessing = useCallback(() => {
    setUploadState('idle');
    setProgress(0);
    setParsedData([]);
    setError(null);
    setFileName(null);
  }, []);

  return (
    <ProcessingContext.Provider
      value={{
        uploadState,
        progress,
        parsedData,
        error,
        fileName,
        uploadFile,
        setProgress,
        setParsedData,
        setUploadState,
        setError,
        resetProcessing,
      }}
    >
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (!context) {
    throw new Error('useProcessing must be used within ProcessingProvider');
  }
  return context;
}
