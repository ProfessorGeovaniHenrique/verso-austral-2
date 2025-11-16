import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const EmailCaptureSection = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira seu e-mail.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Erro",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Here you would normally send the email to your backend
    console.log("Email capturado:", email);
    
    setIsLoading(false);
    setIsSubmitted(true);
    
    toast({
      title: "Sucesso!",
      description: "Seu e-mail foi registrado com sucesso.",
    });
  };

  return (
    <section id="email-capture" className="py-20 px-4 min-h-screen flex items-center justify-center">
      <div className="container max-w-2xl mx-auto">
        <Card className="p-8 md:p-12 bg-card border-border shadow-xl">
          {!isSubmitted ? (
            <>
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-center mb-6">
                Faça Parte do Lançamento
              </h2>
              <p className="text-muted-foreground text-center mb-8 leading-relaxed">
                Nosso projeto está em fase final de desenvolvimento. Buscamos criar uma
                ferramenta robusta para a comunidade acadêmica e educacional. Deixe seu e-mail
                para ser notificado assim que a plataforma for ao ar e garanta seu{" "}
                <span className="text-primary font-semibold">acesso gratuito antecipado</span>.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-background border-border focus:border-primary text-base"
                  disabled={isLoading}
                />
                <Button 
                  type="submit"
                  size="lg" 
                  className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Enviando..." : "Me Avise do Lançamento!"}
                </Button>
              </form>
              
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-center text-muted-foreground mb-4">
                  Ou experimente a plataforma agora
                </p>
                <Button
                  onClick={() => navigate("/dashboard-mvp")}
                  variant="outline"
                  size="lg"
                  className="w-full h-12 text-lg font-semibold"
                >
                  Quero testar a Demo
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                <svg 
                  className="w-8 h-8 text-success" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Obrigado!</h3>
              <p className="text-muted-foreground text-lg">
                Seu e-mail foi registrado com sucesso. Entraremos em contato em breve.
              </p>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

export default EmailCaptureSection;
