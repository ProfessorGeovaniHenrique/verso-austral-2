import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Activity, Clock, Loader2 } from 'lucide-react';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    usersByRole: [] as Array<{ name: string; value: number }>,
    bannerConversion: { login: 0, invite: 0 },
    onboardingCompletion: 0,
    avgOnboardingTime: 0,
    topFeatures: [] as Array<{ name: string; usage: number }>,
  });
  
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
      
      setMetrics({
        totalUsers: users?.length || 0,
        usersByRole,
        bannerConversion,
        onboardingCompletion,
        avgOnboardingTime: 0,
        topFeatures,
      });
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
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
      
      <h1 className="text-3xl font-bold mb-6">Analytics & Métricas</h1>
      
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
          <Card>
            <CardHeader>
              <CardTitle>Conversão do Banner Promocional</CardTitle>
              <CardDescription>Últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
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
        </TabsContent>
        
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Features Mais Utilizadas</CardTitle>
            </CardHeader>
            <CardContent>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
