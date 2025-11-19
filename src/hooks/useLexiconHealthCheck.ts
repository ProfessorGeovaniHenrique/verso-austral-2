import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HealthIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  autofix?: () => Promise<void>;
  autofixLabel?: string;
}

export function useLexiconHealthCheck() {
  const [issues, setIssues] = useState<HealthIssue[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runHealthCheck = async () => {
    setIsChecking(true);
    const foundIssues: HealthIssue[] = [];

    try {
      // Check Dialectal Volume II
      const { data: dialectalData } = await supabase
        .from('dialectal_lexicon')
        .select('volume_fonte');

      const volumeII = dialectalData?.filter(d => d.volume_fonte === 'II') || [];
      const volumeI = dialectalData?.filter(d => d.volume_fonte === 'I') || [];

      if (volumeII.length === 0) {
        foundIssues.push({
          id: 'dialectal-volume-ii-missing',
          severity: 'critical',
          title: 'Volume II do Dialectal não importado',
          description: `O Volume II do Dicionário Dialectal tem 0 verbetes. A importação falhou completamente. Você tem ${volumeI.length} verbetes do Volume I, mas está perdendo ~50% dos dados.`,
          autofix: async () => {
            // Trigger reimport (implementation depends on your import flow)
            window.location.href = '/admin/lexicon-setup?action=reimport-volume-ii';
          },
          autofixLabel: 'Reimportar Volume II'
        });
      }

      // Check Gutenberg completion
      const { count: gutenbergCount } = await supabase
        .from('gutenberg_lexicon')
        .select('*', { count: 'exact', head: true });

      if ((gutenbergCount || 0) < 10000) {
        foundIssues.push({
          id: 'gutenberg-never-imported',
          severity: 'critical',
          title: 'Gutenberg nunca foi importado completamente',
          description: `O dicionário Gutenberg tem apenas ${gutenbergCount} verbetes. Esperado: ~700.000. A importação completa nunca foi executada. Este é o recurso lexicográfico mais importante do sistema.`,
          autofix: async () => {
            window.location.href = '/admin/lexicon-setup?action=start-gutenberg';
          },
          autofixLabel: 'Iniciar Importação Completa'
        });
      } else if ((gutenbergCount || 0) < 500000) {
        foundIssues.push({
          id: 'gutenberg-incomplete',
          severity: 'warning',
          title: 'Importação do Gutenberg incompleta',
          description: `O dicionário Gutenberg tem ${gutenbergCount} verbetes. Ainda faltam ~${700000 - (gutenbergCount || 0)} verbetes. A importação pode ter sido interrompida.`,
          autofix: async () => {
            window.location.href = '/admin/lexicon-setup?action=resume-gutenberg';
          },
          autofixLabel: 'Retomar Importação'
        });
      }

      // Check average confidence
      const { data: dialectalConfidence } = await supabase
        .from('dialectal_lexicon')
        .select('confianca_extracao');

      const avgConfidence = dialectalConfidence?.reduce((acc, d) => acc + (d.confianca_extracao || 0), 0) / (dialectalConfidence?.length || 1);

      if (avgConfidence < 0.70) {
        foundIssues.push({
          id: 'low-confidence',
          severity: 'warning',
          title: 'Confiança média baixa no Dialectal',
          description: `A confiança média de extração está em ${(avgConfidence * 100).toFixed(1)}%. Valores abaixo de 70% indicam problemas no parsing dos verbetes. Recomendamos revisar manualmente os verbetes com baixa confiança.`,
        });
      }

      // Check for stuck jobs
      const { data: stuckJobs } = await supabase
        .from('dictionary_import_jobs')
        .select('*')
        .eq('status', 'processando')
        .lt('tempo_inicio', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()); // 2 hours ago

      if (stuckJobs && stuckJobs.length > 0) {
        foundIssues.push({
          id: 'stuck-jobs',
          severity: 'warning',
          title: 'Jobs de importação travados',
          description: `Existem ${stuckJobs.length} jobs em estado "processando" há mais de 2 horas. Provavelmente ocorreu timeout. Esses jobs precisam ser marcados como "erro" e reexecutados.`,
          autofix: async () => {
            for (const job of stuckJobs) {
              await supabase
                .from('dictionary_import_jobs')
                .update({ status: 'erro', erro_mensagem: 'Timeout detectado - marcado para retry' })
                .eq('id', job.id);
            }
          },
          autofixLabel: 'Marcar como Erro e Permitir Retry'
        });
      }

      // Check for validation status
      const { data: validationData } = await supabase
        .from('dialectal_lexicon')
        .select('validado_humanamente');

      const validatedCount = validationData?.filter(d => d.validado_humanamente).length || 0;

      if (validatedCount === 0 && (dialectalData?.length || 0) > 0) {
        foundIssues.push({
          id: 'no-validation',
          severity: 'info',
          title: 'Nenhum verbete validado humanamente',
          description: `Você tem ${dialectalData?.length} verbetes no sistema, mas nenhum foi validado humanamente. Recomendamos validar ao menos uma amostra representativa para garantir qualidade.`,
        });
      }

      setIssues(foundIssues);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Erro no health check:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runHealthCheck();

    // Auto-refresh every 5 minutes
    const interval = setInterval(runHealthCheck, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    issues,
    isChecking,
    lastCheck,
    refresh: runHealthCheck,
  };
}
