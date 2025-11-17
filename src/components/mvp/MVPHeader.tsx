import logoUfrgs from "@/assets/logo-ufrgs-oficial.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";
import { MobileMenu } from "@/components/MobileMenu";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function MVPHeader() {
  const { mode, toggleTheme } = useTheme();
  
  return (
    <header className="header-academic fixed top-0 left-0 right-0 z-50 header-animated border-b-2 border-primary">
      <div className="container-academic">
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="hidden md:flex h-14 w-auto logo-animated">
            <img 
              src={logoUfrgs} 
              alt="UFRGS" 
              className="h-full w-auto object-contain"
            />
          </div>
          
          <div className="flex flex-col items-center gap-1 logo-animated">
            <div className="h-20 w-auto">
              <img 
                src={logoVersoAustral} 
                alt="VersoAustral - Análise de Estilística de Corpus" 
                className="h-full w-auto object-contain"
              />
            </div>
            <p className="corpus-subtitle text-xs hidden md:block">
              Corpus de Estudo: Clássicos da Música Gaúcha
            </p>
          </div>

          <div className="hidden md:flex h-14 w-auto logo-animated">
            <img 
              src={logoPpglet} 
              alt="PPGLET" 
              className="h-full w-auto object-contain"
            />
          </div>
          
          {/* Mobile Controls */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              title={mode === 'academic' ? 'Modo Cósmico' : 'Modo Acadêmico'}
            >
              {mode === 'academic' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}