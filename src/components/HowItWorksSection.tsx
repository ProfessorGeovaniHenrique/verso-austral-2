import { Upload, Network, Download, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HowItWorksSection = () => {
  const steps = [
    {
      icon: Upload,
      title: "1. Envie seu Corpus",
      description: "Faça upload de letras de músicas gaúchas ou obras literárias que deseja analisar, ou utilize nossa base de dados.",
      color: "text-success",
    },
    {
      icon: Network,
      title: "2. Visualize os Temas",
      description: "Navegue por redes semânticas e nuvens de palavras que revelam os temas centrais do seu texto.",
      color: "text-primary",
    },
    {
      icon: Download,
      title: "3. Exporte seus Dados",
      description: "Exporte planilhas e gráficos de alta qualidade, prontos para suas aulas, artigos ou apresentações.",
      color: "text-accent",
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="container max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold font-heading text-center mb-4">
          Seu Fluxo de Análise
        </h2>
        <p className="text-xl text-muted-foreground text-center mb-16">
          De Textos Brutos a Dados Visuais em 3 Passos
        </p>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step) => (
            <Card 
              key={step.title}
              className="p-8 bg-card border-border hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className={`w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6 ${step.color}`}>
                <step.icon size={32} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold mb-4">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
              <div className="mt-6 h-32 bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground text-sm italic">
                Screenshot do protótipo será inserido aqui
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <Link to="/dashboard-mvp">
              <Sparkles className="mr-2 h-5 w-5" />
              Testar Agora Gratuitamente
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
