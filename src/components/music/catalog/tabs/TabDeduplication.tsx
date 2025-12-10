/**
 * Tab de Deduplicação do MusicCatalog
 * Sprint F2.1 - Refatoração
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { DuplicateMonitoringCard } from '@/components/admin/DuplicateMonitoringCard';
import { AlertCircle } from 'lucide-react';

export function TabDeduplication() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Deduplicação de Músicas</h2>
        <p className="text-muted-foreground">
          Identifique e consolide registros duplicados preservando todos os metadados
        </p>
      </div>
      
      <DuplicateMonitoringCard />
      
      <Alert className="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20">
        <AlertCircle className="h-4 w-4 text-purple-500" />
        <AlertDescription>
          <strong>Como funciona:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>O sistema identifica músicas com mesmo título e artista</li>
            <li>Consolida em um único registro preservando metadados</li>
            <li>Múltiplos álbuns/releases são armazenados em JSONB</li>
            <li>Constraint UNIQUE previne novas duplicatas</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
