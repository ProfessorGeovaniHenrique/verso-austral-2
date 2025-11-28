import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Verso Austral <onboarding@resend.dev>";
const RESEND_REPLY_TO = Deno.env.get("RESEND_REPLY_TO");
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

    // Generate invite key for tracking
    const { data: keyCode, error: keyError } = await supabase.rpc("generate_invite_key");
    
    if (keyError || !keyCode) {
      console.error("Error generating key:", keyError);
      return new Response(JSON.stringify({ error: "Failed to generate invite code" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate random secure password (user will reset it)
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();

    // 1. Create user with admin API or get existing user
    console.log(`Creating user: ${recipientEmail}`);
    let userId: string;
    let isNewUser = true;
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: recipientEmail,
      password: randomPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: recipientName,
        invited_by: user.id,
      },
    });

    if (createError) {
      // If user already exists, get their ID
      if (createError.message.includes("already") || createError.code === "email_exists") {
        console.log("User already exists, fetching existing user...");
        isNewUser = false;
        
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
          console.error("Error listing users:", listError);
          return new Response(JSON.stringify({ 
            error: "User exists but failed to fetch details", 
            details: listError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const existingUser = existingUsers.users.find(u => u.email === recipientEmail);
        
        if (!existingUser) {
          return new Response(JSON.stringify({ 
            error: "User exists but could not be found",
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        userId = existingUser.id;
        console.log(`Found existing user: ${userId}`);
      } else {
        console.error("Error creating user:", createError);
        return new Response(JSON.stringify({ 
          error: "Failed to create user", 
          details: createError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      if (!newUser.user) {
        return new Response(JSON.stringify({ error: "User creation failed - no user returned" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;
      console.log(`User created successfully: ${userId}`);
    }

    // 2. Assign role to user (if new user or role doesn't exist)
    if (isNewUser) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role,
        });

      if (roleError) {
        console.error("Error assigning role:", roleError);
        // Continue anyway - user is created, role can be assigned manually
      }
    } else {
      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", role)
        .single();
      
      if (!existingRole) {
        console.log("Adding role to existing user...");
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: role,
          });

        if (roleError) {
          console.error("Error assigning role to existing user:", roleError);
        }
      } else {
        console.log("User already has this role");
      }
    }

    // 3. Update invite_keys to mark as used
    const { error: updateInviteError } = await supabase
      .from("invite_keys")
      .insert({
        key_code: keyCode,
        role: role,
        created_by: user.id,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        used_by: userId,
        used_at: new Date().toISOString(),
        is_active: false,
        notes: isNewUser 
          ? `Usuário criado automaticamente e email de reset enviado para ${recipientEmail}`
          : `Usuário já existia. Email de reset enviado para ${recipientEmail}`,
      });

    if (updateInviteError) {
      console.error("Error updating invite:", updateInviteError);
      // Continue anyway
    }

    // 4. Generate password reset link
    console.log("Generating password reset link...");
    const { data: resetData, error: resetLinkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: recipientEmail,
      options: {
        redirectTo: `${SITE_URL}/auth`,
      },
    });

    if (resetLinkError || !resetData) {
      console.error("Error generating reset link:", resetLinkError);
      return new Response(JSON.stringify({ 
        error: isNewUser ? "User created but failed to generate reset link" : "Failed to generate reset link",
        userId: userId,
        details: resetLinkError?.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resetUrl = resetData.properties?.action_link || resetData.properties?.hashed_token 
      ? `${SITE_URL}/auth/reset-password?token=${resetData.properties.hashed_token}` 
      : `${SITE_URL}/auth`;

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
            
            <p>Sua conta foi criada na plataforma <strong>Verso Austral</strong> como <strong>${role === "evaluator" ? "Avaliador" : "Usuário"}</strong>.</p>
            
            <p>Para definir sua senha e acessar a plataforma, clique no botão abaixo:</p>
            
            <center>
              <a href="${resetUrl}" class="button">🔐 Definir Minha Senha</a>
            </center>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>Email da conta:</strong> <span class="code">${recipientEmail}</span><br>
              <small style="color: #6b7280;">Use este email para fazer login após definir sua senha.</small>
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
              <strong>Nota:</strong> Este link expira em 24 horas. Se você não solicitou esta conta, pode ignorar este email.
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
    console.log(`Attempting to send email to ${recipientEmail} from ${RESEND_FROM_EMAIL}`);
    
    let emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [recipientEmail],
        reply_to: RESEND_REPLY_TO || undefined,
        subject: `🎵 Sua conta no Verso Austral - ${role === "evaluator" ? "Avaliador" : "Usuário"}`,
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
            from: RESEND_FROM_EMAIL,
            to: [emailTo],
            reply_to: RESEND_REPLY_TO || undefined,
            subject: `[DEV] 🎵 Conta criada para ${recipientName} - Verso Austral`,
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

    console.log(`Password reset email sent successfully to ${emailTo}${isDevelopmentMode ? ` (intended for ${recipientEmail})` : ''}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isDevelopmentMode 
          ? `${isNewUser ? 'Conta criada' : 'Usuário existente'} e email enviado para ${emailTo} (modo desenvolvimento - destinatário: ${recipientEmail})`
          : `${isNewUser ? 'Conta criada com sucesso' : 'Email de redefinição de senha enviado'}. Email enviado para ${recipientEmail}`,
        userId: userId,
        keyCode: keyCode,
        emailId: emailResult.id,
        developmentMode: isDevelopmentMode,
        isNewUser: isNewUser
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