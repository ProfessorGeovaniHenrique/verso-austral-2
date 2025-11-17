import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MVPHeader } from "@/components/mvp/MVPHeader";
import { MVPFooter } from "@/components/mvp/MVPFooter";
import { TabApresentacao } from "@/components/mvp/TabApresentacao";
import { TabTools } from "@/components/mvp/TabTools";
import { TabValidation } from "@/components/mvp/TabValidation";
import { useAuthContext } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

type TabType = 'apresentacao' | 'tools' | 'validation';

export default function DashboardMVP() {
  const [activeTab, setActiveTab] = useState<TabType>('apresentacao');
  const { user, loading } = useAuthContext();
  
  // Proteger: Se usuário não autenticado tentar acessar aba restrita, voltar para apresentação
  useEffect(() => {
    if (!loading && !user && (activeTab === 'tools' || activeTab === 'validation')) {
      setActiveTab('apresentacao');
    }
  }, [user, loading, activeTab]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MVPHeader 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isAuthenticated={!!user}
        isLoading={loading}
      />

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
              user ? (
                <TabTools />
              ) : (
                <Alert className="max-w-2xl mx-auto">
                  <Lock className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    Esta seção requer autenticação. Por favor, faça login para acessar as ferramentas.
                  </AlertDescription>
                </Alert>
              )
            )}
            
            {activeTab === 'validation' && (
              user ? (
                <TabValidation />
              ) : (
                <Alert className="max-w-2xl mx-auto">
                  <Lock className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    Esta seção requer autenticação. Por favor, faça login para acessar os testes.
                  </AlertDescription>
                </Alert>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <MVPFooter />
    </div>
  );
}
