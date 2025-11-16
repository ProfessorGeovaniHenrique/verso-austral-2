import logoVersoAustral from "@/assets/logo-versoaustral.png";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b-2 border-primary bg-background shadow-sm">
      <div className="container mx-auto px-4 py-6 flex items-center justify-center">
        <div className="h-32 w-auto">
          <img 
            src={logoVersoAustral} 
            alt="VersoAustral - Análise de Estilística de Corpus" 
            className="h-full w-auto object-contain"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
