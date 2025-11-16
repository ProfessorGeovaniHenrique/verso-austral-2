import { LayoutDashboard, FolderOpen, Sparkles, FileText, CircuitBoard, Info, BookOpen } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
];

// Dashboards obsoletos - mantidos para referência mas ocultos da UI
// const projectItems = [
//   { title: "Análise de Estilística de Corpus", url: "/dashboard2", icon: FileText },
//   { title: "Nuvem Semântica 3D (Three.js)", url: "/dashboard4", icon: Sparkles },
//   { title: "FOG & PLANETS Visualization", url: "/dashboard5", icon: Sparkles },
// ];
const projectItems: any[] = [];

const advancedItems = [
  { title: "Novas Funcionalidades (Beta)", url: "/advanced-mode", icon: Sparkles, disabled: false },
];

const devItems = [
  { title: "Developer Logs", url: "/developer-logs", icon: BookOpen },
  { title: "DevOps Metrics", url: "/devops-metrics", icon: CircuitBoard },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { advancedModeEnabled } = useFeatureAccess();
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
                </SidebarMenuItem>
              ))}

              {/* Meus Projetos - Seção removida (dashboards obsoletos) */}

              {advancedItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild disabled={!advancedModeEnabled}>
                          {!advancedModeEnabled ? (
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
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">Análise Estilística - Leech & Short</p>
                          <p className="text-xs text-muted-foreground">
                            Perfil Léxico, Sintático, Figuras de Linguagem, Coesão Textual
                          </p>
                          {!advancedModeEnabled && (
                            <p className="text-xs text-orange-500 flex items-center gap-1 mt-2">
                              <Info className="w-3 h-3" />
                              Bloqueado na versão Demo
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Developer Tools */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            Documentação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {devItems.map((item) => (
                <SidebarMenuItem key={item.title}>
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
