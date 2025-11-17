import logoUfrgs from "@/assets/logo-ufrgs-oficial.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";
import { MobileMenu } from "@/components/MobileMenu";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Moon, Sun, Sparkles, Wrench, FlaskConical, Lock, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type TabType = 'apresentacao' | 'tools' | 'validation';

interface MVPHeaderProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  isAuthenticated?: boolean;
  isLoading?: boolean;
}
export function MVPHeader({
  activeTab,
  onTabChange,
  isAuthenticated = false,
  isLoading = false,
}: MVPHeaderProps) {
  const { mode, toggleTheme } = useTheme();
  const showNavigation = activeTab !== undefined && onTabChange !== undefined;
  return <header className="header-academic fixed top-0 left-0 right-0 z-50 header-animated border-b-2 border-primary bg-background">
      {/* Seção 1: Logos */}
      <div className="container-academic">
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="hidden md:flex h-14 w-auto logo-animated">
            <img src={logoUfrgs} alt="UFRGS" className="h-full w-auto object-contain" />
          </div>
          
          <div className="flex flex-col items-center gap-1 logo-animated">
            <div className="h-20 w-auto">
              <img src={logoVersoAustral} alt="VersoAustral - Análise de Estilística de Corpus" className="h-full w-auto object-contain" />
            </div>
            <p className="corpus-subtitle text-xs hidden md:block">
               O poder da Estilística de Corpus em suas mãos
            </p>
          </div>

          <div className="hidden md:flex h-14 w-auto logo-animated">
            <img src={logoPpglet} alt="PPGLET" className="h-full w-auto object-contain" />
          </div>
          
          {/* Mobile Controls */}
          <div className="flex md:hidden items-center gap-2">
            {!isAuthenticated && !isLoading && (
              <Link to="/auth">
                <Button variant="outline" size="sm" className="gap-2 h-9">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden md:inline">Login</span>
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9" title={mode === 'academic' ? 'Modo Cósmico' : 'Modo Acadêmico'}>
              {mode === 'academic' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <MobileMenu />
          </div>
        </div>
      </div>

      {/* Seção 2: Navegação (apenas se props forem fornecidas) */}
      {showNavigation && <div className="border-t border-border/50">
          <nav className="container-academic py-2 md:py-3">
            <div className="grid w-full max-w-3xl mx-auto grid-cols-3 gap-2">
              {/* Aba Apresentação - Sempre visível */}
              <button onClick={() => onTabChange('apresentacao')} className={cn("tabs-academic-trigger", activeTab === 'apresentacao' && "active")}>
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Apresentação</span>
              </button>
              
              {/* Aba Ferramentas - Apenas autenticados */}
              {isAuthenticated ? (
                <button onClick={() => onTabChange('tools')} className={cn("tabs-academic-trigger", activeTab === 'tools' && "active")}>
                  <Wrench className="w-4 h-4" />
                  <span className="hidden sm:inline">Ferramentas</span>
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button disabled className="tabs-academic-trigger opacity-50 cursor-not-allowed">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="hidden sm:inline">Ferramentas</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">🔒 Acesso Restrito</p>
                      <p className="text-xs">
                        Faça login para acessar as ferramentas de análise linguística.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Aba Testes - Apenas autenticados */}
              {isAuthenticated ? (
                <button onClick={() => onTabChange('validation')} className={cn("tabs-academic-trigger", activeTab === 'validation' && "active")}>
                  <FlaskConical className="w-4 h-4" />
                  <span className="hidden sm:inline">Testes</span>
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button disabled className="tabs-academic-trigger opacity-50 cursor-not-allowed">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="hidden sm:inline">Testes</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">🔒 Acesso Restrito</p>
                      <p className="text-xs">
                        Faça login para acessar os testes e validações.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </nav>
        </div>}
    </header>;
}