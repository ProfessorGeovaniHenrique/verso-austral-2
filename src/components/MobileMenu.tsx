import { useState } from 'react';
import { Menu, Moon, Sun, Home, Wrench, Sparkles, Shield, Users, BarChart3, Database, BookOpen, CircuitBoard, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, role, signOut, isAdmin } = useAuthContext();
  const { mode, toggleTheme } = useTheme();
  
  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate('/');
  };
  
  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden h-9 w-9"
          aria-label="Menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-[280px] sm:w-[320px] animate-slide-in-right">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        
        <nav className="flex flex-col gap-3 mt-6">
          {/* Informações do usuário */}
          {user && (
            <>
              <div className="pb-3 border-b">
                <p className="text-sm font-medium truncate">{user.email}</p>
                {role && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {role === 'admin' ? 'Administrador' : 'Avaliador'}
                  </p>
                )}
              </div>
            </>
          )}
          
          {/* Controle de Tema */}
          <Button 
            variant="outline" 
            onClick={toggleTheme}
            className="justify-start gap-2"
          >
            {mode === 'academic' ? (
              <>
                <Moon className="h-4 w-4" />
                <span>Modo Cósmico</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" />
                <span>Modo Acadêmico</span>
              </>
            )}
          </Button>
          
          <Separator />
          
          {/* Links de navegação principais */}
          {user && (
            <>
              <Button 
                variant="ghost" 
                onClick={() => handleNavigate('/dashboard-mvp')}
                className="justify-start gap-2"
              >
                <Home className="h-4 w-4" />
                <span>Dashboard MVP</span>
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => handleNavigate('/advanced-mode')}
                className="justify-start gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Modo Avançado</span>
              </Button>
            </>
          )}
          
          {/* Menu Admin */}
          {isAdmin() && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground font-medium px-3 py-1">
                Administração
              </div>
              
              <Button 
                variant="ghost" 
                onClick={() => handleNavigate('/admin')}
                className="justify-start gap-2"
              >
                <Shield className="h-4 w-4" />
                <span>Dashboard Admin</span>
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => handleNavigate('/admin/usuarios')}
                className="justify-start gap-2"
              >
                <Users className="h-4 w-4" />
                <span>Usuários</span>
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => handleNavigate('/admin/metricas')}
                className="justify-start gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Métricas DevOps</span>
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => handleNavigate('/admin/lexicon')}
                className="justify-start gap-2"
              >
                <Database className="h-4 w-4" />
                <span>Setup Léxicos</span>
              </Button>
              
              <Separator />
              
              <div className="text-xs text-muted-foreground font-medium px-3 py-1">
                Desenvolvimento
              </div>
              
              <Button 
                variant="ghost" 
                onClick={() => handleNavigate('/developer-logs')}
                className="justify-start gap-2"
              >
                <BookOpen className="h-4 w-4" />
                <span>Developer Logs</span>
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => handleNavigate('/devops')}
                className="justify-start gap-2"
              >
                <CircuitBoard className="h-4 w-4" />
                <span>DevOps Metrics</span>
              </Button>
            </>
          )}
          
          {/* Botões de ação */}
          {!user ? (
            <>
              <Separator />
              <Button 
                variant="outline" 
                onClick={() => handleNavigate('/entrar')}
                className="justify-start"
              >
                Entrar
              </Button>
              <Button 
                onClick={() => handleNavigate('/cadastro')}
                className="justify-start"
              >
                Cadastre-se
              </Button>
            </>
          ) : (
            <>
              <Separator className="mt-auto" />
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                className="justify-start gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
