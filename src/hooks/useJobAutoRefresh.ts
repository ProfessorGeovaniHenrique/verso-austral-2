import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Job {
  id: string;
  artist_name: string;
  status: string;
  processed_words: number;
  total_words: number;
  tempo_inicio: string;
  last_chunk_at: string | null;
  current_song_index?: number | null;
  current_word_index?: number | null;
}

interface AutoResumeStats {
  attemptsToday: number;
  successfulResumes: number;
  failedResumes: number;
  lastAttemptAt: Date | null;
}

interface UseJobAutoRefreshOptions {
  refreshInterval?: number;
  enableAutoResume?: boolean;
  maxAutoResumeAttempts?: number;
  stuckThresholdMinutes?: number;
}

const STORAGE_KEY = 'job-auto-resume-attempts';

export function useJobAutoRefresh(
  jobs: Job[],
  onRefresh: () => void,
  options: UseJobAutoRefreshOptions = {}
) {
  const {
    refreshInterval = 30000,
    enableAutoResume: initialAutoResume = true,
    maxAutoResumeAttempts = 3,
    stuckThresholdMinutes = 5
  } = options;

  const [timeToRefresh, setTimeToRefresh] = useState(refreshInterval / 1000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date>(new Date());
  const [autoResumeEnabled, setAutoResumeEnabled] = useState(initialAutoResume);
  const [autoResumeAttempts, setAutoResumeAttempts] = useState<Record<string, number>>({});
  const [autoResumeStats, setAutoResumeStats] = useState<AutoResumeStats>({
    attemptsToday: 0,
    successfulResumes: 0,
    failedResumes: 0,
    lastAttemptAt: null
  });
  
  const isResumingRef = useRef<Record<string, boolean>>({});

  // Load attempts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Reset if not today
        const today = new Date().toDateString();
        if (parsed.date === today) {
          setAutoResumeAttempts(parsed.attempts || {});
          setAutoResumeStats(parsed.stats || {
            attemptsToday: 0,
            successfulResumes: 0,
            failedResumes: 0,
            lastAttemptAt: null
          });
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save attempts to localStorage
  const saveAttempts = useCallback((attempts: Record<string, number>, stats: AutoResumeStats) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: new Date().toDateString(),
      attempts,
      stats
    }));
  }, []);

  // Check if job is stuck
  const isJobStuck = useCallback((job: Job): boolean => {
    if (job.status !== 'processando') return false;
    if (!job.last_chunk_at) return true;

    const lastActivity = new Date(job.last_chunk_at).getTime();
    const now = Date.now();
    const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
    
    return minutesSinceActivity > stuckThresholdMinutes;
  }, [stuckThresholdMinutes]);

  // Calculate processing rate
  const getProcessingRate = useCallback((job: Job): number => {
    if (job.processed_words === 0 || job.status !== 'processando') return 0;
    const elapsedMs = Date.now() - new Date(job.tempo_inicio).getTime();
    return job.processed_words / (elapsedMs / 1000);
  }, []);

  // Calculate ETA in seconds
  const getETASeconds = useCallback((job: Job): number | null => {
    const rate = getProcessingRate(job);
    if (rate === 0) return null;
    const remaining = job.total_words - job.processed_words;
    return remaining / rate;
  }, [getProcessingRate]);

  // Get elapsed time in seconds
  const getElapsedSeconds = useCallback((job: Job): number => {
    return (Date.now() - new Date(job.tempo_inicio).getTime()) / 1000;
  }, []);

  // Auto-resume a stuck job
  const handleAutoResume = useCallback(async (job: Job): Promise<boolean> => {
    if (isResumingRef.current[job.id]) return false;
    
    isResumingRef.current[job.id] = true;
    
    try {
      // Reset last_chunk_at
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      
      const { error: updateError } = await supabase
        .from('semantic_annotation_jobs')
        .update({ 
          status: 'processando',
          last_chunk_at: oneMinuteAgo,
          erro_mensagem: null
        })
        .eq('id', job.id);

      if (updateError) throw updateError;

      // Invoke edge function
      await supabase.functions.invoke('annotate-artist-songs', {
        body: { 
          jobId: job.id,
          continueFrom: {
            songIndex: job.current_song_index || 0,
            wordIndex: job.current_word_index || 0,
          }
        }
      });

      return true;
    } catch (error) {
      console.error('Auto-resume failed:', error);
      return false;
    } finally {
      isResumingRef.current[job.id] = false;
    }
  }, []);

  // Check and auto-resume stuck jobs
  useEffect(() => {
    if (!autoResumeEnabled) return;

    const stuckJobs = jobs.filter(job => isJobStuck(job));
    
    for (const job of stuckJobs) {
      const attempts = autoResumeAttempts[job.id] || 0;
      
      if (attempts < maxAutoResumeAttempts && !isResumingRef.current[job.id]) {
        // Attempt auto-resume
        handleAutoResume(job).then(success => {
          const newAttempts = {
            ...autoResumeAttempts,
            [job.id]: attempts + 1
          };
          setAutoResumeAttempts(newAttempts);
          
          const newStats = {
            attemptsToday: autoResumeStats.attemptsToday + 1,
            successfulResumes: autoResumeStats.successfulResumes + (success ? 1 : 0),
            failedResumes: autoResumeStats.failedResumes + (success ? 0 : 1),
            lastAttemptAt: new Date()
          };
          setAutoResumeStats(newStats);
          saveAttempts(newAttempts, newStats);
          
          if (success) {
            toast.info(`🔄 Job "${job.artist_name}" retomado automaticamente (tentativa ${attempts + 1}/${maxAutoResumeAttempts})`);
          } else {
            toast.warning(`⚠️ Falha ao retomar "${job.artist_name}" automaticamente`);
          }
          
          onRefresh();
        });
      }
    }
  }, [jobs, autoResumeEnabled, autoResumeAttempts, maxAutoResumeAttempts, isJobStuck, handleAutoResume, autoResumeStats, saveAttempts, onRefresh]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeToRefresh(prev => {
        if (prev <= 1) {
          setIsRefreshing(true);
          onRefresh();
          setLastRefreshAt(new Date());
          setTimeout(() => setIsRefreshing(false), 500);
          return refreshInterval / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshInterval, onRefresh]);

  const toggleAutoResume = useCallback(() => {
    setAutoResumeEnabled(prev => !prev);
  }, []);

  const resetAttempts = useCallback((jobId?: string) => {
    if (jobId) {
      const newAttempts = { ...autoResumeAttempts };
      delete newAttempts[jobId];
      setAutoResumeAttempts(newAttempts);
      saveAttempts(newAttempts, autoResumeStats);
    } else {
      setAutoResumeAttempts({});
      const newStats = { attemptsToday: 0, successfulResumes: 0, failedResumes: 0, lastAttemptAt: null };
      setAutoResumeStats(newStats);
      saveAttempts({}, newStats);
    }
  }, [autoResumeAttempts, autoResumeStats, saveAttempts]);

  return {
    // Refresh state
    timeToRefresh,
    isRefreshing,
    lastRefreshAt,
    
    // Auto-resume
    autoResumeEnabled,
    toggleAutoResume,
    autoResumeAttempts,
    autoResumeStats,
    maxAutoResumeAttempts,
    resetAttempts,
    
    // Job analysis
    isJobStuck,
    getProcessingRate,
    getETASeconds,
    getElapsedSeconds
  };
}
