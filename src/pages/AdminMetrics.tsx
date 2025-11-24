import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('AdminMetrics');
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Key, UserCheck, Clock, TrendingUp, Calendar } from "lucide-react";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
import { PageToolbar } from "@/components/PageToolbar";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Metrics {
  totalUsers: number;
  totalInvites: number;
  usedInvites: number;
  activeInvites: number;
  admins: number;
  evaluators: number;
}

interface LoginData {
  date: string;
  logins: number;
}

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0,
    totalInvites: 0,
    usedInvites: 0,
    activeInvites: 0,
    admins: 0,
    evaluators: 0,
  });
  const [loginData, setLoginData] = useState<LoginData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Contar usuários totais (aproximação via roles)
      const { count: totalUsers } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true });

      // Contar convites
      const { data: invites } = await supabase
        .from("invite_keys")
        .select("*");

      const totalInvites = invites?.length || 0;
      const usedInvites = invites?.filter((inv) => inv.used_at).length || 0;
      const activeInvites = invites?.filter(
        (inv) =>
          inv.is_active &&
          !inv.used_at &&
          (!inv.expires_at || new Date(inv.expires_at) > new Date())
      ).length || 0;

      // Contar por role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role");

      const admins = roles?.filter((r) => r.role === "admin").length || 0;
      const evaluators = roles?.filter((r) => r.role === "evaluator").length || 0;

      setMetrics({
        totalUsers: totalUsers || 0,
        totalInvites,
        usedInvites,
        activeInvites,
        admins,
        evaluators,
      });

      // Gerar dados de login simulados (últimos 7 dias)
      // Em produção, isso viria de uma tabela de logs
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, "dd/MMM", { locale: ptBR }),
          logins: Math.floor(Math.random() * 20) + 5,
        };
      });
      setLoginData(last7Days);
    } catch (error) {
      log.error('Erro ao carregar métricas', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  const conversionRate = metrics.totalInvites > 0
    ? ((metrics.usedInvites / metrics.totalInvites) * 100).toFixed(1)
    : "0.0";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="container mx-auto max-w-7xl">
          <p className="text-center text-muted-foreground">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageToolbar
        onRefresh={fetchMetrics}
        showSearch={false}
      />
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        <AdminBreadcrumb currentPage="Métricas do Sistema" />
        
        <div>
          <h1 className="text-3xl font-bold font-heading text-primary">
            Métricas do Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise de uso e estatísticas da plataforma
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="invites">Convites</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Usuários
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Usuários cadastrados no sistema
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Convites Gerados
                  </CardTitle>
                  <Key className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalInvites}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.usedInvites} usados ({conversionRate}% taxa de conversão)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Administradores
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.admins}</div>
                  <p className="text-xs text-muted-foreground">
                    Usuários com privilégios admin
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avaliadores</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.evaluators}</div>
                  <p className="text-xs text-muted-foreground">
                    Usuários com acesso de avaliador
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Logins nos Últimos 7 Dias</CardTitle>
                <CardDescription>
                  Atividade de login dos usuários (dados simulados)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={loginData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="logins"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Logins"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Roles</CardTitle>
                  <CardDescription>Proporção de admins vs avaliadores</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { role: "Admins", count: metrics.admins },
                        { role: "Avaliadores", count: metrics.evaluators },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="role" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas de Usuários</CardTitle>
                  <CardDescription>Resumo geral</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Total de Usuários</span>
                    </div>
                    <span className="font-bold">{metrics.totalUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Administradores</span>
                    </div>
                    <span className="font-bold">{metrics.admins}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Avaliadores</span>
                    </div>
                    <span className="font-bold">{metrics.evaluators}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Taxa de Aprovação</span>
                    </div>
                    <span className="font-bold text-green-500">{conversionRate}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invites" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Convites
                  </CardTitle>
                  <Key className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalInvites}</div>
                  <p className="text-xs text-muted-foreground">Gerados até agora</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Convites Usados</CardTitle>
                  <UserCheck className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {metrics.usedInvites}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Taxa de uso: {conversionRate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Convites Disponíveis
                  </CardTitle>
                  <Key className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">
                    {metrics.activeInvites}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ativos e não expirados
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance de Convites</CardTitle>
                <CardDescription>Análise de conversão e utilização</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { status: "Gerados", count: metrics.totalInvites },
                      { status: "Usados", count: metrics.usedInvites },
                      { status: "Ativos", count: metrics.activeInvites },
                      {
                        status: "Expirados/Inativos",
                        count:
                          metrics.totalInvites -
                          metrics.usedInvites -
                          metrics.activeInvites,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}
