import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, Circle, Target } from "lucide-react";
import { milestones } from "@/data/developer-logs/product-roadmap";
import { useMemo } from "react";

interface MilestoneProgressProps {
  variant?: 'compact' | 'detailed';
}

function getMilestoneStatus(milestone: typeof milestones[0]) {
  const currentDate = new Date();
  const [quarter, year] = milestone.date.split(' ');
  const quarterNum = parseInt(quarter.replace('Q', ''));
  const targetDate = new Date(parseInt(year), (quarterNum - 1) * 3);
  
  if (currentDate > new Date(targetDate.getFullYear(), targetDate.getMonth() + 3)) {
    return 'completed';
  } else if (currentDate >= targetDate && currentDate <= new Date(targetDate.getFullYear(), targetDate.getMonth() + 3)) {
    return 'current';
  }
  return 'upcoming';
}

export function MilestoneProgress({ variant = 'detailed' }: MilestoneProgressProps) {
  const stats = useMemo(() => {
    const completed = milestones.filter(m => getMilestoneStatus(m) === 'completed').length;
    const current = milestones.filter(m => getMilestoneStatus(m) === 'current').length;
    const upcoming = milestones.filter(m => getMilestoneStatus(m) === 'upcoming').length;
    const total = milestones.length;
    
    return {
      completed,
      current,
      upcoming,
      total,
      completionPercentage: Math.round((completed / total) * 100)
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'current':
        return <Clock className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="header-animated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Marcos do Projeto
          </CardTitle>
          <Badge variant="secondary" className="text-lg font-bold">
            {stats.completionPercentage}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={stats.completionPercentage} className="h-3" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-sm font-medium text-muted-foreground">Completados</p>
            </div>
            <p className="text-3xl font-bold text-success">{stats.completed}</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Em Progresso</p>
            </div>
            <p className="text-3xl font-bold text-primary">{stats.current}</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-muted">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Circle className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Planejados</p>
            </div>
            <p className="text-3xl font-bold">{stats.upcoming}</p>
          </div>
        </div>

        {/* Milestones List */}
        {variant === 'detailed' && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Detalhes dos Marcos
            </h4>
            {milestones.map((milestone, index) => {
              const status = getMilestoneStatus(milestone);
              const isCurrent = status === 'current';
              
              return (
                <div
                  key={milestone.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                    isCurrent 
                      ? 'bg-primary/10 border border-primary/20 shadow-sm' 
                      : 'bg-card hover:bg-muted/50'
                  }`}
                >
                  <div className="mt-0.5">
                    {getStatusIcon(status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
                        {milestone.title}
                      </p>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {milestone.date}
                      </Badge>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {milestone.description}
                      </p>
                    )}
                    {isCurrent && (
                      <Badge variant="default" className="mt-2 text-xs">
                        ← Você está aqui
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
