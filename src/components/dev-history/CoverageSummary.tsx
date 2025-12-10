import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Target,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { getCoverageStats, auditsRegistry, getAllFindings } from "@/data/developer-logs/audits-registry";

export function CoverageSummary() {
  const stats = getCoverageStats();
  const allFindings = getAllFindings();

  const findingsByCategory = {
    security: allFindings.filter(f => f.category === 'security').length,
    performance: allFindings.filter(f => f.category === 'performance').length,
    functional: allFindings.filter(f => f.category === 'functional').length,
    ux: allFindings.filter(f => f.category === 'ux').length,
    accessibility: allFindings.filter(f => f.category === 'accessibility').length
  };

  const auditCoverage = auditsRegistry.map(a => ({
    name: a.name.split(' - ')[0],
    coverage: a.summary.coveragePercent
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalFindings}</p>
                <p className="text-xs text-muted-foreground">Total Findings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.resolvedFindings}</p>
                <p className="text-xs text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedSprints}/{stats.totalSprints}</p>
                <p className="text-xs text-muted-foreground">Sprints</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.coveragePercent}%</p>
                <p className="text-xs text-muted-foreground">Cobertura</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* By Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Findings por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(findingsByCategory).map(([category, count]) => (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{category}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <Progress 
                  value={(count / stats.totalFindings) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By Audit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Cobertura por Auditoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditCoverage.map((audit) => (
              <div key={audit.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[200px]">{audit.name}</span>
                  <span className="font-medium text-green-600">{audit.coverage}%</span>
                </div>
                <Progress 
                  value={audit.coverage} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Effort Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo de Esforço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">{stats.estimatedHours}h</p>
              <p className="text-xs text-muted-foreground">Estimado</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">{stats.actualHours}h</p>
              <p className="text-xs text-muted-foreground">Realizado</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">
                {stats.estimatedHours > 0 
                  ? Math.round((stats.actualHours / stats.estimatedHours) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Eficiência</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">{auditsRegistry.length}</p>
              <p className="text-xs text-muted-foreground">Auditorias</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
