import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

interface HeroSectionProps {
  onCtaClick: () => void;
}

const HeroSection = ({ onCtaClick }: HeroSectionProps) => {
  return (
    <section className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="container max-w-5xl text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-heading mb-6 leading-tight">
          Descubra Padrões Culturais Gaúchos com{" "}
          <span className="text-primary">VersoAustral</span>
        </h1>
        <h2 className="text-xl md:text-2xl text-muted-foreground mb-6">
          A primeira ferramenta de Estilística de Corpus dedicada à música tradicional gaúcha
        </h2>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
          VersoAustral coloca o poder da análise linguística computacional em suas mãos,
          permitindo que professores, pesquisadores e estudantes explorem a identidade
          cultural gaúcha através de dados rigorosos e visualizações interativas.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={onCtaClick}
            className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Quero Acesso Antecipado
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            asChild
            className="text-lg px-8 py-6 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Link to="/dashboard-mvp">
              <Sparkles className="mr-2 h-5 w-5" />
              Explore a Demonstração
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
