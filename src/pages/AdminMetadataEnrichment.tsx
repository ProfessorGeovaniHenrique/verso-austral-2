import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
import { MetadataEnrichmentInterface } from "@/components/advanced";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Database, FileText, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminMetadataEnrichment() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="container mx-auto max-w-7xl space-y-6">
        <AdminBreadcrumb currentPage="Enriquecimento de Metadados" />
        
        <div className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="h-6 w-6 text-purple-500" />
                Sistema de Enriquecimento de Metadados
              </CardTitle>
              <CardDescription>
                Enriqueça automaticamente os metadados do corpus com informações de compositores, álbuns e anos usando MusicBrainz API + Lovable AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Instructions Alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Como usar este sistema</AlertTitle>
                <AlertDescription className="text-sm space-y-2 mt-2">
                  <div><strong>1. Carregar Corpus:</strong> Selecione Gaúcho ou Nordestino e clique em "Carregar Corpus"</div>
                  <div><strong>2. Enriquecer:</strong> Clique em "Iniciar Enriquecimento" para processar automaticamente todas as músicas</div>
                  <div><strong>3. Validar:</strong> Revise as sugestões da IA, edite se necessário e clique em "Validar" ou "Rejeitar"</div>
                  <div><strong>4. Exportar:</strong> Baixe o CSV com os metadados validados</div>
                  <div><strong>5. Aplicar:</strong> Execute o script no terminal: <code className="bg-muted px-2 py-1 rounded text-xs">bun run scripts/apply-enriched-metadata.ts [caminho-csv] [gaucho|nordestino]</code></div>
                </AlertDescription>
              </Alert>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">MusicBrainz API</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Fonte primária de dados estruturados</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold">Lovable AI</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Inferência inteligente (fallback)</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">Validação Humana</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Review e ajuste manual</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Interface */}
          <MetadataEnrichmentInterface />
        </div>
      </div>
    </div>
  );
}
