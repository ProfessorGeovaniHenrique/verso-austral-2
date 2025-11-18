import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Box, Network, Globe, Telescope, Orbit, Scan } from "lucide-react";

interface PrototypeCard {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  tags: string[];
  status: "active" | "reference" | "deprecated";
  isStarred?: boolean;
}

const prototypes: PrototypeCard[] = [
  {
    id: "dashboard",
    title: "Dashboard Base",
    description: "Dashboard inicial com lista de projetos mockados e navegação básica",
    route: "/prototypes/dashboard",
    icon: <Box className="h-6 w-6" />,
    tags: ["2D", "Cards", "Navigation"],
    status: "reference"
  },
  {
    id: "dashboard2",
    title: "Análise Semântica",
    description: "Visualização com nuvem de palavras e modal KWIC básico",
    route: "/prototypes/dashboard2",
    icon: <Sparkles className="h-6 w-6" />,
    tags: ["2D", "WordCloud", "KWIC"],
    status: "reference"
  },
  {
    id: "dashboard3",
    title: "Galáxia Semântica 2D",
    description: "Visualização galáctica com tabs e tooltips interativos",
    route: "/prototypes/dashboard3",
    icon: <Globe className="h-6 w-6" />,
    tags: ["2D", "Galaxy", "Interactive"],
    status: "reference"
  },
  {
    id: "dashboard4",
    title: "Nuvem 3D (Three.js)",
    description: "Primeiro protótipo 3D com controles avançados e filtros",
    route: "/prototypes/dashboard4",
    icon: <Box className="h-6 w-6" />,
    tags: ["3D", "Three.js", "Filters"],
    status: "reference"
  },
  {
    id: "dashboard5",
    title: "Fog & Planets 3D",
    description: "Domínios como fog clouds e palavras como planetas orbitais",
    route: "/prototypes/dashboard5",
    icon: <Orbit className="h-6 w-6" />,
    tags: ["3D", "Fog", "Planets", "GSAP"],
    status: "reference"
  },
  {
    id: "dashboard7",
    title: "Navegação Espacial Hierárquica",
    description: "Sistema de navegação por níveis (universo → galáxia → palavra)",
    route: "/prototypes/dashboard7",
    icon: <Network className="h-6 w-6" />,
    tags: ["3D", "Navigation", "Hierarchy"],
    status: "reference"
  },
  {
    id: "dashboard8",
    title: "Scanner Orbital + KWIC",
    description: "Visualização espacial avançada com sondas orbitais e KWIC totalmente funcional",
    route: "/prototypes/dashboard8",
    icon: <Scan className="h-6 w-6" />,
    tags: ["3D", "KWIC Funcional", "Probes", "Scanner"],
    status: "active",
    isStarred: true
  }
];

export default function AdminPrototypeGallery() {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/20 text-success border-success/30";
      case "reference":
        return "bg-primary/20 text-primary border-primary/30";
      case "deprecated":
        return "bg-muted text-muted-foreground border-muted-foreground/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Funcional";
      case "reference":
        return "Referência";
      case "deprecated":
        return "Descontinuado";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-background pt-[100px] px-8 pb-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">Galeria de Protótipos</h1>
            <p className="text-muted-foreground mt-2">
              Acesso exclusivo para administradores. Explore os dashboards de prototipagem desenvolvidos durante a fase de exploração.
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Telescope className="h-5 w-5 text-primary" />
              Sobre esta Galeria
            </CardTitle>
            <CardDescription>
              Estes protótipos foram criados durante a fase de exploração para testar diferentes abordagens de visualização e interação. 
              <span className="font-semibold text-foreground"> Dashboard8</span> contém a implementação funcional de KWIC que está sendo integrada ao MVP.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Prototypes Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {prototypes.map((prototype) => (
            <Card
              key={prototype.id}
              className={`hover:border-primary/50 transition-all cursor-pointer group ${
                prototype.isStarred ? "border-success/50 bg-success/5" : ""
              }`}
              onClick={() => navigate(prototype.route)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${
                    prototype.isStarred 
                      ? "bg-success/20 text-success" 
                      : "bg-primary/10 text-primary"
                  } group-hover:scale-110 transition-transform`}>
                    {prototype.icon}
                  </div>
                  {prototype.isStarred && (
                    <Badge className="bg-success/20 text-success border-success/30">
                      ⭐ Destacado
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl mt-4">{prototype.title}</CardTitle>
                <CardDescription className="mt-2">
                  {prototype.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {prototype.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Status */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <Badge className={getStatusColor(prototype.status)}>
                      {getStatusLabel(prototype.status)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(prototype.route);
                      }}
                      className="text-primary hover:text-primary/80"
                    >
                      Explorar →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Note */}
        <Card className="border-muted bg-muted/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Estes dashboards foram arquivados e não estão conectados à landing page. 
              Para restaurar um protótipo ao ambiente de produção, consulte o README.md na pasta _archived.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
