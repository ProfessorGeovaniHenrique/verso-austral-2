/**
 * Hook para sincronizar Construction Log estático com banco de dados
 * Sprint 2 - Integração Backend Completa
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { constructionLog, ConstructionPhase } from '@/data/developer-logs/construction-log';
import { toast } from 'sonner';

export interface SyncResult {
  success: boolean;
  phasesCreated: number;
  phasesUpdated: number;
  phasesSkipped: number;
  errors: string[];
}

export function useConstructionLogSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const syncToDatabase = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    const result: SyncResult = {
      success: false,
      phasesCreated: 0,
      phasesUpdated: 0,
      phasesSkipped: 0,
      errors: []
    };

    try {
      // Get existing phases from database
      const { data: existingPhases, error: fetchError } = await supabase
        .from('construction_phases')
        .select('phase_name, phase_number');
      
      if (fetchError) throw fetchError;

      const existingNames = new Set(existingPhases?.map(p => p.phase_name) || []);

      for (let i = 0; i < constructionLog.length; i++) {
        const phase = constructionLog[i];
        const phaseNumber = i + 1;

        try {
          const phaseData = {
            phase_number: phaseNumber,
            phase_name: phase.phase,
            date_start: phase.dateStart,
            date_end: phase.dateEnd || null,
            status: phase.status,
            objective: phase.objective,
            decisions: JSON.parse(JSON.stringify(phase.decisions || [])),
            artifacts: JSON.parse(JSON.stringify(phase.artifacts || [])),
            metrics: JSON.parse(JSON.stringify(phase.metrics || {})),
            scientific_basis: JSON.parse(JSON.stringify(phase.scientificBasis || [])),
            challenges: JSON.parse(JSON.stringify(phase.challenges || [])),
            next_steps: JSON.parse(JSON.stringify(phase.nextSteps || [])),
            is_synced_to_static: true
          };

          if (existingNames.has(phase.phase)) {
            // Update existing phase
            const { error: updateError } = await supabase
              .from('construction_phases')
              .update(phaseData)
              .eq('phase_name', phase.phase);
            
            if (updateError) {
              result.errors.push(`Erro ao atualizar "${phase.phase}": ${updateError.message}`);
            } else {
              result.phasesUpdated++;
            }
          } else {
            // Create new phase
            const { error: insertError } = await supabase
              .from('construction_phases')
              .insert(phaseData);
            
            if (insertError) {
              result.errors.push(`Erro ao criar "${phase.phase}": ${insertError.message}`);
            } else {
              result.phasesCreated++;
            }
          }
        } catch (err: any) {
          result.errors.push(`Erro em "${phase.phase}": ${err.message}`);
        }
      }

      result.success = result.errors.length === 0;
      setLastSyncResult(result);

      if (result.success) {
        toast.success(`Sincronização concluída: ${result.phasesCreated} criadas, ${result.phasesUpdated} atualizadas`);
      } else {
        toast.warning(`Sincronização parcial: ${result.errors.length} erros`);
      }

      return result;
    } catch (error: any) {
      result.errors.push(`Erro geral: ${error.message}`);
      setLastSyncResult(result);
      toast.error('Erro na sincronização');
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const exportToTypeScript = useCallback(async () => {
    try {
      // Fetch all phases from database
      const { data: phases, error } = await supabase
        .from('construction_phases')
        .select(`
          *,
          technical_decisions(*),
          phase_metrics(*)
        `)
        .order('phase_number', { ascending: true });
      
      if (error) throw error;

      // Generate TypeScript content
      const tsContent = `// Exportado automaticamente do banco de dados
// Gerado em: ${new Date().toISOString()}

import type { ConstructionPhase, TechnicalDecision, Artifact, Metrics, ScientificReference } from './construction-log';

export const exportedConstructionLog: ConstructionPhase[] = ${JSON.stringify(
        phases?.map(p => ({
          phase: p.phase_name,
          dateStart: p.date_start,
          dateEnd: p.date_end,
          status: p.status,
          objective: p.objective,
          decisions: p.decisions || [],
          artifacts: p.artifacts || [],
          metrics: p.metrics || {},
          scientificBasis: p.scientific_basis || [],
          challenges: p.challenges || [],
          nextSteps: p.next_steps || []
        })) || [],
        null,
        2
      )};

export default exportedConstructionLog;
`;

      // Download file
      const blob = new Blob([tsContent], { type: 'text/typescript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `construction-log-export-${new Date().toISOString().split('T')[0]}.ts`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Arquivo TypeScript exportado!');
    } catch (error: any) {
      toast.error(`Erro ao exportar: ${error.message}`);
    }
  }, []);

  return {
    isSyncing,
    lastSyncResult,
    syncToDatabase,
    exportToTypeScript,
    staticPhasesCount: constructionLog.length
  };
}
