/**
 * Navigation Configuration - Single Source of Truth
 * Sprint F1: Navigation Unification
 * 
 * All menu items are defined here and consumed by:
 * - Header.tsx (desktop dropdown)
 * - MobileMenu.tsx (mobile sheet)
 * - AdminSidebar.tsx (admin sidebar)
 * - AdminLayout.tsx (admin toolbar)
 */

import { 
  GraduationCap, Microscope, Sparkles, BookText,
  Library, Music, Activity, Tags, Database, BookOpen, FileQuestion,
  Key, Users, BarChart3, History, CircuitBoard, Telescope,
  Upload, Gauge, LayoutDashboard, HelpCircle
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  shortTitle?: string; // For compact displays (toolbar)
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}

// ============================================
// MAIN PAGES - Available to all authenticated users
// ============================================
export const mainPages: NavItem[] = [
  { 
    title: "Dashboard Educacional", 
    url: "/dashboard-mvp-definitivo", 
    icon: GraduationCap 
  },
  { 
    title: "Dashboard de Análise", 
    url: "/dashboard-analise", 
    icon: Microscope 
  },
  { 
    title: "Modo Avançado", 
    url: "/advanced-mode", 
    icon: Sparkles 
  },
  { 
    title: "Dashboard Expandido", 
    url: "/dashboard-expandido", 
    icon: BookText 
  },
];

// ============================================
// DATA TOOLS - Admin only
// ============================================
export const dataTools: NavItem[] = [
  { 
    title: "Catálogo de Músicas", 
    shortTitle: "Catálogo",
    url: "/music-catalog", 
    icon: Library 
  },
  { 
    title: "Enriquecimento Musical", 
    shortTitle: "Enriquecimento",
    url: "/music-enrichment", 
    icon: Music 
  },
  { 
    title: "Pipeline Semântica", 
    url: "/admin/semantic-pipeline", 
    icon: Activity 
  },
  { 
    title: "Validação de Domínios", 
    url: "/admin/semantic-tagset-validation", 
    icon: Tags 
  },
  { 
    title: "Configuração de Léxico", 
    shortTitle: "Léxico",
    url: "/admin/lexicon-setup", 
    icon: Database 
  },
  { 
    title: "Importação de Dicionários", 
    shortTitle: "Dicionários",
    url: "/admin/dictionary-import", 
    icon: BookOpen 
  },
  { 
    title: "Curadoria de Quiz", 
    url: "/admin/quiz", 
    icon: FileQuestion 
  },
];

// ============================================
// ADMINISTRATION - Admin only
// ============================================
export const adminPages: NavItem[] = [
  { 
    title: "Gerenciar Convites", 
    shortTitle: "Convites",
    url: "/admin/dashboard", 
    icon: Key 
  },
  { 
    title: "Gerenciar Usuários", 
    shortTitle: "Usuários",
    url: "/admin/users", 
    icon: Users 
  },
  { 
    title: "Métricas do Sistema", 
    shortTitle: "Métricas",
    url: "/admin/metrics", 
    icon: BarChart3 
  },
  { 
    title: "Analytics", 
    url: "/admin/analytics", 
    icon: BarChart3 
  },
];

// ============================================
// DEVELOPMENT - Admin only
// ============================================
export const devPages: NavItem[] = [
  { 
    title: "Developer Logs", 
    url: "/developer-logs", 
    icon: BookOpen 
  },
  { 
    title: "Developer History", 
    url: "/developer-history", 
    icon: History 
  },
  { 
    title: "DevOps Metrics", 
    url: "/devops-metrics", 
    icon: CircuitBoard 
  },
  { 
    title: "Galeria de Protótipos", 
    url: "/admin/prototypes", 
    icon: Telescope 
  },
  { 
    title: "API Usage", 
    url: "/api-usage", 
    icon: Activity 
  },
];

// ============================================
// GROUPED NAVIGATION - For menus with sections
// ============================================
export const navigationGroups: NavGroup[] = [
  {
    label: "Páginas Principais",
    items: mainPages,
    adminOnly: false,
  },
  {
    label: "Ferramentas de Dados",
    items: dataTools,
    adminOnly: true,
  },
  {
    label: "Administração",
    items: adminPages,
    adminOnly: true,
  },
  {
    label: "Desenvolvimento",
    items: devPages,
    adminOnly: true,
  },
];

// ============================================
// ADMIN TOOLBAR ITEMS - Subset for compact display
// ============================================
export const adminToolbarItems: NavItem[] = [
  { title: "Convites", url: "/admin/dashboard", icon: Key },
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Métricas", url: "/admin/metrics", icon: BarChart3 },
  { title: "Léxico", url: "/admin/lexicon-setup", icon: Database },
  { title: "Dicionários", url: "/admin/dictionary-import", icon: Upload },
  { title: "Enriquecimento", url: "/music-enrichment", icon: Music },
  { title: "Catálogo", url: "/music-catalog", icon: Library },
  { title: "API Usage", url: "/api-usage", icon: Activity },
];

// ============================================
// ADMIN SIDEBAR ITEMS - For sidebar navigation
// ============================================
export const adminSidebarGroups = [
  {
    label: "Administração",
    items: [
      { title: "Gerenciar Convites", url: "/admin/dashboard", icon: Key },
      { title: "Gerenciar Usuários", url: "/admin/users", icon: Users },
      { title: "Quiz", url: "/admin/quiz", icon: HelpCircle },
      { title: "Métricas do Sistema", url: "/admin/metrics", icon: BarChart3 },
      { title: "Configuração de Léxico", url: "/admin/lexicon-setup", icon: Database },
    ],
  },
  {
    label: "Desenvolvimento",
    items: [
      { title: "Dashboard MVP Definitivo", url: "/dashboard-mvp-definitivo", icon: LayoutDashboard },
      { title: "Dashboard Expandido", url: "/dashboard-expandido", icon: Gauge },
      { title: "Importação de Dicionários", url: "/admin/dictionary-import", icon: Upload },
      { title: "Validação de Domínios Semânticos", url: "/admin/semantic-tagset-validation", icon: Tags },
      { title: "Enriquecimento Musical", url: "/music-enrichment", icon: Music },
      { title: "Catálogo de Músicas", url: "/music-catalog", icon: Library },
      { title: "Métricas Tempo Real", url: "/admin/metrics-realtime", icon: Activity },
      { title: "Developer Logs", url: "/developer-logs", icon: BookOpen },
      { title: "Galeria de Protótipos", url: "/admin/prototypes", icon: Telescope },
      { title: "Developer History", url: "/developer-history", icon: History },
      { title: "DevOps Metrics", url: "/devops-metrics", icon: CircuitBoard },
    ],
  },
];
