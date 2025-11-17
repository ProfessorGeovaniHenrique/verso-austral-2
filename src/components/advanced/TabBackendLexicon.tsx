import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, BookOpen, Activity, CheckSquare, TestTube2 } from 'lucide-react';
import { LexiconViewer } from './LexiconViewer';
import { ValidationInterface } from './ValidationInterface';
import { TagsetManager } from './TagsetManager';
import { JobsMonitor } from './JobsMonitor';
import { DictionaryImportTester } from './DictionaryImportTester';
import { LexiconEntry } from '@/hooks/useBackendLexicon';

export function TabBackendLexicon() {
  const [validationEntry, setValidationEntry] = useState<LexiconEntry | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);

  const handleValidate = (entry: LexiconEntry) => {
    setValidationEntry(entry);
    setValidationOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Backend Lexicon</h2>
        <p className="text-muted-foreground">
          Visualize e valide dados do léxico semântico armazenados no banco de dados
        </p>
      </div>

      <Tabs defaultValue="tests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="tests" className="gap-2">
            <TestTube2 className="w-4 h-4" />
            <span className="hidden sm:inline">Testes</span>
          </TabsTrigger>
          <TabsTrigger value="lexicon" className="gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Léxico</span>
          </TabsTrigger>
          <TabsTrigger value="tagsets" className="gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Tagsets</span>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Jobs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          <DictionaryImportTester />
        </TabsContent>

        <TabsContent value="lexicon" className="space-y-4">
          <LexiconViewer onValidate={handleValidate} />
        </TabsContent>

        <TabsContent value="tagsets" className="space-y-4">
          <TagsetManager />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <JobsMonitor />
        </TabsContent>
      </Tabs>

      <ValidationInterface
        entry={validationEntry}
        open={validationOpen}
        onOpenChange={setValidationOpen}
        onSuccess={() => {
          // Recarregar dados se necessário
        }}
      />
    </div>
  );
}
