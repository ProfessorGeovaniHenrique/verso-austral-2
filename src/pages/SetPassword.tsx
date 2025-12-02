import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('SetPassword');

const setPasswordSchema = z.object({
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

interface InviteData {
  token: string;
  invite_code: string;
  invite_id: string;
  recipient_email: string;
  recipient_name: string;
  role: string;
}

export default function SetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const form = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Tenta recuperar dados do convite de sessionStorage
    const storedInvite = sessionStorage.getItem("invite_data");
    
    if (storedInvite) {
      try {
        const parsedInvite = JSON.parse(storedInvite);
        setInviteData(parsedInvite);
      } catch (error) {
        log.error("Erro ao parsear dados do convite", error as Error);
        toast({
          title: "Erro",
          description: "Dados do convite inválidos. Por favor, solicite um novo convite.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    } else {
      // Se não há dados no sessionStorage, redireciona para auth
      toast({
        title: "Convite não encontrado",
        description: "Por favor, clique no link do convite novamente.",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [navigate, toast]);

  const handleSubmit = async (data: SetPasswordFormData) => {
    if (!inviteData) {
      toast({
        title: "Erro",
        description: "Dados do convite não encontrados.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Criar conta com a senha definida pelo usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteData.recipient_email,
        password: data.password,
        options: {
          data: {
            full_name: inviteData.recipient_name,
          },
        },
      });

      if (authError) {
        // Tratar caso de email já existente
        if (authError.message.includes("already") || authError.message.includes("User already registered")) {
          log.info("Email já existe, enviando reset de senha...");
          
          // Enviar email de redefinição de senha
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            inviteData.recipient_email,
            {
              redirectTo: `${window.location.origin}/reset-password`,
            }
          );

          if (resetError) {
            log.error("Erro ao enviar reset de senha", resetError as Error);
          }

          toast({
            title: "Conta já existe",
            description: "Você já possui uma conta. Enviamos um email para redefinir sua senha.",
          });

          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        throw authError;
      }

      if (!authData.user) {
        throw new Error("Usuário não foi criado");
      }

      // 2. Marcar convite como usado
      const { error: markError } = await supabase.rpc("mark_invite_as_used", {
        p_invite_id: inviteData.invite_id,
        p_user_id: authData.user.id,
      });

      if (markError) {
        log.error("Erro ao marcar convite como usado", markError as Error);
        // Não bloqueia o fluxo, apenas loga o erro
      }

      // 3. Limpar sessionStorage
      sessionStorage.removeItem("invite_data");

      // 4. Fazer login automático (já deve estar logado após signUp)
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        // Se não estiver logado, fazer login explícito
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: inviteData.recipient_email,
          password: data.password,
        });

        if (signInError) {
          log.error("Erro ao fazer login automático", signInError as Error);
          toast({
            title: "Conta criada",
            description: "Sua conta foi criada. Por favor, faça login.",
          });
          navigate("/auth");
          return;
        }
      }

      // 5. Sucesso! Redirecionar para onboarding
      toast({
        title: "Bem-vindo!",
        description: "Sua conta foi criada com sucesso.",
      });

      navigate("/onboarding");
    } catch (error: any) {
      log.error("Erro ao criar conta", error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Ocorreu um erro. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Defina sua senha</CardTitle>
          <CardDescription>
            Olá, {inviteData.recipient_name}! <br />
            Crie uma senha segura para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar Conta"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
