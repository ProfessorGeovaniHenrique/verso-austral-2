import logoUfrgs from "@/assets/logo-ufrgs-oficial.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";

export function MVPHeader() {
  return (
    <header className="header-academic fixed top-0 left-0 right-0 z-50">
      <div className="container-academic">
        <div className="flex items-center justify-center gap-8 py-4">
          <div className="hidden md:flex h-14 w-auto">
            <img 
              src={logoUfrgs} 
              alt="UFRGS" 
              className="h-full w-auto object-contain"
            />
          </div>
          
          <div className="flex flex-col items-center gap-1">
            <div className="h-20 w-auto">
              <img 
                src={logoVersoAustral} 
                alt="VersoAustral - Análise de Estilística de Corpus" 
                className="h-full w-auto object-contain"
              />
            </div>
            <p className="corpus-subtitle text-xs">
              Corpus de Estudo: Clássicos da Música Gaúcha
            </p>
          </div>

          <div className="hidden md:flex h-14 w-auto">
            <img 
              src={logoPpglet} 
              alt="PPGLET" 
              className="h-full w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </header>
  );
}