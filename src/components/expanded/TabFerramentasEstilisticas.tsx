import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Palette, Link2, FileText, MessageCircle, Brain, Sparkles } from "lucide-react";
import { SyntacticProfileTool } from "./SyntacticProfileTool";
import { RhetoricalFiguresTool } from "./RhetoricalFiguresTool";
import { CohesionAnalysisTool } from "./CohesionAnalysisTool";
import { SpeechThoughtPresentationTool } from "./SpeechThoughtPresentationTool";
import { MindStyleAnalyzerTool } from "./MindStyleAnalyzerTool";
import { ForegroundingDetectorTool } from "./ForegroundingDetectorTool";
import { TabLexicalProfile } from "@/components/advanced/TabLexicalProfile";
import { CrossCorpusSelectorWithRatio } from "@/components/corpus/CrossCorpusSelectorWithRatio";
import { useSubcorpus } from "@/contexts/SubcorpusContext";

export function TabFerramentasEstilisticas() {
  const { stylisticSelection, setStylisticSelection, availableArtists } = useSubcorpus();
  
  return (
    <div className="space-y-6">
      {/* Seletor compartilhado no topo, fora das abas */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="pt-4">
          <CrossCorpusSelectorWithRatio
            mode="study-only"
            showRatioControl={false}
            onSelectionChange={setStylisticSelection}
            availableArtists={availableArtists}
            initialSelection={stylisticSelection}
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Ferramentas Estilísticas
          </CardTitle>
          <CardDescription>
            Análises baseadas em Leech & Short (2007) - Style in Fiction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="lexical" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="lexical" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Perfil Léxico</span>
              </TabsTrigger>
              <TabsTrigger value="syntactic" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Perfil Sintático</span>
              </TabsTrigger>
              <TabsTrigger value="rhetorical" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Figuras Retóricas</span>
              </TabsTrigger>
              <TabsTrigger value="cohesion" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Coesão</span>
              </TabsTrigger>
              <TabsTrigger value="speech-thought" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Fala/Pensamento</span>
              </TabsTrigger>
              <TabsTrigger value="mind-style" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Mind Style</span>
              </TabsTrigger>
              <TabsTrigger value="foregrounding" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Foregrounding</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lexical" className="mt-6">
              <TabLexicalProfile />
            </TabsContent>

            <TabsContent value="syntactic" className="mt-6">
              <SyntacticProfileTool />
            </TabsContent>

            <TabsContent value="rhetorical" className="mt-6">
              <RhetoricalFiguresTool />
            </TabsContent>

            <TabsContent value="cohesion" className="mt-6">
              <CohesionAnalysisTool />
            </TabsContent>

            <TabsContent value="speech-thought" className="mt-6">
              <SpeechThoughtPresentationTool />
            </TabsContent>

            <TabsContent value="mind-style" className="mt-6">
              <MindStyleAnalyzerTool />
            </TabsContent>

            <TabsContent value="foregrounding" className="mt-6">
              <ForegroundingDetectorTool />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
