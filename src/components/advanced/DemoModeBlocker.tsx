import { Lock, Sparkles, BookOpen, Network, Link2, FileBarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DemoModeBlocker() {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <Card className="border-2 border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Sparkles className="w-16 h-16 text-primary animate-pulse" />
              <Lock className="w-8 h-8 text-muted-foreground absolute -bottom-1 -right-1 bg-background rounded-full p-1 border-2" />
            </div>
          </div>
          
          <div>
            <CardTitle className="text-3xl font-bold">Modo Avançado</CardTitle>
            <CardDescription className="text-base mt-2">
              Análise Estilística baseada em Leech & Short (2007)
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="bg-primary/5 border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription>
              Esta funcionalidade está em desenvolvimento e será disponibilizada na versão completa do sistema.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Ferramentas de Análise Estilística:</h3>
            
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Perfil Léxico</h4>
                  <p className="text-sm text-muted-foreground">
                    Type-Token Ratio, densidade lexical, hapax legomena, campos semânticos
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <Network className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Perfil Sintático</h4>
                  <p className="text-sm text-muted-foreground">
                    Comprimento médio de sentenças, distribuição POS, análise verbal
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Figuras de Linguagem</h4>
                  <p className="text-sm text-muted-foreground">
                    Detecção de repetição, aliteração, assonância, anáfora, paralelismo
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <Link2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Coesão Textual</h4>
                  <p className="text-sm text-muted-foreground">
                    Análise de conectivos, referências anafóricas, cadeias lexicais
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <FileBarChart className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Relatório Completo</h4>
                  <p className="text-sm text-muted-foreground">
                    Dashboard agregado com gráfico radar e exportação PDF
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Esta funcionalidade utiliza técnicas avançadas de análise linguística computacional 
              para estudos estilísticos em corpus literários.
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="lg" asChild>
                <a href="/dashboard" className="gap-2">
                  Voltar ao Dashboard
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
