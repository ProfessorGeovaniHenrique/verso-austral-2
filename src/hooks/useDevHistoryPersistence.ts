import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ConstructionPhase } from "@/data/developer-logs";

interface DevHistoryOverride {
  id: string;
  phase_id: string;
  field_path: string;
  original_value: string | null;
  override_value: string;
  edited_by: string | null;
  edited_at: string;
  version: number;
  active: boolean;
}

interface OverrideMap {
  [phaseId: string]: {
    [fieldPath: string]: DevHistoryOverride;
  };
}

export function useDevHistoryPersistence() {
  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOverrides();
  }, []);

  const loadOverrides = async () => {
    try {
      const { data, error } = await supabase
        .from('dev_history_overrides')
        .select('*')
        .eq('active', true)
        .order('edited_at', { ascending: false });

      if (error) throw error;

      const overrideMap: OverrideMap = {};
      data?.forEach((override) => {
        if (!overrideMap[override.phase_id]) {
          overrideMap[override.phase_id] = {};
        }
        overrideMap[override.phase_id][override.field_path] = override as DevHistoryOverride;
      });

      setOverrides(overrideMap);
    } catch (error) {
      console.error('Erro ao carregar overrides:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveOverride = async (
    phaseId: string,
    fieldPath: string,
    originalValue: string,
    newValue: string
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('dev_history_overrides')
        .upsert({
          phase_id: phaseId,
          field_path: fieldPath,
          original_value: originalValue,
          override_value: newValue,
          edited_by: userData.user?.id,
          active: true
        }, {
          onConflict: 'phase_id,field_path'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setOverrides((prev) => ({
        ...prev,
        [phaseId]: {
          ...prev[phaseId],
          [fieldPath]: data as DevHistoryOverride
        }
      }));

      toast({
        title: "Salvo com sucesso",
        description: "A alteração foi salva e sincronizada."
      });

      return data;
    } catch (error) {
      console.error('Erro ao salvar override:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a alteração.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const restoreOriginal = async (phaseId: string, fieldPath: string) => {
    try {
      const { error } = await supabase
        .from('dev_history_overrides')
        .update({ active: false })
        .eq('phase_id', phaseId)
        .eq('field_path', fieldPath);

      if (error) throw error;

      // Update local state
      setOverrides((prev) => {
        const newOverrides = { ...prev };
        if (newOverrides[phaseId]) {
          delete newOverrides[phaseId][fieldPath];
        }
        return newOverrides;
      });

      toast({
        title: "Restaurado",
        description: "O texto original foi restaurado."
      });
    } catch (error) {
      console.error('Erro ao restaurar original:', error);
      toast({
        title: "Erro ao restaurar",
        description: "Não foi possível restaurar o texto original.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const mergePhaseWithOverrides = (phase: ConstructionPhase): ConstructionPhase => {
    const phaseId = generatePhaseId(phase.phase);
    const phaseOverrides = overrides[phaseId] || {};

    const mergedPhase = { ...phase };

    // Apply overrides
    Object.entries(phaseOverrides).forEach(([fieldPath, override]) => {
      const keys = fieldPath.split('.');
      let current: any = mergedPhase;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = override.override_value;
    });

    return mergedPhase;
  };

  const hasOverride = (phaseId: string, fieldPath: string): boolean => {
    return !!(overrides[phaseId]?.[fieldPath]);
  };

  const getOverride = (phaseId: string, fieldPath: string): DevHistoryOverride | null => {
    return overrides[phaseId]?.[fieldPath] || null;
  };

  return {
    overrides,
    isLoading,
    saveOverride,
    restoreOriginal,
    mergePhaseWithOverrides,
    hasOverride,
    getOverride,
    reloadOverrides: loadOverrides
  };
}

// Helper function to generate consistent phase IDs
function generatePhaseId(phaseName: string): string {
  return phaseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
