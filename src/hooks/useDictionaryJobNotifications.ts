/**
 * Hook para Notificações em Tempo Real para Jobs de Importação
 * Recebe alertas instantâneos via Supabase Realtime
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  onComplete?: (jobId: string) => void;
  onError?: (jobId: string, error: string) => void;
  onCancelled?: (jobId: string) => void;
  onStalled?: (jobId: string) => void;
}

export function useDictionaryJobNotifications(settings: NotificationSettings) {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notifiedJobsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!settings.enabled) return;

    // Criar instância de áudio para notificações sonoras
    if (settings.soundEnabled && !audioRef.current) {
      audioRef.current = new Audio('/notification-sound.mp3');
      audioRef.current.volume = 0.5;
    }

    const playNotificationSound = () => {
      if (settings.soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {
          // Silently fail if audio can't play
        });
      }
    };

    // Subscrever a mudanças na tabela dictionary_import_jobs
    const channel = supabase
      .channel('dictionary-jobs-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dictionary_import_jobs'
        },
        (payload) => {
          const job = payload.new as any;
          const jobId = job.id;
          const notificationKey = `${jobId}-${job.status}`;

          // Evitar notificações duplicadas
          if (notifiedJobsRef.current.has(notificationKey)) {
            return;
          }
          notifiedJobsRef.current.add(notificationKey);

          // Job concluído com sucesso
          if (job.status === 'concluido' && job.progresso === 100) {
            playNotificationSound();
            toast({
              title: '✅ Importação Concluída!',
              description: `${job.tipo_dicionario}: ${job.verbetes_inseridos?.toLocaleString() || 0} verbetes inseridos`,
              duration: 5000,
            });
            settings.onComplete?.(jobId);
          }

          // Job com erro
          else if (job.status === 'erro') {
            playNotificationSound();
            toast({
              title: '❌ Erro na Importação',
              description: job.erro_mensagem || 'Erro desconhecido',
              variant: 'destructive',
              duration: 7000,
            });
            settings.onError?.(jobId, job.erro_mensagem);
          }

          // Job cancelado
          else if (job.status === 'cancelado') {
            playNotificationSound();
            toast({
              title: '🛑 Importação Cancelada',
              description: job.cancellation_reason || 'Cancelado pelo usuário',
              duration: 5000,
            });
            settings.onCancelled?.(jobId);
          }

          // Job travado (detectado por falta de atualização há mais de 5 minutos)
          else if (job.status === 'processando') {
            const lastUpdate = new Date(job.atualizado_em);
            const now = new Date();
            const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 60000;

            if (minutesSinceUpdate > 5) {
              const stalledKey = `${jobId}-stalled`;
              if (!notifiedJobsRef.current.has(stalledKey)) {
                notifiedJobsRef.current.add(stalledKey);
                playNotificationSound();
                toast({
                  title: '⚠️ Importação Travada',
                  description: `${job.tipo_dicionario} sem atualização há ${Math.round(minutesSinceUpdate)} minutos`,
                  variant: 'default',
                  duration: 7000,
                });
                settings.onStalled?.(jobId);
              }
            }
          }

          // Invalidar queries para atualizar UI
          queryClient.invalidateQueries({ queryKey: ['dictionary-import-jobs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      notifiedJobsRef.current.clear();
    };
  }, [settings.enabled, settings.soundEnabled, queryClient]);

  return {
    clearNotifications: () => notifiedJobsRef.current.clear()
  };
}
