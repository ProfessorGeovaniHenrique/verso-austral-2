import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('AdminAnalytics');
import { getBannerConversionTrend, getFeatureUsageTrend } from '@/services/analyticsService';
import { exportAnalyticsToPDF } from '@/utils/exportAnalyticsPDF';
import { toast } from 'sonner';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Activity, Clock, Loader2, FileDown } from 'lucide-react';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    usersByRole: [] as Array<{ name: string; value: number }>,
    bannerConversion: { login: 0, invite: 0 },
    onboardingCompletion: 0,
    avgOnboardingTime: 0,
    topFeatures: [] as Array<{ name: string; usage: number }>,
    bannerTrend: [] as Array<{ date: string; login: number; invite: number }>,
    featureTrend: [] as Array<{ date: string; usage: number }>,
  });
  const [isExporting, setIsExporting] = useState(false);
  
  useEffect(() => {
    fetchMetrics();
  }, []);
  
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const { data: users } = await supabase.rpc('get_users_with_roles');
      const usersByRole = [
        { name: 'Admin', value: users?.filter(u => u.role === 'admin').length || 0 },
        { name: 'Evaluator', value: users?.filter(u => u.role === 'evaluator').length || 0 },
        { name: 'User', value: users?.filter(u => u.role === 'user').length || 0 },
      ];
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: bannerEvents } = await supabase
        .from('analytics_events')
        .select('event_metadata')
        .eq('event_name', 'banner_click')
        .gte('created_at', thirtyDaysAgo);
      
      const bannerConversion = {
        login: bannerEvents?.filter(e => (e.event_metadata as any)?.action === 'login').length || 0,
        invite: bannerEvents?.filter(e => (e.event_metadata as any)?.action === 'invite').length || 0,
      };
      
      const { data: onboardingStarts } = await supabase
        .from('analytics_events')
        .select('session_id')
        .eq('event_name', 'onboarding_step')
        .eq('event_metadata->>step', '1');
      
      const { data: onboardingCompletes } = await supabase
        .from('analytics_events')
        .select('session_id')
        .eq('event_name', 'onboarding_step')
        .eq('event_metadata->>step', '5')
        .eq('event_metadata->>action', 'complete');
      
      const onboardingCompletion = onboardingStarts?.length 
        ? Math.round((onboardingCompletes?.length || 0) / onboardingStarts.length * 100)
        : 0;
      
      const { data: featureUsage } = await supabase
        .from('analytics_feature_usage')
        .select('feature_name, usage_count')
        .order('usage_count', { ascending: false })
        .limit(5);
      
      const topFeatures = featureUsage?.map(f => ({
        name: f.feature_name,
        usage: f.usage_count,
      })) || [];

      const bannerTrend = await getBannerConversionTrend(30);
      const mostUsedFeature = topFeatures[0]?.name || 'kwic';
      const featureTrend = await getFeatureUsageTrend(mostUsedFeature, 30);
      
      setMetrics({
        totalUsers: users?.length || 0,
        usersByRole,
        bannerConversion,
        onboardingCompletion,
        avgOnboardingTime: 0,
        topFeatures,
        bannerTrend,
        featureTrend,
      });
    } catch (error) {
      log.error('Erro ao buscar métricas de analytics', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      await exportAnalyticsToPDF({
        totalUsers: metrics.totalUsers,
        usersByRole: metrics.usersByRole,
        bannerConversion: metrics.bannerConversion,
        onboardingCompletion: metrics.onboardingCompletion,
        topFeatures: metrics.topFeatures,
        dateRange: {
          start: thirtyDaysAgo.toLocaleDateString('pt-BR'),
          end: now.toLocaleDateString('pt-BR'),
        },
      });
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      log.error('Error exporting PDF', error instanceof Error ? error : new Error(String(error)));
      toast.error('Erro ao exportar relatório PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const COLORS = ['#667eea', '#764ba2', '#f093fb'];
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <AdminBreadcrumb currentPage="Analytics" />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics & Métricas</h1>
        <Button onClick={handleExportPDF} disabled={isExporting}>
          <FileDown className="w-4 h-4 mr-2" />
          {isExporting ? 'Exportando...' : 'Exportar PDF'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Banner (30 dias)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.bannerConversion.login + metrics.bannerConversion.invite}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.bannerConversion.login} Login / {metrics.bannerConversion.invite} Convite
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Onboarding</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.onboardingCompletion}%</div>
            <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2m 34s</div>
            <p className="text-xs text-muted-foreground">Onboarding</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="banner">Banner</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Usuários por Role</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.usersByRole}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics.usersByRole.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="banner">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Conversão do Banner Promocional - Total</CardTitle>
                <CardDescription>Últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent data-chart-export>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[metrics.bannerConversion]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="login" fill="#667eea" name="Cliques em Login" />
                    <Bar dataKey="invite" fill="#764ba2" name="Cliques em Convite" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolução Diária de Cliques no Banner</CardTitle>
                <CardDescription>Últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent data-chart-export>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.bannerTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="login" stroke="#667eea" name="Login" strokeWidth={2} />
                    <Line type="monotone" dataKey="invite" stroke="#764ba2" name="Convite" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="features">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Features Mais Utilizadas</CardTitle>
              </CardHeader>
              <CardContent data-chart-export>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.topFeatures} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="usage" fill="#667eea" name="Usos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolução Diária - Feature Mais Usada</CardTitle>
                <CardDescription>
                  {metrics.topFeatures[0]?.name || 'N/A'} - Últimos 30 dias
                </CardDescription>
              </CardHeader>
              <CardContent data-chart-export>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.featureTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="usage" 
                      stroke="#667eea" 
                      name="Usos" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
