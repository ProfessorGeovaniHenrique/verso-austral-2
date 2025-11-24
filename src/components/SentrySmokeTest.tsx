import { Button } from "@/components/ui/button";
import { AlertTriangle, Bug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { captureException } from "@/lib/sentry";
import { toast } from "@/hooks/use-toast";

/**
 * Component for testing Sentry integration in development
 * Provides buttons to force frontend and backend errors
 */
export const SentrySmokeTest = () => {
  if (import.meta.env.PROD) return null;

  const testFrontendError = () => {
    try {
      // Create deliberate error
      const testError = new Error('🧪 Sentry Frontend Smoke Test - This is a deliberate error');
      
      // Manually capture and send to Sentry
      captureException(testError, {
        level: 'error',
        tags: {
          test_type: 'smoke_test',
          trigger: 'manual_button_click',
          category: 'frontend_test'
        },
        extra: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      });
      
      toast({
        title: "Error Sent to Sentry",
        description: "Check your Sentry dashboard for the test error",
        variant: "default",
      });
      
      console.log('✅ Test error captured and sent to Sentry');
    } catch (err) {
      console.error('Failed to send test error:', err);
    }
  };

  const testBackendError = async () => {
    try {
      const { error } = await supabase.functions.invoke('test-sentry-error', {
        body: { test: true }
      });
      
      if (error) {
        console.error('Backend test error captured:', error);
      }
    } catch (err) {
      console.error('Error calling test function:', err);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 p-4 bg-destructive/10 border border-destructive/30 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="text-xs font-mono text-destructive">DEV MODE - Sentry Tests</span>
      </div>
      
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={testFrontendError}
          className="text-xs"
        >
          <Bug className="h-3 w-3 mr-1" />
          Force Frontend Error
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={testBackendError}
          className="text-xs"
        >
          <Bug className="h-3 w-3 mr-1" />
          Force Backend Error
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        Check Sentry dashboard after clicking
      </p>
    </div>
  );
};
