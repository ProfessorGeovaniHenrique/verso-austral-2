import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CriticalAlertRequest {
  analysisId: string;
  logsType: "audit" | "performance" | "errors";
  criticalCount: number;
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  criticalIssues: Array<{
    id: string;
    priority: number;
    category: string;
    title: string;
    description: string;
    affectedFiles: string[];
    estimatedEffort: string;
    creditsSaved: string;
  }>;
  timestamp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Health check endpoint - verifica query parameter
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.get('health') === 'true') {
    const health = await createHealthCheck('send-critical-alert', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      analysisId,
      logsType,
      criticalCount,
      summary,
      criticalIssues,
      timestamp,
    }: CriticalAlertRequest = await req.json();

    console.log(`📧 Preparando alerta: ${criticalCount} problemas críticos detectados`);

    // Verificar se realmente há problemas críticos
    if (!criticalIssues || criticalIssues.length === 0) {
      console.log("ℹ️ Nenhum problema crítico, email não enviado");
      return new Response(
        JSON.stringify({ message: "No critical issues, email not sent" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mapear tipo de análise para português
    const analysisTypeMap = {
      audit: "Auditoria",
      performance: "Performance",
      errors: "Erros",
    };

    // Formatar data
    const formattedDate = new Date(timestamp).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Construir HTML dos problemas críticos
    const issuesHtml = criticalIssues
      .map(
        (issue, index) => `
      <div style="margin-bottom: 24px; padding: 20px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px;">
        <h3 style="color: #dc2626; font-size: 18px; font-weight: bold; margin-bottom: 12px;">
          🔴 PROBLEMA CRÍTICO #${index + 1}
        </h3>
        
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Título:</strong> 
          <span style="color: #111827;">${issue.title}</span>
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Categoria:</strong> 
          <span style="color: #111827;">${issue.category}</span>
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Prioridade:</strong> 
          <span style="color: #dc2626; font-weight: bold;">${issue.priority} (Crítico)</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <strong style="color: #374151;">Descrição:</strong>
          <p style="color: #4b5563; margin-top: 4px; line-height: 1.6;">
            ${issue.description}
          </p>
        </div>
        
        ${
          issue.affectedFiles && issue.affectedFiles.length > 0
            ? `
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Arquivos Afetados:</strong>
          <ul style="margin-top: 4px; padding-left: 20px; color: #4b5563;">
            ${issue.affectedFiles.map((file) => `<li>${file}</li>`).join("")}
          </ul>
        </div>
        `
            : ""
        }
        
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Esforço Estimado:</strong> 
          <span style="color: #111827;">${issue.estimatedEffort}</span>
        </div>
        
        <div>
          <strong style="color: #374151;">Economia Potencial:</strong> 
          <span style="color: #059669; font-weight: bold;">${issue.creditsSaved}</span>
        </div>
      </div>
    `
      )
      .join("");

    // Construir email HTML completo
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VersoAustral - Alerta Crítico</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0;">
        🚨 VersoAustral
      </h1>
      <p style="color: #e0e7ff; font-size: 14px; margin: 8px 0 0 0;">
        Sistema de Alertas Críticos
      </p>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px 24px;">
      
      <p style="color: #111827; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Olá,
      </p>
      
      <p style="color: #111827; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
        A análise automática detectou <strong style="color: #dc2626;">${criticalCount} ${
      criticalCount === 1 ? "problema crítico" : "problemas críticos"
    }</strong> que ${criticalCount === 1 ? "requer" : "requerem"} atenção imediata:
      </p>
      
      <!-- Critical Issues -->
      ${issuesHtml}
      
      <!-- Summary Section -->
      <div style="margin-top: 32px; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
        <h3 style="color: #111827; font-size: 18px; font-weight: bold; margin-bottom: 16px;">
          📊 RESUMO DA ANÁLISE
        </h3>
        
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Total de Problemas:</strong> 
          <span style="color: #111827;">${summary.totalIssues}</span>
        </div>
        
        <ul style="margin: 12px 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
          <li>Críticos: <strong style="color: #dc2626;">${summary.critical}</strong></li>
          <li>Altos: <strong style="color: #ea580c;">${summary.high}</strong></li>
          <li>Médios: <strong style="color: #ca8a04;">${summary.medium}</strong></li>
          <li>Baixos: <strong style="color: #65a30d;">${summary.low}</strong></li>
        </ul>
        
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #d1d5db;">
          <div style="margin-bottom: 4px;">
            <strong style="color: #374151;">Tipo de Análise:</strong> 
            <span style="color: #111827;">${analysisTypeMap[logsType]}</span>
          </div>
          <div>
            <strong style="color: #374151;">Data:</strong> 
            <span style="color: #111827;">${formattedDate}</span>
          </div>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="margin-top: 32px; text-align: center;">
        <a href="https://lovable.app/projects" 
           style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Ver Análise Completa no App
        </a>
      </div>
      
    </div>
    
    <!-- Footer -->
    <div style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
        Este é um alerta automático do <strong style="color: #374151;">VersoAustral</strong><br>
        Plataforma de Análise Estilística de Corpus<br>
        <span style="font-size: 11px;">ID da Análise: ${analysisId}</span>
      </p>
    </div>
    
  </div>
</body>
</html>
    `;

    // Enviar email via Resend
    const emailResponse = await resend.emails.send({
      from: "VersoAustral Alert <onboarding@resend.dev>",
      to: ["geovani.henrique@ifsc.edu.br"],
      subject: `🚨 VersoAustral - ${criticalCount} ${
        criticalCount === 1 ? "Problema Crítico Detectado" : "Problemas Críticos Detectados"
      }`,
      html: emailHtml,
    });

    console.log("✅ Email enviado com sucesso:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Alert sent to geovani.henrique@ifsc.edu.br`,
        emailId: emailResponse.data?.id,
        criticalCount: criticalCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Erro ao enviar alerta crítico:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(withInstrumentation('send-critical-alert', handler));
