// Sentry for Deno Edge Functions
// Using fetch-based implementation since @sentry/node doesn't work in Deno

const SENTRY_DSN = Deno.env.get("SENTRY_DSN_BACKEND");
const ENVIRONMENT = Deno.env.get("ENVIRONMENT") || "production";

interface SentryEvent {
  message?: string;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames: Array<{
          filename: string;
          function: string;
          lineno: number;
        }>;
      };
    }>;
  };
  level: "fatal" | "error" | "warning" | "info" | "debug";
  timestamp: number;
  environment: string;
  server_name?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  breadcrumbs?: Array<{
    timestamp: number;
    message: string;
    category?: string;
    level?: string;
    data?: Record<string, unknown>;
  }>;
}

class SentryClient {
  private dsn: string | undefined;
  private breadcrumbs: SentryEvent["breadcrumbs"] = [];

  constructor() {
    this.dsn = SENTRY_DSN;
  }

  async captureException(
    error: Error,
    context?: {
      functionName?: string;
      userId?: string;
      requestId?: string;
      extra?: Record<string, unknown>;
    }
  ): Promise<void> {
    if (!this.dsn) {
      console.error("Sentry DSN not configured");
      return;
    }

    const event: SentryEvent = {
      exception: {
        values: [
          {
            type: error.name,
            value: error.message,
            stacktrace: this.parseStackTrace(error.stack),
          },
        ],
      },
      level: "error",
      timestamp: Date.now() / 1000,
      environment: ENVIRONMENT,
      server_name: context?.functionName,
      tags: {
        function: context?.functionName || "unknown",
        userId: context?.userId || "anonymous",
      },
      extra: {
        requestId: context?.requestId,
        ...context?.extra,
      },
      breadcrumbs: this.breadcrumbs,
    };

    await this.sendToSentry(event);
  }

  async captureMessage(
    message: string,
    level: SentryEvent["level"] = "info",
    context?: {
      functionName?: string;
      extra?: Record<string, unknown>;
    }
  ): Promise<void> {
    if (!this.dsn) return;

    const event: SentryEvent = {
      message,
      level,
      timestamp: Date.now() / 1000,
      environment: ENVIRONMENT,
      server_name: context?.functionName,
      extra: context?.extra,
      breadcrumbs: this.breadcrumbs,
    };

    await this.sendToSentry(event);
  }

  addBreadcrumb(
    message: string,
    data?: Record<string, unknown>,
    category?: string
  ): void {
    if (!this.breadcrumbs) {
      this.breadcrumbs = [];
    }
    
    this.breadcrumbs.push({
      timestamp: Date.now() / 1000,
      message,
      category: category || "default",
      level: "info",
      data,
    });

    // Keep only last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50);
    }
  }

  private parseStackTrace(
    stack?: string
  ): { frames: Array<{ filename: string; function: string; lineno: number }> } | undefined {
    if (!stack) return undefined;

    const frames = stack
      .split("\n")
      .slice(1)
      .map((line) => {
        const match = line.match(/at (.+) \((.+):(\d+):\d+\)/);
        if (match) {
          return {
            function: match[1],
            filename: match[2],
            lineno: parseInt(match[3]),
          };
        }
        return null;
      })
      .filter((frame): frame is NonNullable<typeof frame> => frame !== null);

    return { frames };
  }

  private async sendToSentry(event: SentryEvent): Promise<void> {
    try {
      const projectId = this.extractProjectId(this.dsn!);
      const publicKey = this.extractPublicKey(this.dsn!);
      
      const sentryUrl = `https://sentry.io/api/${projectId}/store/`;
      
      await fetch(sentryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=deno-edge/1.0.0`,
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error("Failed to send to Sentry:", error);
    }
  }

  private extractProjectId(dsn: string): string {
    const match = dsn.match(/\/\/(.+)@.+\/(\d+)/);
    return match ? match[2] : "";
  }

  private extractPublicKey(dsn: string): string {
    const match = dsn.match(/\/\/(.+)@/);
    return match ? match[1] : "";
  }
}

// Singleton instance
const sentry = new SentryClient();

export default sentry;
export const captureException = sentry.captureException.bind(sentry);
export const captureMessage = sentry.captureMessage.bind(sentry);
export const addBreadcrumb = sentry.addBreadcrumb.bind(sentry);
