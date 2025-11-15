import logoUfrgs from "@/assets/logo-ufrgs.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import { Sparkles, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

const Header = () => {
  const { mode, toggleTheme } = useTheme();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="h-32 w-auto">
          <img 
            src={logoUfrgs} 
            alt="UFRGS Logo" 
            className="h-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
        
        <Button
          onClick={toggleTheme}
          variant="outline"
          size="lg"
          className="flex items-center gap-2 font-medium transition-all hover:scale-105"
        >
          {mode === 'cosmic' ? (
            <>
              <Briefcase className="h-5 w-5" />
              Modo Acadêmico
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Modo Exploratório
            </>
          )}
        </Button>

        <div className="h-32 w-auto">
          <img 
            src={logoPpglet} 
            alt="PPGLET Logo" 
            className="h-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
