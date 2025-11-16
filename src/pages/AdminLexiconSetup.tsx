import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DictionaryImportInterface } from '@/components/advanced/DictionaryImportInterface';
import { AlertTriangle, Database, BookOpen } from 'lucide-react';
import { MVPHeader } from '@/components/mvp/MVPHeader';
import { MVPFooter } from '@/components/mvp/MVPFooter';

export default function AdminLexiconSetup() {
  return (
    <div className="min-h-screen bg-background">
      <MVPHeader />
      
      <div className="container mx-auto py-8 px-4">
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <AlertTitle className="text-amber-500">Área Administrativa</AlertTitle>
          <AlertDescription>
            Esta interface é para setup inicial do sistema lexicográfico.
            Os dicionários serão importados <strong>UMA VEZ</strong> e ficarão 
            permanentemente disponíveis como recursos backend para todos os usuários.
          </AlertDescription>
        </Alert>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle>Ordem de Importação Recomendada</CardTitle>
            </div>
            <CardDescription>
              Siga esta sequência para garantir a integridade dos dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-semibold">Dialectal - Volume I</h4>
                <p className="text-sm text-muted-foreground">~1.500-2.500 verbetes regionalistas</p>
                <p className="text-xs text-muted-foreground mt-1">Tempo estimado: 30-45 min</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-semibold">Dialectal - Volume II</h4>
                <p className="text-sm text-muted-foreground">~1.500-2.500 verbetes regionalistas</p>
                <p className="text-xs text-muted-foreground mt-1">Tempo estimado: 30-45 min</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-semibold">Gutenberg - Dicionário Completo</h4>
                <p className="text-sm text-muted-foreground">~700.000 verbetes do português brasileiro</p>
                <p className="text-xs text-muted-foreground mt-1">Tempo estimado: 1-2 horas (processamento em lotes)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <DictionaryImportInterface />

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <CardTitle>Citação para Metodologia Científica</CardTitle>
            </div>
            <CardDescription>
              Use este template para citar os recursos lexicográficos integrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md text-sm font-mono space-y-2">
              <p>Os recursos lexicográficos integrados incluem:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Dicionário Dialectal Regionalista Gaúcho (Volumes I e II)</li>
                <li>Projeto Gutenberg - Dicionário de Português do Brasil</li>
                <li>Dicionário Houaiss de Sinônimos e Antônimos</li>
                <li>Dicionário UNESP de Definições Lexicográficas</li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                Estes recursos foram processados e estruturados automaticamente 
                para enriquecimento contextual durante a anotação semântica.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <MVPFooter />
    </div>
  );
}
