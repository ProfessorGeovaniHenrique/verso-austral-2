import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Activity, FileText } from 'lucide-react';
import { MVPHeader } from '@/components/mvp/MVPHeader';
import { MVPFooter } from '@/components/mvp/MVPFooter';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { LexiconStatusDashboardRefactored } from '@/components/advanced/lexicon-status/LexiconStatusDashboardRefactored';
import { SystemHealthDashboard } from '@/components/advanced/system-health/SystemHealthDashboard';
import { DictionaryImportInterface } from '@/components/advanced/DictionaryImportInterface';

export default function AdminLexiconSetupRefactored() {
  return (
    <div className="min-h-screen bg-background">
      <MVPHeader />
      
      <div className="container mx-auto py-8 px-4">
        <AdminBreadcrumb currentPage="Configuração de Léxico (Refatorado)" />
        
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">
              <Database className="h-4 w-4 mr-2" />
              Status
            </TabsTrigger>
            <TabsTrigger value="health">
              <Activity className="h-4 w-4 mr-2" />
              Health Check
            </TabsTrigger>
            <TabsTrigger value="import">
              <FileText className="h-4 w-4 mr-2" />
              Importação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <LexiconStatusDashboardRefactored />
          </TabsContent>

          <TabsContent value="health">
            <SystemHealthDashboard />
          </TabsContent>

          <TabsContent value="import">
            <DictionaryImportInterface />
          </TabsContent>
        </Tabs>
      </div>

      <MVPFooter />
    </div>
  );
}
