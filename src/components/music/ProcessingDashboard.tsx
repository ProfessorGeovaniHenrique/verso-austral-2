import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCard } from './StatsCard';
import { Upload, Music, AlertCircle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ProcessingDashboardProps {
  totalUploads: number;
  totalProcessed: number;
  totalErrors: number;
  successfulEnrichments: number;
  dailyStats: Array<{
    date: string;
    processed: number;
    errors: number;
  }>;
}

export function ProcessingDashboard({
  totalUploads,
  totalProcessed,
  totalErrors,
  successfulEnrichments,
  dailyStats,
}: ProcessingDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Uploads Realizados"
          value={totalUploads}
          subtitle="Arquivos enviados"
          icon={Upload}
        />
        
        <StatsCard
          title="Músicas Processadas"
          value={totalProcessed}
          subtitle="Total de registros"
          icon={Music}
        />
        
        <StatsCard
          title="Enriquecimentos OK"
          value={successfulEnrichments}
          subtitle="Metadados completos"
          icon={CheckCircle}
        />
        
        <StatsCard
          title="Erros"
          value={totalErrors}
          subtitle="Falhas no processamento"
          icon={AlertCircle}
        />
      </div>

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Diária</CardTitle>
          <CardDescription>Músicas processadas por dia (últimos 7 dias)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="processed"
                  fill="hsl(var(--primary))"
                  name="Processadas"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="errors"
                  fill="hsl(var(--destructive))"
                  name="Erros"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Processing Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Sucesso</CardTitle>
          <CardDescription>Proporção de enriquecimentos bem-sucedidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sucessos</span>
              <span className="text-2xl font-bold text-green-500">
                {totalProcessed > 0
                  ? Math.round((successfulEnrichments / totalProcessed) * 100)
                  : 0}%
              </span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${
                    totalProcessed > 0
                      ? (successfulEnrichments / totalProcessed) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{successfulEnrichments} enriquecidos</span>
              <span>{totalErrors} falhas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
