import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const recentProjects = [{
    id: 1,
    title: "Análise de 'Quando o verso vem pras casa'",
    description: "Análise semântica completa",
    date: "Há 2 dias"
  }, {
    id: 2,
    title: "Projeto em andamento",
    description: "Corpus em processamento",
    date: "Há 5 dias"
  }, {
    id: 3,
    title: "Estudo piloto",
    description: "Primeira análise",
    date: "Há 1 semana"
  }];

  return <div className="pt-[150px] px-8 pb-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard de Análise</h1>
        <p className="text-muted-foreground">
          Bem-vindo à sua central de análise textual
        </p>
      </div>

      {/* Demonstração Interativa */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Demonstração Interativa</h2>
        <Card className="border-success/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-success" />
              Demo: "Quando o verso vem pras casa" - Luiz Marenco
            </CardTitle>
            <CardDescription>
              Experimente as funcionalidades da ferramenta com uma análise completa desta canção gaúcha clássica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard2")} className="w-full sm:w-auto">
              Explorar Demonstração
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Meus Projetos Recentes */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Meus Projetos Recentes</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recentProjects.map(project => <Card key={project.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => {
          if (project.id === 1) {
            navigate("/dashboard2");
          }
        }}>
              <CardHeader>
                <CardTitle className="text-lg">{project.title}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{project.date}</span>
                </div>
              </CardContent>
            </Card>)}
        </div>
      </section>
    </div>;
}
