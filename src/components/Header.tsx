import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";
import logoUfrgs from "@/assets/logo-ufrgs-oficial.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import { Menu, Zap, LayoutDashboard, Sparkles, BookOpen, CircuitBoard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Breadcrumbs } from "./Breadcrumbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToolsContext } from "@/contexts/ToolsContext";

const Header = () => {
  const navigate = useNavigate();
  const { navigateToKWIC } = useToolsContext();

  const handleQuickTool = (tool: string) => {
    navigate("/dashboard");
    setTimeout(() => {
      const toolsTab = document.querySelector('[data-value="tools"]');
      if (toolsTab instanceof HTMLElement) {
        toolsTab.click();
      }
      
      if (tool === 'kwic') {
        navigateToKWIC();
      }
    }, 100);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b-2 border-primary bg-background shadow-sm">
      <div className="container mx-auto px-4 py-4">
        {/* Logos Row */}
        <div className="flex items-center justify-between mb-3">
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

        {/* Navigation Row */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
          {/* Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Menu className="h-4 w-4" />
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-background z-50">
              <DropdownMenuLabel>Navegação Principal</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard MVP</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/advanced-mode" className="flex items-center gap-2 cursor-pointer">
                  <Sparkles className="h-4 w-4" />
                  <span>Funcionalidades Avançadas</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Ferramentas de Desenvolvimento</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to="/developer-logs" className="flex items-center gap-2 cursor-pointer">
                  <BookOpen className="h-4 w-4" />
                  <span>Developer Logs</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/devops-metrics" className="flex items-center gap-2 cursor-pointer">
                  <CircuitBoard className="h-4 w-4" />
                  <span>DevOps Metrics</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Breadcrumbs */}
          <div className="flex-1">
            <Breadcrumbs />
          </div>

          {/* Quick Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="gap-2">
                <Zap className="h-4 w-4" />
                Ferramentas Rápidas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background z-50">
              <DropdownMenuLabel>Acesso Rápido</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleQuickTool('kwic')} className="cursor-pointer">
                🔍 KWIC (Concordância)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickTool('keywords')} className="cursor-pointer">
                🔑 Keywords (Palavras-chave)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickTool('wordlist')} className="cursor-pointer">
                📝 Wordlist (Lista de Palavras)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickTool('ngrams')} className="cursor-pointer">
                🔗 N-grams
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickTool('dispersion')} className="cursor-pointer">
                📊 Dispersão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
