import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInviteRequest {
  recipientEmail: string;
  recipientName: string;
  inviteCode: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, recipientName, inviteCode, role }: SendInviteRequest = await req.json();

    const baseUrl = Deno.env.get("VITE_SUPABASE_URL") || "http://localhost:5173";
    const inviteUrl = `${baseUrl}/auth?tab=invite&code=${inviteCode}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "VersoAustral <noreply@resend.dev>",
        to: [recipientEmail],
        subject: "Convite de Acesso - VersoAustral",
        html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .code-box { background: white; border: 2px dashed #667eea; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Bem-vindo ao VersoAustral!</h1>
              </div>
              <div class="content">
                <p>Olá, <strong>${recipientName}</strong>!</p>
                
                <p>Você foi convidado a acessar a plataforma <strong>VersoAustral</strong> como <strong>${role}</strong>.</p>
                
                <p>O VersoAustral é uma plataforma de análise estilística de corpus voltada para o estudo da linguagem gaúcha e nordestina.</p>
                
                <h3>Como acessar:</h3>
                <ol>
                  <li>Clique no botão abaixo para acessar a página de registro</li>
                  <li>Use o código de convite na aba "Convite"</li>
                  <li>Preencha seus dados e crie sua conta</li>
                </ol>
                
                <div style="text-align: center;">
                  <a href="${inviteUrl}" class="button">Acessar Plataforma</a>
                </div>
                
                <p><strong>Seu código de convite:</strong></p>
                <div class="code-box">${inviteCode}</div>
                
                <p style="color: #e74c3c; font-weight: bold;">⚠️ Este código é de uso único e expira em 7 dias.</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
                
                <p><strong>Sobre o VersoAustral:</strong></p>
                <ul>
                  <li>🔍 Ferramentas de Linguística de Corpus (KWIC, Keywords, N-grams)</li>
                  <li>📊 Análises comparativas entre corpus</li>
                  <li>🎨 Visualizações interativas de domínios semânticos</li>
                  <li>🧪 Validação humana de análises automáticas</li>
                </ul>
                
                <p>Se tiver qualquer dúvida, não hesite em entrar em contato conosco.</p>
                
                <p>Boas análises!<br><strong>Equipe VersoAustral</strong></p>
              </div>
              <div class="footer">
                <p>Este é um email automático. Por favor, não responda.</p>
                <p>VersoAustral - Plataforma de Estilística de Corpus | UFRGS - PPGLET</p>
              </div>
            </div>
          </body>
        </html>
      `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      throw new Error(error.message || 'Failed to send email');
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invite email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
