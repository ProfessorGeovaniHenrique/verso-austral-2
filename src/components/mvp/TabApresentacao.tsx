import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Mail, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Database, BarChart3, FileText, Music, Play, Lock, Wrench, FlaskConical } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRef } from "react";
import { TabDomains } from "./TabDomains";
import { TabStatistics } from "./TabStatistics";
import { TabGalaxy } from "./TabGalaxy";
import { useApresentacaoTour } from "@/hooks/useApresentacaoTour";
import { useDomainsTour } from "@/hooks/useDomainsTour";
import { useCloudTour } from "@/hooks/useCloudTour";
import { useStatisticsTour } from "@/hooks/useStatisticsTour";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAnalytics } from '@/hooks/useAnalytics';
import { CorpusLoadingModal } from './CorpusLoadingModal';

// Schema de validação com Zod
const accessRequestSchema = z.object({
  full_name: z.string()
    .trim()
    .min(2, { message: "Nome deve ter no mínimo 2 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" })
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { 
      message: "Nome deve conter apenas letras, espaços, hífens e apóstrofos" 
    }),
  
  email: z.string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" })
    .toLowerCase(),
  
  institution: z.string()
    .trim()
    .max(200, { message: "Instituição deve ter no máximo 200 caracteres" })
    .optional()
    .or(z.literal("")),
  
  role_requested: z.enum(["professor", "pesquisador", "estudante"], {
    errorMap: () => ({ message: "Selecione uma opção válida" })
  }),
  
  reason: z.string()
    .trim()
    .max(1000, { message: "Justificativa deve ter no máximo 1000 caracteres" })
    .optional()
    .or(z.literal(""))
});

type AccessRequestFormData = z.infer<typeof accessRequestSchema>;

export function TabApresentacao() {
  const { trackBannerClick } = useAnalytics();
  const [currentTab, setCurrentTab] = useState("intro");
  const { user } = useAuthContext();
  const [showAccessForm, setShowAccessForm] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Estado para carregamento do corpus demo
  const [corpusLoaded, setCorpusLoaded] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [demoSongId] = useState('d045622c-58a0-47c0-b113-1e58d7420647');

  // Form com validação Zod
  const form = useForm<AccessRequestFormData>({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: {
      full_name: "",
      email: "",
      institution: "",
      reason: "",
    }
  });

  const handleAccessRequest = async (data: AccessRequestFormData) => {
    try {
      // Dados já validados pelo Zod
      const { error } = await supabase.from('access_requests').insert({
        full_name: data.full_name,
        email: data.email,
        institution: data.institution || null,
        role_requested: data.role_requested,
        reason: data.reason || null,
      });
      
      if (error) throw error;

      toast.success('Solicitação enviada com sucesso! Entraremos em contato em breve.');
      setShowAccessForm(false);
      form.reset();
    } catch (error) {
      console.error('Error submitting access request:', error);
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    }
  };

  const handleLoadCorpus = async () => {
    setShowLoadingModal(true);
  };

  const handleLoadingComplete = () => {
    setShowLoadingModal(false);
    setCorpusLoaded(true);
    toast.success('Corpus processado! Explore as abas para ver a análise.');
    
    // Scroll para as tabs
    setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };
  const { startTour } = useApresentacaoTour({ autoStart: true });
  
  // Tour hooks para cada aba
  const [showDomainsTour, setShowDomainsTour] = useState(false);
  const [showCloudTour, setShowCloudTour] = useState(false);
  const [showStatsTour, setShowStatsTour] = useState(false);
  
  useDomainsTour(showDomainsTour);
  useCloudTour(showCloudTour);
  useStatisticsTour(showStatsTour);

  return (
    <Card className="card-academic">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="section-header-academic flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Apresentação da Ferramenta
            </CardTitle>
            <CardDescription className="section-description-academic">
              Demonstração completa das capacidades de análise estilística do VersoAustral
            </CardDescription>
          </div>
          <Button onClick={startTour} variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Iniciar Tour Guiado
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Banner Promocional (apenas para não autenticados) */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert className="border-2 border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-background relative overflow-hidden">
              {/* Efeito de brilho no fundo */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-10" />
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1">
                  <AlertTitle className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Desbloqueie Todo o Potencial da Plataforma
                  </AlertTitle>
                  
                  <AlertDescription className="space-y-3">
                    <p className="text-base text-foreground/90">
                      Você está visualizando apenas uma <strong>demonstração</strong> das capacidades do VersoAustral. 
                      Faça login para acessar:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
                      <div className="flex items-start gap-2 p-3 bg-background/60 rounded-lg border border-border/50">
                        <Wrench className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">Ferramentas Avançadas</p>
                          <p className="text-xs text-muted-foreground">
                            KWIC, Keywords, N-grams, Dispersão e muito mais
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 p-3 bg-background/60 rounded-lg border border-border/50">
                        <FlaskConical className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">Testes e Validações</p>
                          <p className="text-xs text-muted-foreground">
                            Validação humana de análises e auditoria de corpus
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <Link to="/auth" className="flex-1" onClick={() => trackBannerClick('login')}>
                        <Button className="w-full gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                          <LogIn className="w-4 h-4" />
                          Fazer Login
                        </Button>
                      </Link>
                      
                      <Link to="/auth?tab=invite" className="flex-1" onClick={() => trackBannerClick('invite')}>
                        <Button variant="outline" className="w-full gap-2 border-2">
                          <Mail className="w-4 h-4" />
                          Tenho um Convite
                        </Button>
                      </Link>
                    </div>

                    <div className="flex justify-center pt-3">
                      <Dialog open={showAccessForm} onOpenChange={setShowAccessForm}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary">
                            <Send className="w-4 h-4" />
                            Solicitar Acesso Especial para Pesquisadores
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Solicitar Acesso - Professores e Pesquisadores</DialogTitle>
                            <DialogDescription>
                              Preencha o formulário abaixo e entraremos em contato com um convite personalizado.
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleAccessRequest)} className="space-y-4">
                              <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nome Completo *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Seu nome completo" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Máximo 100 caracteres
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email Institucional *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="email"
                                        placeholder="seu.email@universidade.edu.br" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Preferencialmente email institucional
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="institution"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Instituição</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Ex: UFRGS, UFPE, USP" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Opcional - Máximo 200 caracteres
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="role_requested"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Você é: *</FormLabel>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="professor">Professor</SelectItem>
                                        <SelectItem value="pesquisador">Pesquisador</SelectItem>
                                        <SelectItem value="estudante">Estudante de Pós-Graduação</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Justificativa (opcional)</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Conte-nos brevemente sobre sua pesquisa ou interesse na plataforma..." 
                                        rows={3}
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Opcional - Máximo 1000 caracteres
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="flex gap-3 justify-end">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => {
                                    setShowAccessForm(false);
                                    form.reset();
                                  }}
                                  disabled={form.formState.isSubmitting}
                                >
                                  Cancelar
                                </Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                  {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      💡 <strong>Novo:</strong> Agora pesquisadores podem solicitar acesso especial diretamente!
                    </p>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </motion.div>
        )}
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="intro" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Introdução</span>
            </TabsTrigger>
            <TabsTrigger value="dominios" className="flex items-center gap-2" data-tour="tab-dominios">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Domínios</span>
            </TabsTrigger>
            <TabsTrigger value="estatisticas" className="flex items-center gap-2" data-tour="tab-estatisticas">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="nuvem" className="flex items-center gap-2" data-tour="tab-nuvem">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Nuvem</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="intro" className="space-y-6 mt-6">
            {/* Texto introdutório */}
            <div className="prose prose-sm max-w-none">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Quando o Verso Vem pras Casa: O Portal de Entrada</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A escolha da canção <strong>"Quando o Verso Vem pras Casa"</strong> parte de um profundo vínculo afetivo do pesquisador. 
                Por ter sido a primeira música gaúcha que ouviu, ela despertou o fascínio por um universo linguístico percebido como 
                quase estrangeiro. Essa curiosidade inicial, aliada à jornada acadêmica que o conduziu à UFRGS e à sua orientadora, 
                amadureceu o desejo de não apenas fruir, mas de compreender profundamente essa riqueza cultural.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Dessa confluência de afetos e investigações, nasce o <strong>VersoAustral</strong>.
              </p>
            </div>

            <Alert className="bg-primary/5 border-primary/20">
              <Music className="h-4 w-4" />
              <AlertTitle>O que você verá nas abas seguintes</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p><strong>Domínios:</strong> Distribuição temática comparativa entre o corpus gaúcho e corpus de referência nordestino</p>
                <p><strong>Estatísticas:</strong> Métricas de keyness (Log-Likelihood e Mutual Information) revelando palavras-chave características</p>
                <p><strong>Nuvem:</strong> Visualização semântica interativa dos domínios predominantes</p>
            </AlertDescription>
          </Alert>

          {/* Letra da música + Player */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2" data-tour="letra-musica">
                <Card className="card-academic">
                  <CardHeader>
                    <CardTitle className="text-lg">Letra da Música</CardTitle>
                    <CardDescription>Luiz Marenco - Quando o verso vem pras casa</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-line text-sm text-foreground leading-relaxed">
                      {`A calma do tarumã, ganhou sombra mais copada
Pela várzea espichada com o sol da tarde caindo
Um pañuelo maragato se abriu no horizonte
Trazendo um novo reponte, prá um fim de tarde bem lindo

Daí um verso de campo se chegou da campereada
No lombo de uma gateada frente aberta de respeito
Desencilhou na ramada, já cansado das lonjuras
Mas estampando a figura, campeira, bem do seu jeito

Cevou um mate pura-folha, jujado de maçanilha
E um ventito da coxilha trouxe coplas entre as asas
Prá querência galponeira, onde o verso é mais caseiro
Templado a luz de candeeiro e um "quarto gordo nas brasa"

A mansidão da campanha traz saudades feito açoite
Com os olhos negros de noite que ela mesmo aquerenciou
E o verso que tinha sonhos prá rondar na madrugada
Deixou a cancela encostada e a tropa se desgarrou

E o verso sonhou ser várzea com sombra de tarumã
Ser um galo prás manhãs, ou um gateado prá encilha
Sonhou com os olhos da prenda vestidos de primavera
Adormecidos na espera do sol pontear na coxilha

Ficaram arreios suados e o silencio de esporas
Um cerne com cor de aurora queimando em fogo de chão
Uma cuia e uma bomba recostada na cambona
E uma saudade redomona pelos cantos do galpão`}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div data-tour="music-player">
                <Card className="card-academic">
                  <CardHeader>
                    <CardTitle className="text-base">Ouça a canção</CardTitle>
                    <CardDescription>Player integrado do YouTube</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video rounded-lg overflow-hidden border border-border shadow-sm">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://www.youtube.com/embed/uaRc4k-Rxpo" 
                        title="Quando o verso vem pras casa - Luiz Marenco" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen 
                        className="w-full h-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            {/* Card de Carregamento do Corpus Demo */}
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Database className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg mb-2">
                    Carregue o Corpus de Demonstração
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Clique para processar a música "Quando o Verso Vem pras Casa" 
                    através do pipeline completo de anotação semântica.
                  </p>
                </div>
                <Button 
                  size="lg" 
                  onClick={handleLoadCorpus}
                  disabled={corpusLoaded}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {corpusLoaded 
                    ? '✓ Corpus Processado' 
                    : 'Processar Corpus "Quando o Verso vem pras Casa"'
                  }
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dominios" className="mt-6" ref={tabsRef}>
            <TabDomains demo={!corpusLoaded} songId={corpusLoaded ? demoSongId : undefined} />
          </TabsContent>

          <TabsContent value="estatisticas" className="mt-6">
            <TabStatistics demo={!corpusLoaded} songId={corpusLoaded ? demoSongId : undefined} />
          </TabsContent>

          <TabsContent value="nuvem" className="mt-6">
            <TabGalaxy demo={!corpusLoaded} songId={corpusLoaded ? demoSongId : undefined} />
          </TabsContent>
        </Tabs>

        {/* Modal de Loading */}
        <CorpusLoadingModal 
          open={showLoadingModal} 
          songId={demoSongId}
          onComplete={handleLoadingComplete} 
        />
      </CardContent>
    </Card>
  );
}
