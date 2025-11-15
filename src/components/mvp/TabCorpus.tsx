import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export function TabCorpus() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal: Letra da música (2/3) */}
        <div className="lg:col-span-2">
          <Card className="card-academic">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="section-header-academic">
                    Quando o verso vem pras casa
                  </CardTitle>
                  <CardDescription className="section-description-academic">
                    Luiz Marenco - Letra completa da música
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line text-foreground leading-relaxed">
                  {/* ADICIONE AQUI A LETRA COMPLETA DA MÚSICA */}
                  {/* Exemplo de como adicionar: */}
                  <p className="text-muted-foreground/60 italic border-l-4 border-primary/30 pl-4 py-2">
                    [A letra completa da música deve ser adicionada aqui]
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    💡 <strong>Nota:</strong> Adicione a letra completa da música "Quando o verso vem pras casa" 
                    substituindo este placeholder. Mantenha o formato <code>whitespace-pre-line</code> para 
                    preservar as quebras de linha e estrofes do poema.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral: Player do YouTube (1/3) */}
        <div>
          <Card className="card-academic">
            <CardHeader>
              <CardTitle className="text-base section-header-academic">
                Ouça a canção
              </CardTitle>
              <CardDescription className="section-description-academic">
                Player integrado do YouTube
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg overflow-hidden border border-border shadow-sm">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src="https://www.youtube.com/embed/uaRc4k-Rxpo" 
                  title="Quando o verso vem pras casa - Luiz Marenco" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen 
                  className="w-full h-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
