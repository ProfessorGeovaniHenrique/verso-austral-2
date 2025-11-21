import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import pLimit from 'p-limit';

export interface ProcessingJob {
  id: string;
  songId: string;
  title: string;
  artist: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: any;
}

interface BatchProcessingContextType {
  queue: ProcessingJob[];
  isProcessing: boolean;
  isPaused: boolean;
  currentBatch: number;
  totalBatches: number;
  completedCount: number;
  errorCount: number;
  addToQueue: (jobs: ProcessingJob[]) => void;
  startBatch: (processFn: (job: ProcessingJob) => Promise<any>) => Promise<void>;
  pauseBatch: () => void;
  resumeBatch: () => void;
  cancelBatch: () => void;
  clearQueue: () => void;
  updateJob: (jobId: string, updates: Partial<ProcessingJob>) => void;
  removeJob: (jobId: string) => void;
}

const BatchProcessingContext = createContext<BatchProcessingContextType | undefined>(undefined);

export function BatchProcessingProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ProcessingJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const processingRef = useRef(false);
  const pausedRef = useRef(false);
  const cancelRef = useRef(false);

  const addToQueue = useCallback((jobs: ProcessingJob[]) => {
    setQueue(prev => [...prev, ...jobs]);
  }, []);

  const updateJob = useCallback((jobId: string, updates: Partial<ProcessingJob>) => {
    setQueue(prev => prev.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    ));
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setQueue(prev => prev.filter(job => job.id !== jobId));
  }, []);

  const startBatch = useCallback(async (
    processFn: (job: ProcessingJob) => Promise<any>
  ) => {
    if (processingRef.current) return;

    processingRef.current = true;
    setIsProcessing(true);
    setIsPaused(false);
    cancelRef.current = false;
    pausedRef.current = false;

    const batchSize = 5;
    const limit = pLimit(batchSize);
    const pendingJobs = queue.filter(j => j.status === 'pending');
    
    setTotalBatches(Math.ceil(pendingJobs.length / batchSize));
    setCurrentBatch(0);
    setCompletedCount(0);
    setErrorCount(0);

    const promises = pendingJobs.map((job, index) =>
      limit(async () => {
        if (cancelRef.current) return;

        while (pausedRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (cancelRef.current) return;

        updateJob(job.id, { status: 'processing' });

        try {
          const result = await processFn(job);
          updateJob(job.id, { 
            status: 'completed', 
            progress: 100,
            result 
          });
          setCompletedCount(prev => prev + 1);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          updateJob(job.id, { 
            status: 'error', 
            error: message 
          });
          setErrorCount(prev => prev + 1);
        }

        setCurrentBatch(Math.floor((index + 1) / batchSize) + 1);
      })
    );

    await Promise.all(promises);

    processingRef.current = false;
    setIsProcessing(false);
    setIsPaused(false);
  }, [queue, updateJob]);

  const pauseBatch = useCallback(() => {
    pausedRef.current = true;
    setIsPaused(true);
  }, []);

  const resumeBatch = useCallback(() => {
    pausedRef.current = false;
    setIsPaused(false);
  }, []);

  const cancelBatch = useCallback(() => {
    cancelRef.current = true;
    processingRef.current = false;
    setIsProcessing(false);
    setIsPaused(false);
    
    setQueue(prev => prev.map(job => 
      job.status === 'pending' || job.status === 'processing'
        ? { ...job, status: 'pending' }
        : job
    ));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCompletedCount(0);
    setErrorCount(0);
    setCurrentBatch(0);
    setTotalBatches(0);
  }, []);

  return (
    <BatchProcessingContext.Provider
      value={{
        queue,
        isProcessing,
        isPaused,
        currentBatch,
        totalBatches,
        completedCount,
        errorCount,
        addToQueue,
        startBatch,
        pauseBatch,
        resumeBatch,
        cancelBatch,
        clearQueue,
        updateJob,
        removeJob,
      }}
    >
      {children}
    </BatchProcessingContext.Provider>
  );
}

export function useBatchProcessing() {
  const context = useContext(BatchProcessingContext);
  if (!context) {
    throw new Error('useBatchProcessing must be used within BatchProcessingProvider');
  }
  return context;
}
