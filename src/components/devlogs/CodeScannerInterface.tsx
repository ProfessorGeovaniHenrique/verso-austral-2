import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCodeScanHistory } from "@/hooks/useCodeScanHistory";
import { useState } from "react";
import { 
  Bug, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  TrendingDown,
  FileCode,
  Zap,
  Activity
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function CodeScannerInterface() {
  const { scans, isLoading, isScanning, runScan, latestScan, stats } = useCodeScanHistory();
  const [scanType, setScanType] = useState<'full' | 'edge-functions' | 'components' | 'hooks'>('full');

  const handleRunScan = () => {
    runScan(scanType);
  };

  const getSeverityColor = (severidade: string) => {
    switch (severidade) {
      case 'crítica': return 'bg-red-500';
      case 'alta': return 'bg-orange-500';
      case 'média': return 'bg-yellow-500';
      case 'baixa': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const chartData = scans.slice(0, 10).reverse().map(scan => ({
    date: new Date(scan.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    melhoria: scan.improvement_percentage,
    total: scan.total_issues,
    resolvidos: scan.resolved_issues,
    novos: scan.new_issues
  }));

  return (
    <div className="space-y-6">
      {/* Header e Controles */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                🔍 Scanner de Código Real-Time
              </CardTitle>
              <CardDescription>
                Análise automatizada do codebase com comparação temporal
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={scanType} onValueChange={(value: any) => setScanType(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">
                    <span className="flex items-center gap-2">
                      <FileCode className="w-4 h-4" />
                      Scan Completo
                    </span>
                  </SelectItem>
                  <SelectItem value="edge-functions">
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Edge Functions
                    </span>
                  </SelectItem>
                  <SelectItem value="components">
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Componentes
                    </span>
                  </SelectItem>
                  <SelectItem value="hooks">
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Hooks
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleRunScan}
                disabled={isScanning}
                size="lg"
                className="gap-2"
              >
                {isScanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Escaneando...
                  </>
                ) : (
                  <>
                    <Bug className="w-4 h-4" />
                    Executar Scan
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isScanning && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Analisando código...</span>
                <span className="text-primary font-mono">Aguarde</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Stats Cards */}
      {stats.totalScans > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Scans</CardDescription>
              <CardTitle className="text-3xl">{stats.totalScans}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Melhoria Média</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {stats.averageImprovement > 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-500" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-500" />
                )}
                {Math.abs(stats.averageImprovement).toFixed(1)}%
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Último Scan</CardDescription>
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {stats.lastScanDate 
                  ? formatDistanceToNow(new Date(stats.lastScanDate), { addSuffix: true, locale: ptBR })
                  : 'Nunca'
                }
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Tendência</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {stats.trending > 0 ? (
                  <>
                    <TrendingUp className="w-6 h-6 text-green-500" />
                    +{stats.trending.toFixed(1)}%
                  </>
                ) : stats.trending < 0 ? (
                  <>
                    <TrendingDown className="w-6 h-6 text-red-500" />
                    {stats.trending.toFixed(1)}%
                  </>
                ) : (
                  <>
                    <Activity className="w-6 h-6 text-gray-500" />
                    0%
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Gráfico de Evolução */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📈 Evolução Temporal</CardTitle>
            <CardDescription>Histórico de melhoria ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="melhoria" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3}
                  name="Melhoria %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Resultados do Último Scan */}
      {latestScan && (
        <Card>
          <CardHeader>
            <CardTitle>Último Scan - {new Date(latestScan.created_at).toLocaleString('pt-BR')}</CardTitle>
            <CardDescription>
              {latestScan.files_analyzed} arquivos analisados em {(latestScan.scan_duration_ms / 1000).toFixed(2)}s
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="resolved" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="resolved" className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Resolvidos ({latestScan.resolved_issues})
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Novos ({latestScan.new_issues})
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Pendentes ({latestScan.pending_issues})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resolved" className="space-y-3 mt-4">
                {latestScan.scan_data.comparison.resolved.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum bug resolvido desde o último baseline
                  </p>
                ) : (
                  latestScan.scan_data.comparison.resolved.map((bug: any) => (
                    <Card key={bug.id} className="border-green-500/20 bg-green-500/5">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-green-500/20 text-green-700 border-green-500/30">
                                {bug.id}
                              </Badge>
                              <Badge className={getSeverityColor(bug.severidade)}>
                                {bug.severidade}
                              </Badge>
                              <Badge variant="secondary">{bug.categoria}</Badge>
                            </div>
                            <h4 className="font-medium">{bug.componente}</h4>
                            <p className="text-sm text-muted-foreground">{bug.descrição}</p>
                            <p className="text-xs text-muted-foreground font-mono">{bug.arquivo}</p>
                          </div>
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="new" className="space-y-3 mt-4">
                {latestScan.scan_data.comparison.new.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    ✅ Nenhum novo bug detectado
                  </p>
                ) : (
                  latestScan.scan_data.comparison.new.map((bug: any) => (
                    <Card key={bug.id} className="border-red-500/20 bg-red-500/5">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-red-500/20 text-red-700 border-red-500/30">
                                {bug.id}
                              </Badge>
                              <Badge className={getSeverityColor(bug.severidade)}>
                                {bug.severidade}
                              </Badge>
                              <Badge variant="secondary">{bug.categoria}</Badge>
                            </div>
                            <h4 className="font-medium">{bug.componente}</h4>
                            <p className="text-sm text-muted-foreground">{bug.descrição}</p>
                            <p className="text-xs text-muted-foreground font-mono">{bug.arquivo}</p>
                          </div>
                          <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="pending" className="space-y-3 mt-4">
                {latestScan.scan_data.comparison.pending.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    ✅ Nenhum bug pendente
                  </p>
                ) : (
                  latestScan.scan_data.comparison.pending.map((bug: any) => (
                    <Card key={bug.id} className="border-yellow-500/20 bg-yellow-500/5">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                                {bug.id}
                              </Badge>
                              <Badge className={getSeverityColor(bug.severidade)}>
                                {bug.severidade}
                              </Badge>
                              <Badge variant="secondary">{bug.categoria}</Badge>
                            </div>
                            <h4 className="font-medium">{bug.componente}</h4>
                            <p className="text-sm text-muted-foreground">{bug.descrição}</p>
                            <p className="text-xs text-muted-foreground font-mono">{bug.arquivo}</p>
                          </div>
                          <Clock className="w-6 h-6 text-yellow-500" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-muted-foreground">Carregando histórico de scans...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && scans.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <Bug className="w-12 h-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Nenhum scan realizado ainda</h3>
                <p className="text-muted-foreground">Execute seu primeiro scan para começar o monitoramento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
