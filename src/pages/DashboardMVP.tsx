import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MVPHeader } from "@/components/mvp/MVPHeader";
import { MVPFooter } from "@/components/mvp/MVPFooter";
import { TabApresentacao } from "@/components/mvp/TabApresentacao";
import { TabTools } from "@/components/mvp/TabTools";
import { TabValidation } from "@/components/mvp/TabValidation";

type TabType = 'apresentacao' | 'tools' | 'validation';

export default function DashboardMVP() {
  const [activeTab, setActiveTab] = useState<TabType>('apresentacao');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MVPHeader activeTab={activeTab} onTabChange={setActiveTab} />

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
            {activeTab === 'tools' && <TabTools />}
            {activeTab === 'validation' && <TabValidation />}
          </motion.div>
        </AnimatePresence>
      </main>

      <MVPFooter />
    </div>
  );
}
