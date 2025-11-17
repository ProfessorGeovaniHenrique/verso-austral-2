import { supabase } from '@/integrations/supabase/client';

export async function getOnboardingFunnel() {
  const steps = [1, 2, 3, 4, 5];
  const funnel = await Promise.all(
    steps.map(async (step) => {
      const { count } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'onboarding_step')
        .eq('event_metadata->>step', step.toString());
      
      return { step, users: count || 0 };
    })
  );
  
  return funnel;
}

export async function getBannerConversionTrend(days = 30) {
  const { data } = await supabase
    .from('analytics_events')
    .select('created_at, event_metadata')
    .eq('event_name', 'banner_click')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at');
  
  const grouped = data?.reduce((acc, event) => {
    const date = new Date(event.created_at).toLocaleDateString('pt-BR');
    if (!acc[date]) acc[date] = { login: 0, invite: 0 };
    const action = (event.event_metadata as any)?.action || 'login';
    acc[date][action as 'login' | 'invite'] += 1;
    return acc;
  }, {} as Record<string, { login: number; invite: number }>);
  
  return Object.entries(grouped || {}).map(([date, counts]) => ({
    date,
    ...counts,
  }));
}

export async function getFeatureUsageTrend(featureName: string, days = 30) {
  const { data } = await supabase
    .from('analytics_events')
    .select('created_at')
    .eq('event_name', 'feature_used')
    .eq('event_metadata->>feature', featureName)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at');
  
  const grouped = data?.reduce((acc, event) => {
    const date = new Date(event.created_at).toLocaleDateString('pt-BR');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(grouped || {}).map(([date, count]) => ({
    date,
    usage: count,
  }));
}
