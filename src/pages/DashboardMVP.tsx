import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createLogger } from "@/lib/loggerFactory";

const log = createLogger('DashboardMVP');
import { MVPHeader } from "@/components/mvp/MVPHeader";
import { MVPFooter } from "@/components/mvp/MVPFooter";
import { SubcorpusIndicator } from "@/components/corpus/SubcorpusIndicator";
import { TabApresentacao } from "@/components/mvp/TabApresentacao";
import { TabTools } from "@/components/mvp/TabTools";
import { TabValidation } from "@/components/mvp/TabValidation";
import { TabSubcorpus } from "@/components/mvp/TabSubcorpus";
import { useAuthContext } from "@/contexts/AuthContext";
import { CorpusProvider } from "@/contexts/CorpusContext";
import { SubcorpusProvider } from "@/contexts/SubcorpusContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

type TabType = 'apresentacao' | 'tools' | 'subcorpus' | 'validation';

export default function DashboardMVP() {
  const [activeTab, setActiveTab] = useState<TabType>('apresentacao');
  const { user, loading, hasToolsAccess, hasTestsAccess } = useAuthContext();
  
  // Quick Tour Integration
  useEffect(() => {
    const shouldShowQuickTour = localStorage.getItem('show_quick_tour') === 'true';
    if (shouldShowQuickTour) {
      log.info('Quick tour triggered');
      localStorage.removeItem('show_quick_tour');
      import('@/hooks/useQuickTour').then(({ useQuickTour }) => {
        const { startQuickTour } = useQuickTour();
        setTimeout(() => startQuickTour(), 1000);
      });
    }
  }, []);
  
  // Proteger: Se usuário não autenticado tentar acessar aba restrita, voltar para apresentação
  useEffect(() => {
    if (!loading && !user && (activeTab === 'tools' || activeTab === 'subcorpus' || activeTab === 'validation')) {
      log.warn('Unauthorized access attempt to restricted tab', { activeTab });
      setActiveTab('apresentacao');
    }
  }, [user, loading, activeTab]);

  return (
    <CorpusProvider>
      <SubcorpusProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <MVPHeader 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            isAuthenticated={!!user}
            isLoading={loading}
            hasToolsAccess={hasToolsAccess()}
            hasTestsAccess={hasTestsAccess()}
          />
          
          {/* Badge Flutuante de Subcorpus Ativo */}
          <SubcorpusIndicator />

      {/* Conteúdo scrollável com espaçamento ajustado para header unificado */}
      <main className="container-academic py-4 md:py-8 mt-[180px] md:mt-[200px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'apresentacao' && <TabApresentacao />}
            
            {activeTab === 'tools' && (
              hasToolsAccess() ? (
                <TabTools />
              ) : (
                <Alert className="max-w-2xl mx-auto">
                  <Lock className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    Faça login para acessar as ferramentas de análise.
                  </AlertDescription>
                </Alert>
              )
            )}
            
            {activeTab === 'subcorpus' && (
              hasToolsAccess() ? (
                <TabSubcorpus />
              ) : (
                <Alert className="max-w-2xl mx-auto">
                  <Lock className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    Faça login para acessar a análise de subcorpora.
                  </AlertDescription>
                </Alert>
              )
            )}
            
            {activeTab === 'validation' && (
              hasTestsAccess() ? (
                <TabValidation />
              ) : (
                <Alert className="max-w-2xl mx-auto">
                  <Lock className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    Esta seção está disponível apenas para Administradores e Avaliadores.
                  </AlertDescription>
                </Alert>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>

          <MVPFooter />
        </div>
      </SubcorpusProvider>
    </CorpusProvider>
  );
}
