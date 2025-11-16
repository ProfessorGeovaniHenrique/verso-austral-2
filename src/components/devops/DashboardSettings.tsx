import { useState, useEffect } from 'react';
import { DashboardConfig } from '@/types/devops.types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CONFIG: DashboardConfig = {
  autoRefreshInterval: 30000,
  thresholds: {
    minCoverage: 80,
    maxCITime: 300,
  },
  visibleSections: {
    workflows: true,
    testHistory: true,
    coverage: true,
    corpus: true,
    releases: true,
  },
  chartColors: 'default',
};

interface DashboardSettingsProps {
  config: DashboardConfig;
  onChange: (config: DashboardConfig) => void;
}

export function DashboardSettings({ config, onChange }: DashboardSettingsProps) {
  const [localConfig, setLocalConfig] = useState<DashboardConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    onChange(localConfig);
    localStorage.setItem('devops_dashboard_config', JSON.stringify(localConfig));
    toast.success('Configurações salvas com sucesso!');
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG);
    onChange(DEFAULT_CONFIG);
    localStorage.setItem('devops_dashboard_config', JSON.stringify(DEFAULT_CONFIG));
    toast.info('Configurações restauradas para o padrão');
  };

  const updateConfig = (updates: Partial<DashboardConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...updates }));
  };

  const updateThresholds = (updates: Partial<DashboardConfig['thresholds']>) => {
    setLocalConfig((prev) => ({
      ...prev,
      thresholds: { ...prev.thresholds, ...updates },
    }));
  };

  const updateVisibleSections = (section: keyof DashboardConfig['visibleSections'], visible: boolean) => {
    setLocalConfig((prev) => ({
      ...prev,
      visibleSections: { ...prev.visibleSections, [section]: visible },
    }));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Configurações
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configurações do Dashboard</SheetTitle>
          <SheetDescription>
            Personalize a exibição e o comportamento do dashboard DevOps
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Auto-refresh */}
          <div className="space-y-2">
            <Label>Atualização Automática</Label>
            <Select
              value={localConfig.autoRefreshInterval.toString()}
              onValueChange={(value) => updateConfig({ autoRefreshInterval: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Desligado</SelectItem>
                <SelectItem value="10000">A cada 10 segundos</SelectItem>
                <SelectItem value="30000">A cada 30 segundos</SelectItem>
                <SelectItem value="60000">A cada 1 minuto</SelectItem>
                <SelectItem value="300000">A cada 5 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Thresholds */}
          <div className="space-y-4">
            <Label className="text-base">Limites de Alerta</Label>
            
            <div className="space-y-2">
              <Label htmlFor="minCoverage">Cobertura Mínima (%)</Label>
              <Input
                id="minCoverage"
                type="number"
                min="0"
                max="100"
                value={localConfig.thresholds.minCoverage}
                onChange={(e) => updateThresholds({ minCoverage: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCITime">Tempo Máximo CI (segundos)</Label>
              <Input
                id="maxCITime"
                type="number"
                min="0"
                value={localConfig.thresholds.maxCITime}
                onChange={(e) => updateThresholds({ maxCITime: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Visible Sections */}
          <div className="space-y-4">
            <Label className="text-base">Seções Visíveis</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="workflows">Workflows</Label>
              <Switch
                id="workflows"
                checked={localConfig.visibleSections.workflows}
                onCheckedChange={(checked) => updateVisibleSections('workflows', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="testHistory">Histórico de Testes</Label>
              <Switch
                id="testHistory"
                checked={localConfig.visibleSections.testHistory}
                onCheckedChange={(checked) => updateVisibleSections('testHistory', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="coverage">Cobertura de Testes</Label>
              <Switch
                id="coverage"
                checked={localConfig.visibleSections.coverage}
                onCheckedChange={(checked) => updateVisibleSections('coverage', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="corpus">Métricas do Corpus</Label>
              <Switch
                id="corpus"
                checked={localConfig.visibleSections.corpus}
                onCheckedChange={(checked) => updateVisibleSections('corpus', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="releases">Timeline de Releases</Label>
              <Switch
                id="releases"
                checked={localConfig.visibleSections.releases}
                onCheckedChange={(checked) => updateVisibleSections('releases', checked)}
              />
            </div>
          </div>

          {/* Chart Colors */}
          <div className="space-y-2">
            <Label>Esquema de Cores dos Gráficos</Label>
            <Select
              value={localConfig.chartColors}
              onValueChange={(value: any) => updateConfig({ chartColors: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Padrão</SelectItem>
                <SelectItem value="colorblind">Daltonismo</SelectItem>
                <SelectItem value="highContrast">Alto Contraste</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Salvar Configurações
            </Button>
            <Button onClick={handleReset} variant="outline">
              Restaurar Padrão
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
