import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

interface DictionaryStatusCardProps {
  nome: string;
  status: 'healthy' | 'warning' | 'critical';
  metricas: {
    total: number;
    validados: number;
    confianca: number;
    ultimaImportacao?: Date;
  };
  acoes?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'destructive';
  }>;
}

export function DictionaryStatusCard({ nome, status, metricas, acoes }: DictionaryStatusCardProps) {
  const statusConfig = {
    healthy: { color: 'bg-green-500', icon: CheckCircle2, text: 'Saudável' },
    warning: { color: 'bg-yellow-500', icon: AlertCircle, text: 'Atenção' },
    critical: { color: 'bg-red-500', icon: AlertCircle, text: 'Crítico' },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          {nome}
        </CardTitle>
        <Badge variant={status === 'healthy' ? 'default' : 'destructive'} className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {config.text}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{metricas.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Validados:</span>
            <span className="font-semibold">{metricas.validados.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Confiança:</span>
            <span className="font-semibold flex items-center gap-1">
              {(metricas.confianca * 100).toFixed(1)}%
              <TrendingUp className="h-3 w-3" />
            </span>
          </div>
          {metricas.ultimaImportacao && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Última import:</span>
              <span className="text-xs">{metricas.ultimaImportacao.toLocaleDateString()}</span>
            </div>
          )}
        </div>
        {acoes && acoes.length > 0 && (
          <div className="flex gap-2 mt-4">
            {acoes.map((acao, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={acao.variant || 'outline'}
                onClick={acao.onClick}
                className="flex-1"
              >
                {acao.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
