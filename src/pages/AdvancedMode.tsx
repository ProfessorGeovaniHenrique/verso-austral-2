import { useState } from "react";
import { MVPHeader } from "@/components/mvp/MVPHeader";
import { MVPFooter } from "@/components/mvp/MVPFooter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Tag, Sparkles, Database, BookOpen, TestTube, Network, FlaskConical, GitBranch, Activity } from "lucide-react";
import { POSAnalysisTool } from "@/components/mvp/tools/POSAnalysisTool";
import { TabSemanticAnnotation, TabGrammarRules, TabBackendLexicon, TabLexicalProfile, AnnotationTestInterface, DemoModeBlocker } from "@/components/advanced";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdvancedMode() {
  const { advancedModeEnabled } = useFeatureAccess();
  const [selectedCorpus, setSelectedCorpus] = useState('gaucho');

  if (!advancedModeEnabled) return <DemoModeBlocker />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MVPHeader />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Modo Avançado</h1>
          <Select value={selectedCorpus} onValueChange={setSelectedCorpus}>
            <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gaucho">Corpus Gaúcho</SelectItem>
              <SelectItem value="nordestino">Corpus Nordestino</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="pos" className="w-full">
          <div className="space-y-2 mb-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pos"><FileText className="w-4 h-4 mr-2" />POS</TabsTrigger>
              <TabsTrigger value="semantic"><Tag className="w-4 h-4 mr-2" />Anotação</TabsTrigger>
              <TabsTrigger value="lexical"><Sparkles className="w-4 h-4 mr-2" />Lexical</TabsTrigger>
              <TabsTrigger value="grammar"><BookOpen className="w-4 h-4 mr-2" />Regras</TabsTrigger>
              <TabsTrigger value="test"><TestTube className="w-4 h-4 mr-2" />Testar</TabsTrigger>
            </TabsList>
            <TabsList className="grid w-full grid-cols-5 bg-muted/50">
              <TabsTrigger value="lexicon"><Database className="w-4 h-4 mr-2" />Backend</TabsTrigger>
              <TabsTrigger value="syntactic" disabled><Network className="w-4 h-4 mr-2" />Sintático</TabsTrigger>
              <TabsTrigger value="rhetorical" disabled><FlaskConical className="w-4 h-4 mr-2" />Retórico</TabsTrigger>
              <TabsTrigger value="cohesion" disabled><GitBranch className="w-4 h-4 mr-2" />Coesão</TabsTrigger>
              <TabsTrigger value="report" disabled><Activity className="w-4 h-4 mr-2" />Relatório</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pos"><POSAnalysisTool /></TabsContent>
          <TabsContent value="semantic"><TabSemanticAnnotation /></TabsContent>
          <TabsContent value="grammar"><TabGrammarRules /></TabsContent>
          <TabsContent value="lexicon"><TabBackendLexicon /></TabsContent>
          <TabsContent value="test"><AnnotationTestInterface /></TabsContent>
          <TabsContent value="lexical"><TabLexicalProfile /></TabsContent>
        </Tabs>
      </main>
      <MVPFooter />
    </div>
  );
}
