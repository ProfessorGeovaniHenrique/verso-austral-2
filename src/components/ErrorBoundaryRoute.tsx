import { ErrorBoundary } from './ErrorBoundary';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryRouteProps {
  children: React.ReactNode;
  routeName: string;
}

/**
 * Specialized Error Boundary for critical routes
 * Provides custom fallback UI with route-specific messaging
 */
export const ErrorBoundaryRoute = ({ children, routeName }: ErrorBoundaryRouteProps) => {
  const fallback = (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-warning/10 p-4">
            <AlertTriangle className="h-12 w-12 text-warning" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Erro em {routeName}
          </h2>
          <p className="text-muted-foreground">
            Ocorreu um erro ao carregar esta seção. Tente atualizar a página ou retorne ao dashboard.
          </p>
        </div>

        <div className="flex gap-3 justify-center pt-4">
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Recarregar página
          </Button>
          <Button onClick={() => window.history.back()}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
};
