import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface LogEntry {
  function_name: string;
  request_method: string;
  request_path?: string;
  request_ip?: string;
  user_id?: string;
  user_role?: string;
  status_code: number;
  response_time_ms?: number;
  request_payload?: any;
  response_payload?: any;
  rate_limited?: boolean;
  rate_limit_remaining?: number;
  error_message?: string;
  error_stack?: string;
  user_agent?: string;
  referer?: string;
}

export class EdgeFunctionLogger {
  private supabase: any;
  private startTime: number;

  constructor(private functionName: string) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.startTime = Date.now();
  }

  /**
   * Log de requisição (início)
   */
  logRequest(req: Request, userId?: string, userRole?: string) {
    console.log(`[${this.functionName}] ${req.method} ${req.url}`, {
      user: userId || 'anonymous',
      role: userRole || 'none',
      ip: req.headers.get('x-forwarded-for') || 'unknown'
    });
  }

  /**
   * Log de resposta (fim) - Salva no banco
   */
  async logResponse(
    req: Request,
    status: number,
    options: {
      userId?: string;
      userRole?: string;
      requestPayload?: any;
      responsePayload?: any;
      rateLimited?: boolean;
      rateLimitRemaining?: number;
      error?: Error;
    } = {}
  ) {
    const responseTime = Date.now() - this.startTime;

    const logEntry: LogEntry = {
      function_name: this.functionName,
      request_method: req.method,
      request_path: new URL(req.url).pathname,
      request_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_id: options.userId,
      user_role: options.userRole,
      status_code: status,
      response_time_ms: responseTime,
      request_payload: this.sanitizePayload(options.requestPayload),
      response_payload: this.sanitizePayload(options.responsePayload),
      rate_limited: options.rateLimited || false,
      rate_limit_remaining: options.rateLimitRemaining,
      error_message: options.error?.message,
      error_stack: options.error?.stack,
      user_agent: req.headers.get('user-agent') || undefined,
      referer: req.headers.get('referer') || undefined
    };

    try {
      // Salvar no banco de forma assíncrona (fire and forget)
      this.supabase
        .from('edge_function_logs')
        .insert(logEntry)
        .then(() => console.log(`[${this.functionName}] Log saved`))
        .catch((err: any) => console.error(`[${this.functionName}] Failed to save log:`, err));

    } catch (error) {
      console.error(`[${this.functionName}] Logging error:`, error);
    }

    // Log no console para Supabase Edge Logs
    console.log(`[${this.functionName}] ${status} - ${responseTime}ms`, {
      user: options.userId || 'anonymous',
      rateLimited: options.rateLimited,
      error: options.error?.message
    });
  }

  /**
   * Sanitizar payloads para remover dados sensíveis
   */
  private sanitizePayload(payload: any): any {
    if (!payload) return null;

    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    const sanitized = JSON.parse(JSON.stringify(payload));

    const redact = (obj: any) => {
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          redact(obj[key]);
        }
      }
    };

    redact(sanitized);
    return sanitized;
  }
}
