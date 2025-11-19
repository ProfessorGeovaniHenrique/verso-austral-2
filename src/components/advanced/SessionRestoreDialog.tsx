import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Database, HardDrive } from 'lucide-react';
import { EnrichmentSession } from '@/lib/enrichmentSchemas';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SessionRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localSession: EnrichmentSession | null;
  cloudSession: EnrichmentSession | null;
  onRestore: (source: 'local' | 'cloud') => void;
  onDiscard: () => void;
}

export function SessionRestoreDialog({
  open,
  onOpenChange,
  localSession,
  cloudSession,
  onRestore,
  onDiscard,
}: SessionRestoreDialogProps) {
  const [selectedSource, setSelectedSource] = useState<'local' | 'cloud' | null>(null);

  const handleRestore = () => {
    if (selectedSource) {
      onRestore(selectedSource);
      onOpenChange(false);
    }
  };

  const handleDiscard = () => {
    onDiscard();
    onOpenChange(false);
  };

  const renderSessionCard = (
    session: EnrichmentSession | null,
    source: 'local' | 'cloud',
    icon: React.ReactNode,
    title: string
  ) => {
    if (!session) return null;

    const isSelected = selectedSource === source;

    return (
      <div
        className={`p-4 border rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'border-primary bg-primary/5 ring-2 ring-primary'
            : 'border-border hover:border-primary/50'
        }`}
        onClick={() => setSelectedSource(source)}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {icon}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{title}</h4>
              <Badge variant={isSelected ? 'default' : 'outline'}>
                {session.corpusType === 'gaucho' ? 'Gaúcho' : 'Nordestino'}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>
                  Salvo {formatDistanceToNow(new Date(session.lastSavedAt), { addSuffix: true, locale: ptBR })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-1 font-medium">{session.metrics.totalSongs}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Processadas:</span>
                  <span className="ml-1 font-medium">
                    {session.metrics.enrichedSongs + session.metrics.validatedSongs + session.metrics.rejectedSongs}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Validadas:</span>
                  <span className="ml-1 font-medium text-green-600">{session.metrics.validatedSongs}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rejeitadas:</span>
                  <span className="ml-1 font-medium text-red-600">{session.metrics.rejectedSongs}</span>
                </div>
              </div>

              <div className="mt-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        ((session.metrics.enrichedSongs +
                          session.metrics.validatedSongs +
                          session.metrics.rejectedSongs) /
                          session.metrics.totalSongs) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Sessão Anterior Detectada
          </DialogTitle>
          <DialogDescription>
            Encontramos uma sessão de enriquecimento não concluída. Deseja restaurá-la?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {renderSessionCard(
            localSession,
            'local',
            <HardDrive className="h-4 w-4" />,
            'Sessão Local (Navegador)'
          )}

          {renderSessionCard(
            cloudSession,
            'cloud',
            <Database className="h-4 w-4" />,
            'Sessão na Nuvem (Supabase)'
          )}
        </div>

        {localSession && cloudSession && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Dica:</strong> A sessão mais recente é automaticamente selecionada. Ambas contêm
              seu progresso, escolha a que preferir restaurar.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDiscard}>
            Descartar e Começar Nova
          </Button>
          <Button onClick={handleRestore} disabled={!selectedSource}>
            Restaurar Sessão Selecionada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
