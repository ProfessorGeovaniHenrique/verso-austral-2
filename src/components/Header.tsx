import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";
import logoUfrgs from "@/assets/logo-ufrgs-oficial.png";
import logoPpglet from "@/assets/logo-ppglet.png";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b-2 border-primary bg-background shadow-sm">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="h-16 w-auto max-w-[200px]">
          <img 
            src={logoUfrgs} 
            alt="UFRGS - Universidade Federal do Rio Grande do Sul" 
            className="h-full w-auto object-contain"
          />
        </div>
        <div className="h-40 w-auto">
          <img 
            src={logoVersoAustral} 
            alt="VersoAustral - Análise de Estilística de Corpus" 
            className="h-full w-auto object-contain"
          />
        </div>
        <div className="h-20 w-auto">
          <img 
            src={logoPpglet} 
            alt="PPGLET" 
            className="h-full w-auto object-contain"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
