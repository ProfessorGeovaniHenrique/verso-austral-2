import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, DollarSign, Zap, AlertCircle } from "lucide-react";
import { StatsCard } from "@/components/music/StatsCard";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

// Preços por 1M tokens (Gemini 1.5 Flash)
const PRICE_PER_M_INPUT = 0.075; // $0.075 por 1M tokens input
const PRICE_PER_M_OUTPUT = 0.30; // $0.30 por 1M tokens output

export default function ApiUsage() {
  const { data: usageData, isLoading } = useQuery({
    queryKey: ["gemini-api-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gemini_api_usage")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Métricas gerais
  const totalCalls = usageData?.length || 0;
  const successfulCalls = usageData?.filter(u => u.success).length || 0;
  const failedCalls = totalCalls - successfulCalls;
  const successRate = totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(1) : 0;

  const totalInputTokens = usageData?.reduce((sum, u) => sum + (u.tokens_input || 0), 0) || 0;
  const totalOutputTokens = usageData?.reduce((sum, u) => sum + (u.tokens_output || 0), 0) || 0;
  const totalTokens = totalInputTokens + totalOutputTokens;

  // Custo estimado
  const inputCost = (totalInputTokens / 1_000_000) * PRICE_PER_M_INPUT;
  const outputCost = (totalOutputTokens / 1_000_000) * PRICE_PER_M_OUTPUT;
  const totalCost = inputCost + outputCost;

  // Calcular economia com cache
  const cacheHits = usageData?.filter(u => u.request_type === 'enrich_song_cache_hit').length || 0;
  const apiCalls = usageData?.filter(u => u.request_type === 'enrich_song').length || 0;
  const cacheHitRate = totalCalls > 0 ? ((cacheHits / totalCalls) * 100).toFixed(1) : 0;
  
  // Estimativa de tokens economizados (média de ~150 tokens por chamada)
  const avgTokensPerCall = apiCalls > 0 ? totalTokens / apiCalls : 150;
  const tokensSaved = cacheHits * avgTokensPerCall;
  const costSaved = (tokensSaved / 1_000_000) * ((PRICE_PER_M_INPUT + PRICE_PER_M_OUTPUT) / 2);

  // Dados por dia (últimos 7 dias)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 6 - i));
    return {
      date,
      dateStr: format(date, "dd/MM", { locale: ptBR }),
      calls: 0,
      tokens: 0,
      cost: 0,
    };
  });

  usageData?.forEach(usage => {
    const usageDate = startOfDay(new Date(usage.created_at));
    const dayData = last7Days.find(d => d.date.getTime() === usageDate.getTime());
    
    if (dayData) {
      dayData.calls += 1;
      dayData.tokens += (usage.tokens_input || 0) + (usage.tokens_output || 0);
      dayData.cost += ((usage.tokens_input || 0) / 1_000_000) * PRICE_PER_M_INPUT + 
                      ((usage.tokens_output || 0) / 1_000_000) * PRICE_PER_M_OUTPUT;
    }
  });

  // Dados por tipo de requisição
  const requestTypes = usageData?.reduce((acc, u) => {
    const type = u.request_type || "unknown";
    if (!acc[type]) acc[type] = { name: type, value: 0, tokens: 0 };
    acc[type].value += 1;
    acc[type].tokens += (u.tokens_input || 0) + (u.tokens_output || 0);
    return acc;
  }, {} as Record<string, { name: string; value: number; tokens: number }>);

  const requestTypeData = Object.values(requestTypes || {});

  // Status de sucesso/erro
  const statusData = [
    { name: "Sucesso", value: successfulCalls },
    { name: "Erro", value: failedCalls },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Uso da API Gemini</h1>
          <p className="text-muted-foreground">Monitore o consumo e custos em tempo real</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Total de Chamadas"
          value={totalCalls.toLocaleString()}
          icon={Zap}
          subtitle={`${successRate}% sucesso`}
        />
        <StatsCard
          title="Cache Hit Rate"
          value={`${cacheHitRate}%`}
          icon={TrendingUp}
          subtitle={`${cacheHits} hits de ${totalCalls} chamadas`}
          trend={{ value: Number(cacheHitRate), isPositive: Number(cacheHitRate) > 50 }}
        />
        <StatsCard
          title="Tokens Consumidos"
          value={(totalTokens / 1000).toFixed(1) + "K"}
          icon={TrendingUp}
          subtitle={`${(tokensSaved / 1000).toFixed(1)}K economizados`}
        />
        <StatsCard
          title="Custo Real"
          value={`$${totalCost.toFixed(4)}`}
          icon={DollarSign}
          subtitle={`$${costSaved.toFixed(4)} economizado`}
        />
        <StatsCard
          title="Falhas"
          value={failedCalls}
          icon={AlertCircle}
          subtitle={failedCalls > 0 ? "Requer atenção" : "Tudo funcionando"}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Chamadas por Dia */}
        <Card>
          <CardHeader>
            <CardTitle>Chamadas nos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateStr" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calls" stroke={COLORS[0]} name="Chamadas" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tokens por Dia */}
        <Card>
          <CardHeader>
            <CardTitle>Consumo de Tokens (Últimos 7 Dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateStr" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="tokens" fill={COLORS[1]} name="Tokens" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Chamadas por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={requestTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {requestTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status de Sucesso/Erro */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="hsl(var(--chart-1))" />
                  <Cell fill="hsl(var(--destructive))" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Custo por Dia */}
      <Card>
        <CardHeader>
          <CardTitle>Custo Estimado (Últimos 7 Dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateStr" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toFixed(4)}`} />
              <Legend />
              <Bar dataKey="cost" fill={COLORS[2]} name="Custo ($)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
