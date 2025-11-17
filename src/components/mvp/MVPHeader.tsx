import logoUfrgs from "@/assets/logo-ufrgs-oficial.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";
import { MobileMenu } from "@/components/MobileMenu";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Sparkles, Wrench, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

type TabType = 'apresentacao' | 'tools' | 'validation';

interface MVPHeaderProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

export function MVPHeader({ activeTab, onTabChange }: MVPHeaderProps) {
  const { mode, toggleTheme } = useTheme();
  const showNavigation = activeTab !== undefined && onTabChange !== undefined;
  
  return (
    <header className="header-academic fixed top-0 left-0 right-0 z-50 header-animated border-b-2 border-primary bg-background">
      {/* Seção 1: Logos */}
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

      {/* Seção 2: Navegação (apenas se props forem fornecidas) */}
      {showNavigation && (
        <div className="border-t border-border/50">
          <nav className="container-academic py-2 md:py-3">
            <div className="grid w-full max-w-3xl mx-auto grid-cols-3 gap-2">
              <button 
                onClick={() => onTabChange('apresentacao')}
                className={cn(
                  "tabs-academic-trigger",
                  activeTab === 'apresentacao' && "active"
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Apresentação</span>
              </button>
              
              <button 
                onClick={() => onTabChange('tools')}
                className={cn(
                  "tabs-academic-trigger",
                  activeTab === 'tools' && "active"
                )}
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Ferramentas</span>
              </button>
              
              <button 
                onClick={() => onTabChange('validation')}
                className={cn(
                  "tabs-academic-trigger",
                  activeTab === 'validation' && "active"
                )}
              >
                <FlaskConical className="w-4 h-4" />
                <span className="hidden sm:inline">Testes</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}