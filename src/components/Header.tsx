import { useNavigate } from "react-router-dom";
import { Menu, Zap, Search, BarChart3, Type, TrendingUp, Navigation } from "lucide-react";
import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";
import logoUfrgs from "@/assets/logo-ufrgs-oficial.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useTools } from "@/contexts/ToolsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const Header = () => {
  const navigate = useNavigate();
  const { navigateToKWIC, setActiveTab } = useTools();

  const handleQuickTool = (tool: string) => {
    navigate('/dashboard');
    setActiveTab('basicas');
    if (tool === 'kwic') {
      navigateToKWIC('');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b-2 border-primary bg-background shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="h-12 w-auto">
          <img 
            src={logoUfrgs} 
            alt="UFRGS" 
            className="h-full w-auto object-contain"
          />
        </div>
        
        <div className="h-28 w-auto">
          <img 
            src={logoVersoAustral} 
            alt="VersoAustral" 
            className="h-full w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4 mr-2" />
                Navegação
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              <DropdownMenuLabel>Páginas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                <Navigation className="h-4 w-4 mr-2" />
                Dashboard MVP
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/advanced')}>
                <Zap className="h-4 w-4 mr-2" />
                Modo Avançado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Desenvolvedor</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate('/developer-logs')}>
                Logs de Desenvolvimento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/devops-metrics')}>
                Métricas DevOps
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Tools */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Zap className="h-4 w-4 mr-2" />
                Ferramentas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              <DropdownMenuLabel>Acesso Rápido</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleQuickTool('kwic')}>
                <Search className="h-4 w-4 mr-2" />
                KWIC (Concordância)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickTool('keywords')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Palavras-chave
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickTool('wordlist')}>
                <Type className="h-4 w-4 mr-2" />
                Lista de Palavras
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickTool('ngrams')}>
                <TrendingUp className="h-4 w-4 mr-2" />
                N-gramas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickTool('dispersion')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Dispersão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-16 w-auto">
            <img 
              src={logoPpglet} 
              alt="PPGLET" 
              className="h-full w-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 pb-2">
        <Breadcrumbs />
      </div>
    </header>
  );
};

export default Header;
