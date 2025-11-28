import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Componente invisível que escuta eventos globais de batch seeding
 * e exibe notificações independente da página atual
 */
export function BatchSeedingNotificationListener() {
  useEffect(() => {
    console.log('[BatchSeedingNotificationListener] Iniciando listener global...');
    
    const channel = supabase
      .channel('batch-seeding-global')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'batch_seeding_jobs'
      }, (payload) => {
        const job = payload.new as any;
        console.log('[BatchSeedingNotificationListener] Evento recebido:', job.status);
        
        if (job.status === 'concluido') {
          toast.success(`🎉 Batch seeding concluído: ${job.processed_words} palavras classificadas!`, {
            duration: 5000,
            description: `Morfológico: ${job.morfologico_count}, Herança: ${job.heranca_count}, Gemini: ${job.gemini_count}`
          });
        } else if (job.status === 'erro') {
          toast.error(`❌ Batch seeding falhou: ${job.erro_mensagem || 'Erro desconhecido'}`, {
            duration: 5000
          });
        }
      })
      .subscribe();

    return () => {
      console.log('[BatchSeedingNotificationListener] Removendo listener global...');
      supabase.removeChannel(channel);
    };
  }, []);

  return null; // Componente invisível
}
