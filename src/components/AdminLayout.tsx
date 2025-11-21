import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Key, Users, BarChart3, Database, Upload, Music, Library } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout() {
  return (
    <>
      <Header />
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          
          <div className="flex-1 flex flex-col">
            <div className="border-b bg-muted/30 sticky top-[88px] z-40">
              <div className="container mx-auto px-6 py-2 flex items-center gap-2">
                <SidebarTrigger className="-ml-2 mr-2" title="Alternar Sidebar (Ctrl+B / Cmd+B)" />
                <div className="flex items-center gap-1 flex-wrap">
                  <Button variant="ghost" size="sm" asChild>
                    <NavLink to="/admin/dashboard" activeClassName="bg-primary/10 text-primary">
                      <Key className="h-4 w-4 mr-2" />
                      Convites
                    </NavLink>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <NavLink to="/admin/users" activeClassName="bg-primary/10 text-primary">
                      <Users className="h-4 w-4 mr-2" />
                      Usuários
                    </NavLink>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <NavLink to="/admin/metrics" activeClassName="bg-primary/10 text-primary">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Métricas
                    </NavLink>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <NavLink to="/admin/lexicon-setup" activeClassName="bg-primary/10 text-primary">
                      <Database className="h-4 w-4 mr-2" />
                      Léxico
                    </NavLink>
                  </Button>
                  <div className="w-px h-6 bg-border mx-1" />
                  <Button variant="ghost" size="sm" asChild>
                    <NavLink to="/admin/dictionary-import" activeClassName="bg-primary/10 text-primary">
                      <Upload className="h-4 w-4 mr-2" />
                      Dicionários
                    </NavLink>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <NavLink to="/music-enrichment" activeClassName="bg-primary/10 text-primary">
                      <Music className="h-4 w-4 mr-2" />
                      Enriquecimento
                    </NavLink>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <NavLink to="/music-catalog" activeClassName="bg-primary/10 text-primary">
                      <Library className="h-4 w-4 mr-2" />
                      Catálogo
                    </NavLink>
                  </Button>
                </div>
              </div>
            </div>
            
            <main className="flex-1 container mx-auto px-6 pt-[132px] pb-8">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
