import { GraduationCap, FlaskConical, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
const BenefitsSection = () => {
  const benefits = [{
    icon: GraduationCap,
    title: "Para Professores",
    description: "Crie aulas engajadoras e promova o letramento crítico com materiais didáticos interativos e baseados em dados científicos."
  }, {
    icon: FlaskConical,
    title: "Para Pesquisadores",
    description: "Acelere sua pesquisa com análises estatísticas robustas e visualizações prontas para publicação, garantindo rigor metodológico."
  }, {
    icon: BookOpen,
    title: "Para Estudantes",
    description: "Explore a cultura gaúcha de forma autônoma, compreenda letras complexas e aprofunde seu repertório para trabalhos e estudos."
  }];
  return <section className="py-20 px-4 bg-secondary/30">
      <div className="container max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold font-heading text-center mb-4">
          Desenvolvido para a Comunidade Acadêmica
        </h2>
        
        
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map(benefit => <Card key={benefit.title} className="p-8 bg-card border-border hover:border-primary/40 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <benefit.icon size={32} className="text-primary" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold mb-4">{benefit.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </Card>)}
        </div>
      </div>
    </section>;
};
export default BenefitsSection;