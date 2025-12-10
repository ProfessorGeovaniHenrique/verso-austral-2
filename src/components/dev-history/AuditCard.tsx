import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Shield, 
  Zap, 
  Palette, 
  Building2, 
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle
} from "lucide-react";
import type { Audit, RemediationSprint } from "@/data/developer-logs/audits-registry";

interface AuditCardProps {
  audit: Audit;
}

const typeIcons = {
  security: Shield,
  performance: Zap,
  ux: Palette,
  architecture: Building2,
  comprehensive: Layers
};

const typeColors = {
  security: 'bg-red-500/10 text-red-600 border-red-500/20',
  performance: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  ux: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  architecture: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  comprehensive: 'bg-green-500/10 text-green-600 border-green-500/20'
};

const severityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500'
};

const sprintStatusIcons = {
  completed: CheckCircle2,
  'in-progress': Clock,
  planned: AlertCircle,
  blocked: XCircle
};

const sprintStatusColors = {
  completed: 'text-green-600',
  'in-progress': 'text-amber-600',
  planned: 'text-muted-foreground',
  blocked: 'text-red-600'
};

export function AuditCard({ audit }: AuditCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const TypeIcon = typeIcons[audit.type];

  const severityCounts = {
    critical: audit.findings.filter(f => f.severity === 'critical').length,
    high: audit.findings.filter(f => f.severity === 'high').length,
    medium: audit.findings.filter(f => f.severity === 'medium').length,
    low: audit.findings.filter(f => f.severity === 'low').length
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeColors[audit.type]}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{audit.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {audit.date} • {audit.auditor} • {audit.scope}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={typeColors[audit.type]}>
            {audit.type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cobertura de Remediação</span>
            <span className="font-medium">{audit.summary.coveragePercent}%</span>
          </div>
          <Progress value={audit.summary.coveragePercent} className="h-2" />
        </div>

        {/* Severity Counts */}
        <div className="flex items-center gap-2 flex-wrap">
          {severityCounts.critical > 0 && (
            <Badge variant="outline" className="gap-1">
              <span className={`w-2 h-2 rounded-full ${severityColors.critical}`} />
              {severityCounts.critical} Críticas
            </Badge>
          )}
          {severityCounts.high > 0 && (
            <Badge variant="outline" className="gap-1">
              <span className={`w-2 h-2 rounded-full ${severityColors.high}`} />
              {severityCounts.high} Altas
            </Badge>
          )}
          {severityCounts.medium > 0 && (
            <Badge variant="outline" className="gap-1">
              <span className={`w-2 h-2 rounded-full ${severityColors.medium}`} />
              {severityCounts.medium} Médias
            </Badge>
          )}
          {severityCounts.low > 0 && (
            <Badge variant="outline" className="gap-1">
              <span className={`w-2 h-2 rounded-full ${severityColors.low}`} />
              {severityCounts.low} Baixas
            </Badge>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold">{audit.summary.totalFindings}</p>
            <p className="text-xs text-muted-foreground">Findings</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{audit.summary.resolvedFindings}</p>
            <p className="text-xs text-muted-foreground">Resolvidos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{audit.remediationSprints.length}</p>
            <p className="text-xs text-muted-foreground">Sprints</p>
          </div>
        </div>

        {/* Collapsible Sprints */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>Sprints de Remediação</span>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {audit.remediationSprints.map((sprint) => (
              <SprintItem key={sprint.id} sprint={sprint} />
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Effort */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
          <span className="text-muted-foreground">Esforço</span>
          <span>
            <span className="font-medium">{audit.summary.actualEffort || '-'}</span>
            <span className="text-muted-foreground"> / {audit.summary.estimatedEffort} estimado</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function SprintItem({ sprint }: { sprint: RemediationSprint }) {
  const StatusIcon = sprintStatusIcons[sprint.status];
  const completedDeliverables = sprint.deliverables.filter(d => d.completed).length;
  const metCriteria = sprint.acceptanceCriteria.filter(c => c.met).length;

  return (
    <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${sprintStatusColors[sprint.status]}`} />
          <span className="font-medium text-sm">{sprint.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {sprint.priority}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {sprint.actualHours || sprint.estimatedHours}h
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>✅ {completedDeliverables}/{sprint.deliverables.length} entregas</span>
        <span>🎯 {metCriteria}/{sprint.acceptanceCriteria.length} critérios</span>
        {sprint.completedDate && <span>📅 {sprint.completedDate}</span>}
      </div>
    </div>
  );
}
