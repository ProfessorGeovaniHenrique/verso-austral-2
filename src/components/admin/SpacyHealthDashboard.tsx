import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HealthCheck {
  id: string;
  checked_at: string;
  status: string;
  response_time_ms: number | null;
  error_message: string | null;
}

export const SpacyHealthDashboard = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  const fetchHealthChecks = async () => {
    try {
      const { data, error } = await supabase
        .from('spacy_api_health')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHealthChecks(data || []);
    } catch (error) {
      console.error('Erro ao buscar health checks:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar histórico de health checks',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const response = await supabase.functions.invoke('annotate-pos?health=true', {
        method: 'GET'
      });

      if (response.error) throw response.error;

      toast({
        title: 'Health Check Concluído',
        description: 'API spaCy está operacional',
      });

      fetchHealthChecks();
    } catch (error) {
      console.error('Erro no health check:', error);
      toast({
        title: 'Erro',
        description: 'Health check falhou',
        variant: 'destructive'
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchHealthChecks();
  }, []);

  const latestCheck = healthChecks[0];
  const avgResponseTime = healthChecks.length > 0
    ? Math.round(
        healthChecks
          .filter(h => h.response_time_ms !== null)
          .reduce((sum, h) => sum + (h.response_time_ms || 0), 0) / healthChecks.length
      )
    : 0;

  const healthyCount = healthChecks.filter(h => h.status === 'healthy').length;
  const uptime = healthChecks.length > 0 ? (healthyCount / healthChecks.length) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            🐍 Status da API spaCy
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runHealthCheck}
            disabled={checking}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Verificando...' : 'Verificar Agora'}
          </Button>
        </CardHeader>
        <CardContent>
          {latestCheck ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {latestCheck.status === 'healthy' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <Badge variant={latestCheck.status === 'healthy' ? 'default' : 'destructive'}>
                    {latestCheck.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(latestCheck.checked_at).toLocaleString('pt-BR')}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Uptime</div>
                  <div className="text-2xl font-bold">{uptime.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Latência Média</div>
                  <div className="text-2xl font-bold">{avgResponseTime}ms</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Checks</div>
                  <div className="text-2xl font-bold">{healthChecks.length}</div>
                </div>
              </div>

              {latestCheck.error_message && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {latestCheck.error_message}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              Nenhum health check registrado ainda.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Histórico Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {healthChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-center justify-between text-xs border-b pb-2"
              >
                <div className="flex items-center gap-2">
                  {check.status === 'healthy' ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-muted-foreground">
                    {new Date(check.checked_at).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {check.response_time_ms && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {check.response_time_ms}ms
                    </div>
                  )}
                  <Badge
                    variant={check.status === 'healthy' ? 'outline' : 'destructive'}
                    className="text-xs"
                  >
                    {check.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
