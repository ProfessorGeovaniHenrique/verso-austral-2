import { useState } from "react";
import { MVPHeader } from "@/components/mvp/MVPHeader";
import { MVPFooter } from "@/components/mvp/MVPFooter";
import { TabApresentacao } from "@/components/mvp/TabApresentacao";
import { TabTools } from "@/components/mvp/TabTools";
import { TabValidation } from "@/components/mvp/TabValidation";
import { Sparkles, Wrench, FlaskConical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type TabType = 'apresentacao' | 'tools' | 'validation';

export default function DashboardMVP() {
  const [activeTab, setActiveTab] = useState<TabType>('apresentacao');

  return (
    <div className="min-h-screen bg-background" data-theme="academic">
      <MVPHeader />

      {/* Fixed Navigation Bar */}
      <nav className="fixed top-32 left-0 right-0 z-40 bg-background border-b-2 border-[hsl(var(--va-verde-pampa))] shadow-sm animate-slide-down">
        <div className="container-academic py-2 md:py-4">
          <div className="grid w-full max-w-3xl mx-auto grid-cols-3 gap-2">
            <button
              onClick={() => setActiveTab('apresentacao')}
              className={cn(
                "tabs-academic-trigger",
                activeTab === 'apresentacao' && "active"
              )}
              aria-label="Apresentação"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Apresentação</span>
            </button>
            
            <button
              onClick={() => setActiveTab('tools')}
              className={cn(
                "tabs-academic-trigger",
                activeTab === 'tools' && "active"
              )}
              aria-label="Ferramentas"
            >
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Ferramentas</span>
            </button>
            
            <button
              onClick={() => setActiveTab('validation')}
              className={cn(
                "tabs-academic-trigger",
                activeTab === 'validation' && "active"
              )}
              aria-label="Testes"
            >
              <FlaskConical className="w-4 h-4" />
              <span className="hidden sm:inline">Testes</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content - Scrollable */}
      <main className="container-academic py-4 md:py-8 mt-44 md:mt-52">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'apresentacao' && <TabApresentacao />}
            {activeTab === 'tools' && <TabTools />}
            {activeTab === 'validation' && <TabValidation />}
          </motion.div>
        </AnimatePresence>
      </main>

      <MVPFooter />
    </div>
  );
}
