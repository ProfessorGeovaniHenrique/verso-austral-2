/**
 * 📚 THEORY DETAIL MODAL
 * 
 * Modal com fundamentação teórica detalhada organizada em tabs.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Search, Lightbulb, FileText } from "lucide-react";
import { TheoreticalFramework } from "@/data/theoretical/stylistic-theory";

interface TheoryDetailModalProps {
  open: boolean;
  onClose: () => void;
  framework: TheoreticalFramework;
}

export function TheoryDetailModal({ open, onClose, framework }: TheoryDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>{framework.icon}</span>
            {framework.title}
          </DialogTitle>
          <DialogDescription>
            Fundamentação teórica baseada em Leech & Short (2007)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <Tabs defaultValue="theory" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="theory" className="gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Teoria</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="gap-1">
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Análise</span>
              </TabsTrigger>
              <TabsTrigger value="interpretation" className="gap-1">
                <Lightbulb className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Interpretação</span>
              </TabsTrigger>
              <TabsTrigger value="reference" className="gap-1">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Referências</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Fundamentação Teórica */}
            <TabsContent value="theory" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Definição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {framework.detailedTheory.definition}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Base Teórica</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {framework.detailedTheory.theoreticalBasis}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Conceitos-Chave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium mb-2 text-muted-foreground">Inglês</p>
                      <div className="flex flex-wrap gap-1">
                        {framework.detailedTheory.keyConceptsEN.map((concept, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-2 text-muted-foreground">Português</p>
                      <div className="flex flex-wrap gap-1">
                        {framework.detailedTheory.keyConceptsPT.map((concept, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Relevância Prática</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {framework.detailedTheory.practicalRelevance}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: O Que Buscar */}
            <TabsContent value="analysis" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">O Que Observar na Análise</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {framework.analysisGuide.whatToLookFor.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Padrões na Música Gaúcha</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {framework.analysisGuide.commonPatterns.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-accent-foreground mt-0.5">🎵</span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Interpretação */}
            <TabsContent value="interpretation" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dicas de Interpretação</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {framework.analysisGuide.interpretationTips.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-500 mt-0.5">💡</span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Perguntas para Reflexão</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {framework.exampleQuestions.map((question, i) => (
                      <li key={i} className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                        "{question}"
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Referências */}
            <TabsContent value="reference" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Referência Bibliográfica</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg font-mono">
                    {framework.bibliographicReference}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Leituras Recomendadas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Obra Principal:</strong> LEECH, G.; SHORT, M. <em>Style in Fiction: A Linguistic Introduction to English Fictional Prose</em>. 2nd ed. London: Pearson Longman, 2007.
                  </p>
                  <p>
                    <strong>Complementar:</strong> SEMINO, E.; SHORT, M. <em>Corpus Stylistics: Speech, Writing and Thought Presentation in a Corpus of English Writing</em>. London: Routledge, 2004.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
