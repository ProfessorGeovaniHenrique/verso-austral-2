import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, Wrench, FlaskConical, ArrowRight, 
  ArrowLeft, Check, Database, BarChart3 
} from "lucide-react";
import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";

const onboardingSteps = [
  {
    id: 1,
    title: "Bem-vindo ao VersoAustral!",
    description: "Uma plataforma de Estilística de Corpus para análise linguística profunda",
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <img src={logoVersoAustral} alt="VersoAustral" className="h-24 mx-auto" />
        <p className="text-center text-lg">
          Explore a riqueza lexical da cultura gaúcha através de análises computacionais avançadas.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <Database className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-semibold">Corpus Rico</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <Wrench className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-semibold">Ferramentas Avançadas</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-semibold">Visualizações</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Aba Apresentação",
    description: "Demonstração completa com corpus de estudo pré-carregado",
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <p>A <strong>Aba Apresentação</strong> oferece uma demonstração completa das capacidades analíticas:</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong>Domínios Semânticos:</strong> Tabela interativa com distribuição lexical</li>
          <li><strong>Estatísticas:</strong> Gráficos comparativos entre corpus</li>
          <li><strong>Nuvem Semântica:</strong> Visualização D3 com zoom/pan e concordâncias KWIC</li>
        </ul>
        <Alert className="bg-blue-50 border-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Esta aba está disponível para todos, inclusive visitantes!
          </AlertDescription>
        </Alert>
      </div>
    ),
  },
  {
    id: 3,
    title: "Aba Ferramentas",
    description: "Suite completa de análise linguística de corpus",
    icon: Wrench,
    content: (
      <div className="space-y-4">
        <p>Acesse ferramentas profissionais de Linguística de Corpus:</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border rounded-lg">
            <p className="font-semibold text-sm mb-1">📋 Wordlist</p>
            <p className="text-xs text-muted-foreground">Lista de palavras por frequência</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="font-semibold text-sm mb-1">🔑 Keywords</p>
            <p className="text-xs text-muted-foreground">Palavras-chave estatísticas</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="font-semibold text-sm mb-1">🔍 KWIC</p>
            <p className="text-xs text-muted-foreground">Concordâncias em contexto</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="font-semibold text-sm mb-1">📊 Dispersão</p>
            <p className="text-xs text-muted-foreground">Distribuição temporal</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="font-semibold text-sm mb-1">🔤 N-grams</p>
            <p className="text-xs text-muted-foreground">Sequências frequentes</p>
          </div>
        </div>
        <Alert className="bg-green-50 border-green-200">
          <Check className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-900">
            Você tem acesso completo a todas estas ferramentas!
          </AlertDescription>
        </Alert>
      </div>
    ),
  },
  {
    id: 4,
    title: "Aba Testes",
    description: "Validação humana e auditoria de corpus (apenas Admin/Evaluator)",
    icon: FlaskConical,
    content: (
      <div className="space-y-4">
        <p>A <strong>Aba Testes</strong> é exclusiva para Administradores e Avaliadores:</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong>Validação Humana:</strong> Revisar análises automáticas</li>
          <li><strong>Auditoria de Corpus:</strong> Verificar integridade dos dados</li>
          <li><strong>Testes de Comparação:</strong> Validar estatísticas</li>
        </ul>
        <Alert className="bg-amber-50 border-amber-200">
          <FlaskConical className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            Esta aba estará visível apenas se você tiver permissões de Administrador ou Avaliador.
          </AlertDescription>
        </Alert>
      </div>
    ),
  },
  {
    id: 5,
    title: "Pronto para Começar!",
    description: "Explore a plataforma e descubra insights linguísticos",
    icon: Check,
    content: (
      <div className="space-y-6 text-center">
        <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
          <Check className="w-10 h-10 text-primary" />
        </div>
        <p className="text-lg">
          Você está pronto para explorar o VersoAustral!
        </p>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">💡 <strong>Dica:</strong> Use o botão "Iniciar Tour Guiado" na Aba Apresentação para uma demonstração interativa</p>
          <p className="text-sm text-muted-foreground">🔖 <strong>Atalho:</strong> Pressione <kbd className="px-2 py-1 bg-muted rounded">Ctrl + K</kbd> para busca rápida</p>
        </div>
      </div>
    ),
  },
];

import { useAnalytics } from '@/hooks/useAnalytics';

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { trackOnboardingStep } = useAnalytics();
  
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const step = onboardingSteps[currentStep];
  const Icon = step.icon;
  
  useEffect(() => {
    trackOnboardingStep(currentStep + 1, step.title, 'view');
  }, [currentStep, trackOnboardingStep]);
  
  const handleNext = () => {
    trackOnboardingStep(currentStep + 1, step.title, 'complete');
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/dashboard-mvp');
  };
  
  const handleSkip = () => {
    trackOnboardingStep(currentStep + 1, step.title, 'skip');
    handleComplete();
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardContent className="p-8">
          {/* Header com Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Icon className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Passo {currentStep + 1} de {onboardingSteps.length}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Pular Tutorial
              </Button>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Conteúdo Animado */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="min-h-[400px]"
            >
              <h2 className="text-3xl font-bold mb-2">{step.title}</h2>
              <p className="text-muted-foreground mb-6">{step.description}</p>
              
              <div className="py-4">
                {step.content}
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Navegação */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            
            <div className="flex gap-2">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep 
                      ? 'bg-primary' 
                      : index < currentStep 
                        ? 'bg-primary/50' 
                        : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            
            <Button onClick={handleNext}>
              {currentStep === onboardingSteps.length - 1 ? (
                <>
                  Começar
                  <Check className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
