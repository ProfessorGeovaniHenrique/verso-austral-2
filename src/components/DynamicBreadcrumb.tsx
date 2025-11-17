import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

export function DynamicBreadcrumb() {
  const breadcrumbs = useBreadcrumbs();
  
  if (breadcrumbs.length === 0) {
    return (
      <div className="corpus-subtitle text-sm">
        Corpus de Estudo: Clássicos da Música Gaúcha
      </div>
    );
  }
  
  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link 
        to="/" 
        className="flex items-center gap-1 hover:text-primary transition-colors text-muted-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Início</span>
      </Link>
      
      {breadcrumbs.map((crumb, index) => {
        const Icon = crumb.icon;
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <div key={crumb.path} className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            {isLast ? (
              <span className="font-medium text-foreground flex items-center gap-1">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {crumb.label}
              </span>
            ) : (
              <Link 
                to={crumb.path} 
                className="hover:text-primary transition-colors text-muted-foreground flex items-center gap-1"
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
