/**
 * ✅ FASE 3 - BLOCO 2: Configurações de Notificações em Tempo Real
 * Permite ativar/desativar notificações e som opcional
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Volume2 } from 'lucide-react';

interface NotificationSettingsProps {
  enabled: boolean;
  soundEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onSoundEnabledChange: (enabled: boolean) => void;
}

export function NotificationSettings({
  enabled,
  soundEnabled,
  onEnabledChange,
  onSoundEnabledChange
}: NotificationSettingsProps) {
  return (
    <Card className="mb-4 border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-primary" />
          Notificações em Tempo Real
        </CardTitle>
        <CardDescription>
          Receba alertas instantâneos sobre o status das importações via Supabase Realtime
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 p-4 transition-colors hover:bg-accent/50">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="notifications-enabled" className="text-sm font-medium cursor-pointer">
                Ativar notificações
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alertas para conclusão, erro, cancelamento e travamento
              </p>
            </div>
          </div>
          <Switch
            id="notifications-enabled"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 p-4 transition-colors hover:bg-accent/50">
          <div className="flex items-center gap-3">
            <Volume2 className={`h-4 w-4 ${enabled ? 'text-muted-foreground' : 'text-muted-foreground/40'}`} />
            <div>
              <Label 
                htmlFor="sound-enabled" 
                className={`text-sm font-medium cursor-pointer ${!enabled && 'opacity-50'}`}
              >
                Som de notificação
              </Label>
              <p className={`text-xs text-muted-foreground mt-0.5 ${!enabled && 'opacity-50'}`}>
                Alerta sonoro quando um job muda de status
              </p>
            </div>
          </div>
          <Switch
            id="sound-enabled"
            checked={soundEnabled}
            disabled={!enabled}
            onCheckedChange={onSoundEnabledChange}
          />
        </div>

        {enabled && (
          <div className="mt-4 rounded-lg bg-primary/10 border border-primary/20 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Bell className="h-3 w-3 text-primary" />
              <span>
                Notificações ativas • Você será alertado instantaneamente quando houver mudanças
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
