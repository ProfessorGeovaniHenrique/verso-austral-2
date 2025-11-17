import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { 
  Home, 
  Wrench, 
  Sparkles, 
  Shield, 
  Users, 
  BarChart3, 
  Database,
  BookOpen,
  CircuitBoard,
  FlaskConical,
  type LucideIcon
} from 'lucide-react';

interface Breadcrumb {
  label: string;
  path: string;
  icon?: LucideIcon;
}

export function useBreadcrumbs(): Breadcrumb[] {
  const location = useLocation();
  
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    const routes: Record<string, { label: string; icon?: LucideIcon }> = {
      'dashboard-mvp': { label: 'Dashboard MVP', icon: Home },
      'ferramentas': { label: 'Ferramentas', icon: Wrench },
      'advanced-mode': { label: 'Modo Avançado', icon: Sparkles },
      'admin': { label: 'Administração', icon: Shield },
      'usuarios': { label: 'Usuários', icon: Users },
      'metricas': { label: 'Métricas', icon: BarChart3 },
      'lexicon': { label: 'Léxicos', icon: Database },
      'developer-logs': { label: 'Dev Logs', icon: BookOpen },
      'devops': { label: 'DevOps', icon: CircuitBoard },
      'validation': { label: 'Validação', icon: FlaskConical },
      'dashboard': { label: 'Dashboard', icon: Home },
      'dashboard-2': { label: 'Dashboard v2', icon: Home },
      'dashboard-3': { label: 'Dashboard v3', icon: Home },
      'dashboard-4': { label: 'Dashboard v4', icon: Home },
      'dashboard-5': { label: 'Dashboard v5', icon: Home },
      'dashboard-7': { label: 'Dashboard v7', icon: Home },
      'dashboard-8': { label: 'Dashboard v8', icon: Home },
    };
    
    return pathSegments.map((segment, index) => ({
      label: routes[segment]?.label || segment.charAt(0).toUpperCase() + segment.slice(1),
      path: '/' + pathSegments.slice(0, index + 1).join('/'),
      icon: routes[segment]?.icon,
    }));
  }, [location.pathname]);
  
  return breadcrumbs;
}
