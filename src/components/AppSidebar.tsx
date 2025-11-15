import { LayoutDashboard, FolderOpen, Sparkles, FileText, CircuitBoard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Console de Controle", action: "toggle-console", icon: CircuitBoard },
];

const projectItems = [
  { title: "Análise de Estilística de Corpus", url: "/dashboard2", icon: FileText },
  { title: "Nuvem Semântica 3D (Three.js)", url: "/dashboard4", icon: Sparkles },
];

const advancedItems = [
  { title: "Modo Avançado", url: "/avancado", icon: Sparkles, disabled: true },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const isProjectActive = projectItems.some(item => location.pathname === item.url);

  return (
    <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
      <div className="flex items-center justify-between px-2 py-2 border-b">
        {open && <span className="text-sm font-semibold text-muted-foreground">Menu Principal</span>}
        <SidebarTrigger className={open ? "" : "mx-auto"} />
      </div>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.action === 'toggle-console' ? (
                    <SidebarMenuButton 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('toggle-control-console'));
                      }}
                      className="flex items-center gap-2 hover:bg-muted/50 cursor-pointer"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-2 hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}

              {/* Meus Projetos - Collapsible */}
              <Collapsible defaultOpen={isProjectActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="flex items-center gap-2 hover:bg-muted/50">
                      <FolderOpen className="h-4 w-4" />
                      {open && (
                        <>
                          <span>Meus Projetos</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {projectItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink 
                              to={item.url} 
                              className="flex items-center gap-2 hover:bg-muted/50 pl-8"
                              activeClassName="bg-muted text-primary font-medium"
                            >
                              <item.icon className="h-3 w-3" />
                              {open && <span className="text-sm">{item.title}</span>}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {advancedItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild disabled={item.disabled}>
                    {item.disabled ? (
                      <div className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </div>
                    ) : (
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-2 hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
