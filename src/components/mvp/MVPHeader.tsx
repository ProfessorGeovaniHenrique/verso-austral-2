import logoUfrgs from "@/assets/logo-ufrgs.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import { Badge } from "@/components/ui/badge";

export function MVPHeader() {
  return (
    <header className="header-academic">
      <div className="container-academic">
        <div className="flex items-center justify-between">
          <div className="h-20 w-auto">
            <img 
              src={logoUfrgs} 
              alt="UFRGS Logo" 
              className="h-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>
          
          <div className="text-center flex-1 px-6">
            <h1 className="text-3xl font-bold text-primary font-heading">
              VersoAustral - Análise de Estilística de Corpus
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Corpus de Estudo: Clássicos da Música Gaúcha
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Badge variant="outline" className="badge-verde justify-center">
              18 Domínios
            </Badge>
            <Badge variant="outline" className="badge-amarelo justify-center">
              3.458 Palavras
            </Badge>
          </div>

          <div className="h-20 w-auto ml-4">
            <img 
              src={logoPpglet} 
              alt="PPGLET Logo" 
              className="h-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
