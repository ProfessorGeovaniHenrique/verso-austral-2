import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";
import { createLogger } from "@/lib/loggerFactory";

const log = createLogger('NotFound');

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    log.error('404 - Page not found', undefined, { 
      attemptedPath: location.pathname,
      referrer: document.referrer 
    });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-[calc(100vh-150px)] items-center justify-center pt-[150px]">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            Voltar para o Início
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
