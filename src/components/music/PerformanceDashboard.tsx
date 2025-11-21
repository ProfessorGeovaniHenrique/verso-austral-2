import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCard } from './StatsCard';
import { Clock, TrendingUp, Zap, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceDashboardProps {
  averageProcessingTime: number; // em segundos
  successRate: number; // 0-100
  apiUsageStats: {
    youtube: number;
    gemini: number;
  };
  processingHistory: Array<{
    timestamp: string;
    count: number;
    avgTime: number;
  }>;
}

export function PerformanceDashboard({
  averageProcessingTime,
  successRate,
  apiUsageStats,
  processingHistory,
}: PerformanceDashboardProps) {
  const totalAPICalls = apiUsageStats.youtube + apiUsageStats.gemini;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Tempo Médio"
          value={formatTime(averageProcessingTime)}
          subtitle="Por música"
          icon={Clock}
        />
        
        <StatsCard
          title="Taxa de Sucesso"
          value={`${Math.round(successRate)}%`}
          subtitle="Enriquecimentos bem-sucedidos"
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
        />
        
        <StatsCard
          title="Total de APIs"
          value={totalAPICalls}
          subtitle="Chamadas realizadas"
          icon={Zap}
        />
        
        <StatsCard
          title="Eficiência"
          value={`${Math.round((successRate * 100) / (averageProcessingTime || 1))}%`}
          subtitle="Score composto"
          icon={Activity}
        />
      </div>

      {/* API Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Uso de APIs</CardTitle>
          <CardDescription>Distribuição de chamadas por serviço</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(apiUsageStats).map(([api, count]) => {
              const percentage = totalAPICalls > 0 ? (count / totalAPICalls) * 100 : 0;
              const labels: Record<string, string> = {
                youtube: 'YouTube Data API',
                gemini: 'Google Gemini',
              };
              
              return (
                <div key={api} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{labels[api]}</span>
                    <span className="text-muted-foreground">
                      {count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Processing History Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Processamento</CardTitle>
          <CardDescription>Músicas processadas ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processingHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="timestamp" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Músicas"
                />
                <Line
                  type="monotone"
                  dataKey="avgTime"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Tempo Médio (s)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
