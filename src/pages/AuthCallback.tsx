import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('AuthCallback');

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processando convite...");

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get("token");
        const inviteCode = searchParams.get("invite_code");

        if (!token || !inviteCode) {
          setStatus("error");
          setMessage("Link de convite inválido ou expirado.");
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        // Verify invite using SECURITY DEFINER function (bypasses RLS)
        const { data: inviteData, error: inviteError } = await supabase
          .rpc('verify_invite_token', {
            p_token: String(token),
            p_invite_code: String(inviteCode)
          })
          .maybeSingle();

        if (inviteError) {
          log.error("Invite verification error", inviteError as Error);
          setStatus("error");
          setMessage(`Erro ao verificar convite: ${inviteError.message}`);
          setTimeout(() => navigate("/auth"), 5000);
          return;
        }

        if (!inviteData) {
          log.error("No invite data returned - token or code mismatch");
          setStatus("error");
          setMessage("Convite não encontrado. Verifique o link recebido.");
          setTimeout(() => navigate("/auth"), 5000);
          return;
        }

        if (!inviteData.is_valid) {
          log.error("Invite is not valid");
          setStatus("error");
          setMessage("Este convite já foi utilizado ou expirou.");
          setTimeout(() => navigate("/auth"), 5000);
          return;
        }

        // Extract invite data from RPC response
        const invite = {
          id: inviteData.id,
          key_code: inviteData.key_code,
          recipient_email: inviteData.recipient_email,
          recipient_name: inviteData.recipient_name,
          role: inviteData.role
        };

        if (!invite.recipient_email) {
          setStatus("error");
          setMessage("Email não associado a este convite.");
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        // Store invite data in sessionStorage and redirect to set-password
        log.info("Armazenando dados do convite e redirecionando...");
        
        sessionStorage.setItem(
          "invite_data",
          JSON.stringify({
            token,
            invite_code: inviteCode,
            recipient_email: invite.recipient_email,
            recipient_name: invite.recipient_name || invite.recipient_email.split('@')[0],
            role: invite.role,
            invite_id: invite.id,
          })
        );

        setStatus("success");
        setMessage("Convite validado! Redirecionando para definir sua senha...");
        setTimeout(() => navigate("/set-password"), 1000);

      } catch (error: any) {
        log.error("Callback error", error);
        setStatus("error");
        setMessage("Erro ao processar convite. Tente novamente.");
        setTimeout(() => navigate("/auth"), 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-md w-full mx-4 p-8 bg-card rounded-lg shadow-lg border border-border">
        <div className="text-center space-y-4">
          {status === "processing" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">{message}</h2>
              <p className="text-sm text-muted-foreground">Por favor, aguarde...</p>
            </>
          )}
          
          {status === "success" && (
            <>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">Sucesso!</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
            </>
          )}
          
          {status === "error" && (
            <>
              <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
                <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">Erro</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}