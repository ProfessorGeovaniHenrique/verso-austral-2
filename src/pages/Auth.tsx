import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logoVersoAustral from "@/assets/logo-versoaustral-completo.png";
import { createLogger } from "@/lib/loggerFactory";

const loginSchema = z.object({
  email: z.string().email("Email inválido").trim(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = z.object({
  email: z.string().email("Email inválido").trim(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const inviteSchema = z.object({
  email: z.string().email("Email inválido").trim(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  inviteKey: z.string().min(8, "Código do convite inválido").trim().toUpperCase(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type InviteFormData = z.infer<typeof inviteSchema>;

const log = createLogger('Auth');

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithInvite } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  
  log.info('Auth page mounted', { activeTab });

  // Redirect se já estiver logado
  useEffect(() => {
    if (user) {
      const hasSeenOnboarding = localStorage.getItem('onboarding_completed');
      const redirectPath = !hasSeenOnboarding ? "/onboarding" : "/dashboard-mvp";
      
      log.logNavigation('/auth', redirectPath);
      
      navigate(redirectPath);
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    log.info('Login attempt started', { email: data.email });
    
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) throw error;

      log.success('Login successful', { email: data.email });
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard-mvp");
    } catch (error: any) {
      log.error('Login failed', error, { email: data.email });
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    log.info('Signup attempt started', { email: data.email });
    
    try {
      const { error } = await signUp(data.email, data.password);
      if (error) throw error;

      log.success('Signup successful', { email: data.email });
      toast.success("Conta criada! Você já pode fazer login.");
      setActiveTab("login");
      signupForm.reset();
    } catch (error: any) {
      log.error('Signup failed', error, { email: data.email });
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSignup = async (data: InviteFormData) => {
    setIsLoading(true);
    log.info('Invite signup attempt started', { email: data.email, inviteKey: data.inviteKey });
    
    try {
      const { error } = await signInWithInvite(
        data.email,
        data.password,
        data.inviteKey
      );

      if (error) throw error;

      log.success('Invite signup successful', { email: data.email, inviteKey: data.inviteKey });
      toast.success("Conta criada com sucesso! Faça login para continuar.");
      setActiveTab("login");
      inviteForm.reset();
    } catch (error: any) {
      log.error('Invite signup failed', error, { email: data.email, inviteKey: data.inviteKey });
      toast.error(error.message || "Erro ao processar convite");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-primary/20 animate-in fade-in-50 duration-500">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={logoVersoAustral} 
              alt="VersoAustral" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-heading text-primary">
              Bem-vindo ao VersoAustral
            </CardTitle>
            <CardDescription>
              Plataforma de Análise de Estilística de Corpus
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="invite">Convite</TabsTrigger>
          </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full btn-versoaustral-secondary"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Button
                  variant="link"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Esqueceu sua senha?
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="invite" className="space-y-4">
              <form onSubmit={inviteForm.handleSubmit(handleInviteSignup)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="seu@email.com"
                    {...inviteForm.register("email")}
                  />
                  {inviteForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {inviteForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Senha</Label>
                  <Input
                    id="invite-password"
                    type="password"
                    placeholder="••••••••"
                    {...inviteForm.register("password")}
                  />
                  {inviteForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {inviteForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-key">Código do Convite</Label>
                  <Input
                    id="invite-key"
                    type="text"
                    placeholder="VA-XXXX-XXXX"
                    {...inviteForm.register("inviteKey")}
                    className="uppercase"
                  />
                  {inviteForm.formState.errors.inviteKey && (
                    <p className="text-sm text-destructive">
                      {inviteForm.formState.errors.inviteKey.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full btn-versoaustral-secondary"
                  disabled={isLoading}
                >
                  {isLoading ? "Processando..." : "Criar Conta com Convite"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-primary"
            >
              ← Voltar para home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
