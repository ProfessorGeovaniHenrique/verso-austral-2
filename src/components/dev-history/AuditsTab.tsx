import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  LayoutList, 
  GitBranch, 
  BarChart3,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { auditsRegistry, getCoverageStats, getPendingSprints } from "@/data/developer-logs/audits-registry";
import { AuditCard } from "./AuditCard";
import { RemediationTimeline } from "./RemediationTimeline";
import { CoverageSummary } from "./CoverageSummary";
import { AuditFindingsTable } from "./AuditFindingsTable";

export function AuditsTab() {
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const stats = getCoverageStats();
  const pendingSprints = getPendingSprints();

  const allSprints = auditsRegistry.flatMap(a => 
    a.remediationSprints.map(s => ({ ...s, auditRef: a.name.split(' - ')[0] }))
  ).sort((a, b) => {
    if (a.completedDate && b.completedDate) {
      return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
    }
    return a.completedDate ? -1 : 1;
  });

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{auditsRegistry.length}</p>
                <p className="text-xs text-muted-foreground">Auditorias</p>
              </div>
              <Shield className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.totalFindings}</p>
                <p className="text-xs text-muted-foreground">Findings</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">{stats.resolvedFindings}</p>
                <p className="text-xs text-muted-foreground">Resolvidos</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.totalSprints}</p>
                <p className="text-xs text-muted-foreground">Sprints</p>
              </div>
              <GitBranch className="h-8 w-8 text-purple-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/5 to-cyan-500/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.coveragePercent}%</p>
                <p className="text-xs text-muted-foreground">Cobertura</p>
              </div>
              <BarChart3 className="h-8 w-8 text-cyan-500/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Shield className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="findings" className="gap-2">
            <LayoutList className="h-4 w-4" />
            Findings
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="coverage" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Cobertura
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Pending Sprints Alert */}
          {pendingSprints.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  {pendingSprints.length} Sprints Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {pendingSprints.map(s => (
                    <Badge key={s.id} variant="outline" className="gap-1">
                      <span className={
                        s.priority === 'P0' ? 'text-red-600' :
                        s.priority === 'P1' ? 'text-orange-600' : 'text-amber-600'
                      }>
                        {s.priority}
                      </span>
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {auditsRegistry.map((audit) => (
              <AuditCard key={audit.id} audit={audit} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="findings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Todos os Findings</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditFindingsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline de Remediação</CardTitle>
              <p className="text-sm text-muted-foreground">
                Todos os sprints ordenados por data de conclusão
              </p>
            </CardHeader>
            <CardContent>
              <RemediationTimeline sprints={allSprints} showAuditRef />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="mt-6">
          <CoverageSummary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
