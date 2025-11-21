import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, 
  LogOut, 
  Users, 
  Key,
  BarChart3, 
  Database,
  BookOpen,
  CircuitBoard,
  History,
  Telescope,
  Moon,
  Sun
} from "lucide-react";
import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";
import logoUfrgs from "@/assets/logo-ufrgs-oficial.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import { DynamicBreadcrumb } from "@/components/DynamicBreadcrumb";
import { MobileMenu } from "@/components/MobileMenu";
import { useIsActiveRoute } from "@/hooks/useIsActiveRoute";

const AppHeader = () => {
  const navigate = useNavigate();
  const { user, role, signOut, isAdmin } = useAuthContext();
  const { mode, toggleTheme } = useTheme();
  const isActiveRoute = useIsActiveRoute();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 header-animated">
      {/* Seção 1: Branding com Logos */}
      <div className="header-academic border-b-2 border-primary">
        <div className="container-academic py-4">
          <div className="flex items-center justify-center gap-8">
            <div className="hidden md:flex h-14 w-auto logo-animated">
              <img 
                src={logoUfrgs} 
                alt="UFRGS - Universidade Federal do Rio Grande do Sul" 
                className="h-full w-auto object-contain"
              />
            </div>
            
            <div className="h-20 w-auto logo-animated">
              <img 
                src={logoVersoAustral} 
                alt="VersoAustral - Análise de Estilística de Corpus" 
                className="h-full w-auto object-contain"
              />
            </div>
            
            <div className="hidden md:flex h-14 w-auto logo-animated">
              <img 
                src={logoPpglet} 
                alt="PPGLET" 
                className="h-full w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Controles e Navegação */}
      <div className="h-12 bg-muted/20 border-b border-border backdrop-blur-sm">
        <div className="container-academic h-full">
          <div className="flex items-center justify-between h-full px-4">
            <DynamicBreadcrumb />
            
            <div className="flex items-center gap-2">
              {/* Desktop Controls */}
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="rounded-full h-9 w-9"
                  title={mode === 'academic' ? 'Alternar para Modo Cósmico' : 'Alternar para Modo Acadêmico'}
                >
                  {mode === 'academic' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
                
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                        <Avatar className="h-9 w-9 border-2 border-primary">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.email}</p>
                          {role && (
                            <p className="text-xs leading-none text-muted-foreground">
                              {role === "admin" ? "Administrador" : "Avaliador"}
                            </p>
                          )}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/dashboard-mvp")}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </DropdownMenuItem>
                      {isAdmin() && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Administração
                          </DropdownMenuLabel>
                          
                          <DropdownMenuItem 
                            onClick={() => navigate("/admin/dashboard")}
                            className={isActiveRoute("/admin/dashboard") ? "bg-accent text-accent-foreground" : ""}
                          >
                            <Key className="mr-2 h-4 w-4" />
                            <span>Gerenciar Convites</span>
                            {isActiveRoute("/admin/dashboard") && <span className="ml-auto text-xs">●</span>}
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => navigate("/admin/users")}
                            className={isActiveRoute("/admin/users") ? "bg-accent text-accent-foreground" : ""}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            <span>Gerenciar Usuários</span>
                            {isActiveRoute("/admin/users") && <span className="ml-auto text-xs">●</span>}
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => navigate("/admin/metrics")}
                            className={isActiveRoute("/admin/metrics") ? "bg-accent text-accent-foreground" : ""}
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>Métricas do Sistema</span>
                            {isActiveRoute("/admin/metrics") && <span className="ml-auto text-xs">●</span>}
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => navigate("/admin/lexicon-setup")}
                            className={isActiveRoute("/admin/lexicon-setup") ? "bg-accent text-accent-foreground" : ""}
                          >
                            <Database className="mr-2 h-4 w-4" />
                            <span>Configuração de Léxico</span>
                            {isActiveRoute("/admin/lexicon-setup") && <span className="ml-auto text-xs">●</span>}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Desenvolvimento
                          </DropdownMenuLabel>
                          
                          <DropdownMenuItem 
                            onClick={() => navigate("/developer-logs")}
                            className={isActiveRoute("/developer-logs") ? "bg-accent text-accent-foreground" : ""}
                          >
                            <BookOpen className="mr-2 h-4 w-4" />
                            <span>Developer Logs</span>
                            {isActiveRoute("/developer-logs") && <span className="ml-auto text-xs">●</span>}
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => navigate("/admin/prototypes")}
                            className={isActiveRoute("/admin/prototypes") ? "bg-accent text-accent-foreground" : ""}
                          >
                            <Telescope className="mr-2 h-4 w-4" />
                            <span>Galeria de Protótipos</span>
                            {isActiveRoute("/admin/prototypes") && <span className="ml-auto text-xs">●</span>}
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => navigate("/developer-history")}
                            className={isActiveRoute("/developer-history") ? "bg-accent text-accent-foreground" : ""}
                          >
                            <History className="mr-2 h-4 w-4" />
                            <span>Developer History</span>
                            {isActiveRoute("/developer-history") && <span className="ml-auto text-xs">●</span>}
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => navigate("/devops-metrics")}
                            className={isActiveRoute("/devops-metrics") ? "bg-accent text-accent-foreground" : ""}
                          >
                            <CircuitBoard className="mr-2 h-4 w-4" />
                            <span>DevOps Metrics</span>
                            {isActiveRoute("/devops-metrics") && <span className="ml-auto text-xs">●</span>}
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sair</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/entrar">Entrar</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/cadastro">Cadastre-se</Link>
                    </Button>
                  </>
                )}
              </div>
              
              {/* Mobile Menu */}
              <MobileMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
