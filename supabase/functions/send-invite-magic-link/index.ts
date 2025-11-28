import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || Deno.env.get("SUPABASE_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMagicLinkRequest {
  recipientEmail: string;
  recipientName: string;
  role: "evaluator" | "user";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    
    // Authenticate admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (userRole?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recipientEmail, recipientName, role }: SendMagicLinkRequest = await req.json();

    if (!recipientEmail || !recipientName || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate invite key
    const { data: keyCode, error: keyError } = await supabase.rpc("generate_invite_key");
    
    if (keyError || !keyCode) {
      console.error("Error generating key:", keyError);
      return new Response(JSON.stringify({ error: "Failed to generate invite code" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique magic link token
    const magicToken = crypto.randomUUID();

    // Insert invite with recipient info
    const { error: insertError } = await supabase
      .from("invite_keys")
      .insert({
        key_code: keyCode,
        role: role,
        created_by: user.id,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        magic_link_token: magicToken,
        notes: `Magic link enviado para ${recipientEmail}`,
      });

    if (insertError) {
      console.error("Error inserting invite:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create invite" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construct magic link URL
    const magicLinkUrl = `${SITE_URL}/auth/callback?token=${magicToken}&invite_code=${keyCode}`;

    // Detectar modo de desenvolvimento (Resend não verificado)
    let isDevelopmentMode = false;
    let emailTo = recipientEmail;
    
    // Função para gerar HTML do email
    const generateEmailHTML = (isDevMode: boolean) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .button:hover { opacity: 0.9; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .code { background: #e5e7eb; padding: 10px 15px; border-radius: 6px; font-family: monospace; display: inline-block; margin: 10px 0; }
          .dev-warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 Bem-vindo ao Verso Austral!</h1>
          </div>
          <div class="content">
            ${isDevMode ? `
              <div class="dev-warning">
                <strong>⚠️ MODO DE DESENVOLVIMENTO</strong><br>
                Este email foi enviado para você (admin) porque o domínio Resend ainda não foi verificado.<br>
                <strong>Destinatário real:</strong> ${recipientName} (${recipientEmail})
              </div>
            ` : ''}
            
            <p>Olá, <strong>${recipientName}</strong>!</p>
            
            <p>Você foi convidado para participar da plataforma <strong>Verso Austral</strong> como <strong>${role === "evaluator" ? "Avaliador" : "Usuário"}</strong>.</p>
            
            <p>Para acessar a plataforma, basta clicar no botão abaixo. Você será automaticamente autenticado e direcionado para começar:</p>
            
            <center>
              <a href="${magicLinkUrl}" class="button">✨ Acessar Verso Austral</a>
            </center>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>Código do Convite:</strong> <span class="code">${keyCode}</span><br>
              <small style="color: #6b7280;">Guarde este código caso precise acessar manualmente.</small>
            </p>
            
            ${isDevMode ? `
              <p style="margin-top: 20px; padding: 15px; background: #fee2e2; border-radius: 6px; font-size: 14px;">
                <strong>🔧 Para enviar para outros emails:</strong><br>
                1. Acesse <a href="https://resend.com/domains">resend.com/domains</a><br>
                2. Verifique um domínio<br>
                3. Altere o "from" de <code>onboarding@resend.dev</code> para <code>seu-email@seudominio.com</code>
              </p>
            ` : ''}
            
            <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
              <strong>Nota:</strong> Este link é de uso único e expira em 7 dias. Se você não solicitou este convite, pode ignorar este email.
            </p>
          </div>
          <div class="footer">
            <p>Verso Austral - Plataforma de Análise Cultural e Musical</p>
            <p style="font-size: 12px; color: #9ca3af;">Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Tentar enviar para o destinatário
    console.log(`Attempting to send email to ${recipientEmail}`);
    
    let emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Verso Austral <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `🎵 Convite para Verso Austral - ${role === "evaluator" ? "Avaliador" : "Usuário"}`,
        html: generateEmailHTML(false),
      }),
    });

    // Se falhar com erro 403 (validação), fazer fallback para admin
    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      
      if (errorData.statusCode === 403 && errorData.name === "validation_error") {
        console.log("Development mode detected. Sending to admin email instead:", user.email);
        isDevelopmentMode = true;
        emailTo = user.email || "geovani.henrique@ifsc.edu.br";
        
        // Reenviar para o admin com aviso
        emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Verso Austral <onboarding@resend.dev>",
            to: [emailTo],
            subject: `[DEV] 🎵 Convite para ${recipientName} - Verso Austral`,
            html: generateEmailHTML(true),
          }),
        });
        
        if (!emailResponse.ok) {
          const retryErrorData = await emailResponse.json();
          console.error("Error sending fallback email:", retryErrorData);
          return new Response(JSON.stringify({ 
            error: "Failed to send email even to admin", 
            details: retryErrorData 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        console.error("Error sending email:", errorData);
        return new Response(JSON.stringify({ error: "Failed to send email", details: errorData }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const emailResult = await emailResponse.json();

    // Update sent timestamp
    await supabase
      .from("invite_keys")
      .update({ magic_link_sent_at: new Date().toISOString() })
      .eq("magic_link_token", magicToken);

    console.log(`Magic link sent successfully to ${emailTo}${isDevelopmentMode ? ` (intended for ${recipientEmail})` : ''}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isDevelopmentMode 
          ? `Convite enviado para ${emailTo} (modo desenvolvimento - destinatário: ${recipientEmail})`
          : `Convite enviado para ${recipientEmail}`,
        keyCode: keyCode,
        emailId: emailResult.id,
        developmentMode: isDevelopmentMode
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invite-magic-link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);