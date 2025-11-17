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
  Shield, 
  Users, 
  Key, 
  BarChart3, 
  Database,
  BookOpen,
  CircuitBoard,
  Moon,
  Sun
} from "lucide-react";
import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";
import logoUfrgs from "@/assets/logo-ufrgs-oficial.png";
import logoPpglet from "@/assets/logo-ppglet.png";

const AppHeader = () => {
  const navigate = useNavigate();
  const { user, role, signOut, isAdmin } = useAuthContext();
  const { mode, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Seção 1: Branding com Logos */}
      <div className="header-academic border-b-2 border-primary">
        <div className="container-academic py-4">
          <div className="flex items-center justify-center gap-8">
            <div className="hidden md:flex h-14 w-auto">
              <img 
                src={logoUfrgs} 
                alt="UFRGS - Universidade Federal do Rio Grande do Sul" 
                className="h-full w-auto object-contain"
              />
            </div>
            
            <div className="h-20 w-auto">
              <img 
                src={logoVersoAustral} 
                alt="VersoAustral - Análise de Estilística de Corpus" 
                className="h-full w-auto object-contain"
              />
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
      </div>

      {/* Seção 2: Controles e Navegação */}
      <div className="h-12 bg-muted/20 border-b border-border backdrop-blur-sm">
        <div className="container-academic h-full">
          <div className="flex items-center justify-between h-full px-4">
            <div className="corpus-subtitle text-sm">
              Corpus de Estudo: Clássicos da Música Gaúcha
            </div>
            
            <div className="flex items-center gap-2">
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
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Dashboard Admin</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/admin/usuarios")}>
                          <Users className="mr-2 h-4 w-4" />
                          <span>Gerenciar Usuários</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/admin/metricas")}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          <span>Métricas DevOps</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/admin/lexicon")}>
                          <Database className="mr-2 h-4 w-4" />
                          <span>Setup Léxicos</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Desenvolvimento
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigate("/developer-logs")}>
                          <BookOpen className="mr-2 h-4 w-4" />
                          <span>Developer Logs</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/devops")}>
                          <CircuitBoard className="mr-2 h-4 w-4" />
                          <span>DevOps Metrics</span>
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
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
