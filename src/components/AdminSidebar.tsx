import { 
  Key, Users, BarChart3, Database,
  BookOpen, Telescope, History, CircuitBoard, Activity, Upload
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminItems: NavItem[] = [
  { title: "Gerenciar Convites", url: "/admin/dashboard", icon: Key },
  { title: "Gerenciar Usuários", url: "/admin/users", icon: Users },
  { title: "Métricas do Sistema", url: "/admin/metrics", icon: BarChart3 },
  { title: "Configuração de Léxico", url: "/admin/lexicon-setup", icon: Database },
];

const devItems: NavItem[] = [
  { title: "Importação de Dicionários", url: "/admin/dictionary-import", icon: Upload },
  { title: "Métricas Tempo Real", url: "/admin/metrics-realtime", icon: Activity },
  { title: "Developer Logs", url: "/developer-logs", icon: BookOpen },
  { title: "Galeria de Protótipos", url: "/admin/prototypes", icon: Telescope },
  { title: "Developer History", url: "/developer-history", icon: History },
  { title: "DevOps Metrics", url: "/devops-metrics", icon: CircuitBoard },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  
  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
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
        
        <SidebarGroup>
          <SidebarGroupLabel>Desenvolvimento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {devItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
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
