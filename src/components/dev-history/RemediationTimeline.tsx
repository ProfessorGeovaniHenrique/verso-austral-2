import { CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RemediationSprint } from "@/data/developer-logs/audits-registry";

interface RemediationTimelineProps {
  sprints: RemediationSprint[];
  showAuditRef?: boolean;
}

const statusConfig = {
  completed: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-500', lineColor: 'bg-green-500' },
  'in-progress': { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-500', lineColor: 'bg-amber-500' },
  planned: { icon: AlertCircle, color: 'text-muted-foreground', bgColor: 'bg-muted', lineColor: 'bg-border' },
  blocked: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-500', lineColor: 'bg-red-500' }
};

const priorityColors = {
  'P0': 'bg-red-500/10 text-red-600 border-red-500/30',
  'P1': 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  'P2': 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  'P3': 'bg-green-500/10 text-green-600 border-green-500/30'
};

export function RemediationTimeline({ sprints, showAuditRef = false }: RemediationTimelineProps) {
  return (
    <div className="relative">
      {sprints.map((sprint, index) => {
        const config = statusConfig[sprint.status];
        const StatusIcon = config.icon;
        const isLast = index === sprints.length - 1;
        const completedDeliverables = sprint.deliverables.filter(d => d.completed).length;

        return (
          <div key={sprint.id} className="relative pl-8 pb-6">
            {/* Vertical line */}
            {!isLast && (
              <div 
                className={`absolute left-[11px] top-6 w-0.5 h-[calc(100%-12px)] ${config.lineColor}`}
              />
            )}

            {/* Status dot */}
            <div 
              className={`absolute left-0 top-1 w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center`}
            >
              <StatusIcon className="h-3.5 w-3.5 text-white" />
            </div>

            {/* Content */}
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-medium">{sprint.name}</h4>
                  {showAuditRef && (
                    <p className="text-xs text-muted-foreground">{sprint.auditRef}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={priorityColors[sprint.priority]}>
                    {sprint.priority}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {sprint.actualHours || sprint.estimatedHours}h
                </span>
                <span>
                  {completedDeliverables}/{sprint.deliverables.length} entregas
                </span>
                {sprint.completedDate && (
                  <span className="text-green-600">
                    ✓ {sprint.completedDate}
                  </span>
                )}
                {sprint.status === 'in-progress' && sprint.startDate && (
                  <span className="text-amber-600">
                    Iniciado: {sprint.startDate}
                  </span>
                )}
              </div>

              {/* Deliverables preview */}
              <div className="mt-3 space-y-1">
                {sprint.deliverables.slice(0, 3).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={d.completed ? 'text-green-600' : 'text-muted-foreground'}>
                      {d.completed ? '✓' : '○'}
                    </span>
                    <span className={d.completed ? '' : 'text-muted-foreground'}>
                      {d.description}
                    </span>
                  </div>
                ))}
                {sprint.deliverables.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-5">
                    +{sprint.deliverables.length - 3} mais...
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
