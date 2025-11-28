import logoUfrgs from "@/assets/logo-ufrgs-oficial.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";
import { MobileMenu } from "@/components/MobileMenu";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useIsActiveRoute } from "@/hooks/useIsActiveRoute";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Moon, 
  Sun, 
  Sparkles, 
  Wrench, 
  FlaskConical, 
  Lock, 
  LogIn,
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
  Music,
  Library,
  Tags,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { AchievementsBadge } from "@/components/achievements/AchievementsBadge";

type TabType = 'apresentacao' | 'tools' | 'validation';

interface MVPHeaderProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  hasToolsAccess?: boolean;
  hasTestsAccess?: boolean;
}
export function MVPHeader({
  activeTab,
  onTabChange,
  hasToolsAccess = false,
  hasTestsAccess = false,
}: MVPHeaderProps) {
  const { mode, toggleTheme } = useTheme();
  const { user, role, loading, signOut, isAdmin } = useAuthContext();
  
  // Derivar estado de autenticação do context (fonte única de verdade)
  const isAuthenticated = !!user;
  const isLoading = loading;
  const navigate = useNavigate();
  const isActiveRoute = useIsActiveRoute();
  const showNavigation = activeTab !== undefined && onTabChange !== undefined;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };
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
          
          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-2">
            {!isAuthenticated && !isLoading && (
              <Link to="/auth">
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </Button>
              </Link>
            )}
            {isAuthenticated && <AchievementsBadge />}
            {isAuthenticated && isAdmin() && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.email}</p>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Administração
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className={isActiveRoute("/admin/dashboard") ? "bg-accent text-accent-foreground" : ""}>
                    <Key className="mr-2 h-4 w-4" />
                    <span>Gerenciar Convites</span>
                    {isActiveRoute("/admin/dashboard") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/users")} className={isActiveRoute("/admin/users") ? "bg-accent text-accent-foreground" : ""}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Gerenciar Usuários</span>
                    {isActiveRoute("/admin/users") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/metrics")} className={isActiveRoute("/admin/metrics") ? "bg-accent text-accent-foreground" : ""}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Métricas do Sistema</span>
                    {isActiveRoute("/admin/metrics") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/lexicon-setup")} className={isActiveRoute("/admin/lexicon-setup") ? "bg-accent text-accent-foreground" : ""}>
                    <Database className="mr-2 h-4 w-4" />
                    <span>Configuração de Léxico</span>
                    {isActiveRoute("/admin/lexicon-setup") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/music-enrichment")} className={isActiveRoute("/music-enrichment") ? "bg-accent text-accent-foreground" : ""}>
                    <Music className="mr-2 h-4 w-4" />
                    <span>Enriquecimento Musical</span>
                    {isActiveRoute("/music-enrichment") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/music-catalog")} className={isActiveRoute("/music-catalog") ? "bg-accent text-accent-foreground" : ""}>
                    <Library className="mr-2 h-4 w-4" />
                    <span>Catálogo de Músicas</span>
                    {isActiveRoute("/music-catalog") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/semantic-tagset-validation")} className={isActiveRoute("/admin/semantic-tagset-validation") ? "bg-accent text-accent-foreground" : ""}>
                    <Tags className="mr-2 h-4 w-4" />
                    <span>Validação de Domínios</span>
                    {isActiveRoute("/admin/semantic-tagset-validation") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/semantic-pipeline")} className={isActiveRoute("/admin/semantic-pipeline") ? "bg-accent text-accent-foreground" : ""}>
                    <Activity className="mr-2 h-4 w-4" />
                    <span>Pipeline Semântica</span>
                    {isActiveRoute("/admin/semantic-pipeline") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Desenvolvimento
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/developer-logs")} className={isActiveRoute("/developer-logs") ? "bg-accent text-accent-foreground" : ""}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Developer Logs</span>
                    {isActiveRoute("/developer-logs") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/prototypes")} className={isActiveRoute("/admin/prototypes") ? "bg-accent text-accent-foreground" : ""}>
                    <Telescope className="mr-2 h-4 w-4" />
                    <span>Galeria de Protótipos</span>
                    {isActiveRoute("/admin/prototypes") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/developer-history")} className={isActiveRoute("/developer-history") ? "bg-accent text-accent-foreground" : ""}>
                    <History className="mr-2 h-4 w-4" />
                    <span>Developer History</span>
                    {isActiveRoute("/developer-history") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/devops-metrics")} className={isActiveRoute("/devops-metrics") ? "bg-accent text-accent-foreground" : ""}>
                    <CircuitBoard className="mr-2 h-4 w-4" />
                    <span>DevOps Metrics</span>
                    {isActiveRoute("/devops-metrics") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={mode === 'academic' ? 'Modo Cósmico' : 'Modo Acadêmico'}>
              {mode === 'academic' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
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
            {isAuthenticated && <AchievementsBadge />}
            {isAuthenticated && isAdmin() && (
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
                      <p className="text-sm font-medium leading-none">{user?.email}</p>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Administração
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className={isActiveRoute("/admin/dashboard") ? "bg-accent text-accent-foreground" : ""}>
                    <Key className="mr-2 h-4 w-4" />
                    <span>Gerenciar Convites</span>
                    {isActiveRoute("/admin/dashboard") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/users")} className={isActiveRoute("/admin/users") ? "bg-accent text-accent-foreground" : ""}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Gerenciar Usuários</span>
                    {isActiveRoute("/admin/users") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/metrics")} className={isActiveRoute("/admin/metrics") ? "bg-accent text-accent-foreground" : ""}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Métricas do Sistema</span>
                    {isActiveRoute("/admin/metrics") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/lexicon-setup")} className={isActiveRoute("/admin/lexicon-setup") ? "bg-accent text-accent-foreground" : ""}>
                    <Database className="mr-2 h-4 w-4" />
                    <span>Configuração de Léxico</span>
                    {isActiveRoute("/admin/lexicon-setup") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/music-enrichment")} className={isActiveRoute("/music-enrichment") ? "bg-accent text-accent-foreground" : ""}>
                    <Music className="mr-2 h-4 w-4" />
                    <span>Enriquecimento Musical</span>
                    {isActiveRoute("/music-enrichment") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/music-catalog")} className={isActiveRoute("/music-catalog") ? "bg-accent text-accent-foreground" : ""}>
                    <Library className="mr-2 h-4 w-4" />
                    <span>Catálogo de Músicas</span>
                    {isActiveRoute("/music-catalog") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/semantic-tagset-validation")} className={isActiveRoute("/admin/semantic-tagset-validation") ? "bg-accent text-accent-foreground" : ""}>
                    <Tags className="mr-2 h-4 w-4" />
                    <span>Validação de Domínios</span>
                    {isActiveRoute("/admin/semantic-tagset-validation") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/semantic-pipeline")} className={isActiveRoute("/admin/semantic-pipeline") ? "bg-accent text-accent-foreground" : ""}>
                    <Activity className="mr-2 h-4 w-4" />
                    <span>Pipeline Semântica</span>
                    {isActiveRoute("/admin/semantic-pipeline") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Desenvolvimento
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/developer-logs")} className={isActiveRoute("/developer-logs") ? "bg-accent text-accent-foreground" : ""}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Developer Logs</span>
                    {isActiveRoute("/developer-logs") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/prototypes")} className={isActiveRoute("/admin/prototypes") ? "bg-accent text-accent-foreground" : ""}>
                    <Telescope className="mr-2 h-4 w-4" />
                    <span>Galeria de Protótipos</span>
                    {isActiveRoute("/admin/prototypes") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/developer-history")} className={isActiveRoute("/developer-history") ? "bg-accent text-accent-foreground" : ""}>
                    <History className="mr-2 h-4 w-4" />
                    <span>Developer History</span>
                    {isActiveRoute("/developer-history") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/devops-metrics")} className={isActiveRoute("/devops-metrics") ? "bg-accent text-accent-foreground" : ""}>
                    <CircuitBoard className="mr-2 h-4 w-4" />
                    <span>DevOps Metrics</span>
                    {isActiveRoute("/devops-metrics") && <span className="ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            <div className="grid w-full max-w-4xl mx-auto grid-cols-3 gap-2" data-tour="header-tabs">
              {/* Aba Apresentação - Sempre visível */}
              <button 
                onClick={() => onTabChange('apresentacao')} 
                className={cn("tabs-academic-trigger", activeTab === 'apresentacao' && "active")}
                data-tour="header-tab-apresentacao"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Apresentação</span>
              </button>
              
              {/* Ferramentas Tab */}
              {hasToolsAccess ? (
                <button 
                  onClick={() => onTabChange('tools')}
                  className={cn(
                    "tabs-academic-trigger",
                    activeTab === 'tools' && "active"
                  )}
                  data-tour="header-tab-tools"
                >
                  <Wrench className="w-4 h-4" />
                  <span className="hidden sm:inline">Ferramentas</span>
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      disabled
                      className="tabs-academic-trigger opacity-50 cursor-not-allowed"
                    >
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
              
              {/* Testes Tab */}
              {hasTestsAccess ? (
                <button 
                  onClick={() => onTabChange('validation')}
                  className={cn(
                    "tabs-academic-trigger",
                    activeTab === 'validation' && "active"
                  )}
                  data-tour="header-tab-validation"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span className="hidden sm:inline">Testes</span>
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      disabled
                      className="tabs-academic-trigger opacity-50 cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="hidden sm:inline">Testes</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">🔒 Acesso Restrito</p>
                      <p className="text-xs">
                        Apenas para Administradores e Avaliadores.
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