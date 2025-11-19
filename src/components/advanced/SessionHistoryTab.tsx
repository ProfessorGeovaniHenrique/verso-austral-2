import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Download, Trash2, RotateCcw, Database } from 'lucide-react';
import { listUserSessions, deleteCloudSession, CloudSession } from '@/services/enrichmentPersistence';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { notifications } from '@/lib/notifications';
import { useAuth } from '@/hooks/useAuth';

interface SessionHistoryTabProps {
  onRestore: (sessionId: string) => void;
}

export function SessionHistoryTab({ onRestore }: SessionHistoryTabProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CloudSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await listUserSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      notifications.error('Erro', 'Falha ao carregar histórico de sessões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta sessão? Esta ação não pode ser desfeita.')) {
      return;
    }

    const success = await deleteCloudSession(sessionId);
    if (success) {
      notifications.success('Sessão deletada', 'Sessão removida do histórico');
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } else {
      notifications.error('Erro', 'Falha ao deletar sessão');
    }
  };

  const handleRestore = (sessionId: string) => {
    onRestore(sessionId);
    notifications.success('Sessão restaurada', 'Dados carregados com sucesso');
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Faça login para ver o histórico de sessões</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p>Carregando histórico...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma sessão salva encontrada</p>
            <p className="text-sm mt-2">Inicie um enriquecimento para criar sua primeira sessão</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Histórico de Sessões
        </CardTitle>
        <CardDescription>
          {sessions.length} sessão(ões) salva(s) na nuvem
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {session.corpus_type === 'gaucho' ? 'Gaúcho' : 'Nordestino'}
                        </Badge>
                        {session.completed_at && (
                          <Badge variant="default" className="bg-green-600">
                            Concluída
                          </Badge>
                        )}
                      </div>

                      {session.session_name && (
                        <h4 className="font-semibold">{session.session_name}</h4>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          Última atualização:{' '}
                          {formatDistanceToNow(new Date(session.last_saved_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Total</div>
                          <div className="font-semibold">{session.total_songs}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Processadas</div>
                          <div className="font-semibold">{session.processed_songs}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Validadas</div>
                          <div className="font-semibold text-green-600">
                            {session.validated_songs}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Rejeitadas</div>
                          <div className="font-semibold text-red-600">
                            {session.rejected_songs}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-semibold">
                            {session.progress_percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${session.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(session.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restaurar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(session.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Deletar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
