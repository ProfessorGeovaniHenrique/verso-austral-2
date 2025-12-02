/**
 * Hook para real-time updates no DevOps Dashboard
 * Sprint 4 - Real-time and Performance
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeConfig {
  tables: string[];
  onUpdate?: () => void;
  enabled?: boolean;
  debounceMs?: number;
}

export function useRealtimeDevOps({ tables, onUpdate, enabled = true, debounceMs = 2000 }: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isTabVisible = useRef(true);

  // Handle tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      isTabVisible.current = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Debounced update handler
  const handleUpdate = useCallback(() => {
    // Skip if tab is not visible
    if (!isTabVisible.current) return;

    // Debounce multiple rapid updates
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setLastEvent(new Date());
      onUpdate?.();
    }, debounceMs);
  }, [onUpdate, debounceMs]);

  useEffect(() => {
    if (!enabled) return;

    const channels = tables.map(table => {
      return supabase
        .channel(`devops-${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            console.log(`[DevOps Realtime] ${table}:`, payload.eventType);
            handleUpdate();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
          }
        });
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      setIsConnected(false);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [tables.join(','), enabled, handleUpdate]);

  return {
    isConnected,
    lastEvent
  };
}

/**
 * Hook específico para alertas em real-time
 */
export function useRealtimeAlerts(onNewAlert?: (alert: any) => void) {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Load initial alerts
    const loadAlerts = async () => {
      const { data } = await supabase
        .from('metric_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setAlerts(data);
    };

    loadAlerts();

    // Subscribe to new alerts
    const channel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'metric_alerts' },
        (payload) => {
          const newAlert = payload.new as any;
          setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
          onNewAlert?.(newAlert);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'metric_alerts' },
        (payload) => {
          const updatedAlert = payload.new as any;
          if (updatedAlert.resolved_at) {
            // Remove resolved alert
            setAlerts(prev => prev.filter(a => a.id !== updatedAlert.id));
          } else {
            // Update alert
            setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewAlert]);

  return { alerts };
}

/**
 * Hook para monitorar jobs de anotação em real-time
 */
export function useRealtimeAnnotationJobs(onJobUpdate?: (job: any) => void) {
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  useEffect(() => {
    // Load active jobs
    const loadJobs = async () => {
      const { data } = await supabase
        .from('annotation_jobs')
        .select('*')
        .in('status', ['pending', 'processando'])
        .order('tempo_inicio', { ascending: false })
        .limit(10);
      
      if (data) setActiveJobs(data);
    };

    loadJobs();

    // Subscribe to job changes
    const channel = supabase
      .channel('realtime-annotation-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'annotation_jobs' },
        (payload) => {
          const job = payload.new as any;
          
          if (payload.eventType === 'INSERT') {
            setActiveJobs(prev => [job, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            if (job.status === 'concluido' || job.status === 'erro' || job.status === 'cancelado') {
              setActiveJobs(prev => prev.filter(j => j.id !== job.id));
            } else {
              setActiveJobs(prev => prev.map(j => j.id === job.id ? job : j));
            }
          }
          
          onJobUpdate?.(job);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onJobUpdate]);

  return { activeJobs };
}
