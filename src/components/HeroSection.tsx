import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onCtaClick: () => void;
}

const HeroSection = ({ onCtaClick }: HeroSectionProps) => {
  return (
    <section className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="container max-w-5xl text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          Sua Ferramenta Definitiva para{" "}
          <span className="text-primary">Análise Estilística Literária</span>
        </h1>
        <h2 className="text-xl md:text-2xl text-muted-foreground mb-6">
          Transforme textos gaúchos em dados estruturados e tenha insights profundos
        </h2>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
          A plataforma que coloca o poder da Estilística de Corpus em suas mãos, permitindo
          que professores, pesquisadores e estudantes explorem o léxico gaúcho com
          profundidade e rigor científico.
        </p>
        <Button 
          size="lg" 
          onClick={onCtaClick}
          className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Quero Acesso Antecipado
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;
