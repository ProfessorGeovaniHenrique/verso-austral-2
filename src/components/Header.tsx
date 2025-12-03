import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Moon, Sun } from "lucide-react";
import logoVersoAustral from "@/assets/logo-versoaustral-horizontal.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import { MobileMenu } from "@/components/MobileMenu";
import { useIsActiveRoute } from "@/hooks/useIsActiveRoute";
import { navigationGroups, NavItem } from "@/config/navigationConfig";

const Header = () => {
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

  // Render a single nav item
  const renderNavItem = (item: NavItem) => (
    <DropdownMenuItem 
      key={item.url}
      onClick={() => navigate(item.url)} 
      className={isActiveRoute(item.url) ? "bg-accent text-accent-foreground" : ""}
    >
      <item.icon className="mr-2 h-4 w-4" />
      <span>{item.title}</span>
      {isActiveRoute(item.url) && <span className="ml-auto text-xs">●</span>}
    </DropdownMenuItem>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b-2 border-primary bg-background shadow-sm header-animated">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="hidden md:flex h-full w-auto logo-animated" />
        
        <div className="h-24 w-auto logo-animated mx-auto">
          <img 
            src={logoVersoAustral} 
            alt="VersoAustral - Análise de Estilística de Corpus" 
            className="h-full w-auto object-contain" 
          />
        </div>
        
        <div className="hidden md:flex h-14 w-auto logo-animated">
          <img src={logoPpglet} alt="PPGLET" className="h-full w-auto object-contain" />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              className="rounded-full" 
              title={mode === 'academic' ? 'Alternar para Modo Cósmico' : 'Alternar para Modo Acadêmico'}
            >
              {mode === 'academic' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          
            {user ? (
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
                <DropdownMenuContent className="w-64 max-h-[80vh] overflow-y-auto" align="end" forceMount>
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
                  
                  {/* Render navigation groups from config */}
                  {navigationGroups.map((group, index) => {
                    // Skip admin-only groups for non-admins
                    if (group.adminOnly && !isAdmin()) return null;
                    
                    return (
                      <div key={group.label}>
                        {index > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          {group.label}
                        </DropdownMenuLabel>
                        {group.items.map(renderNavItem)}
                      </div>
                    );
                  })}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="btn-versoaustral-secondary shrink-0">
                <Link to="/auth">Entrar</Link>
              </Button>
            )}
          </div>
          
          {/* Mobile Menu */}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
