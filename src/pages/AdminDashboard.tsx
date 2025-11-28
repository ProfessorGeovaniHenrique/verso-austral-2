import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('AdminDashboard');
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
import { PageToolbar } from "@/components/PageToolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Copy, Check, Calendar, Users, Key, CheckCircle, Database as DatabaseIcon, FileText, BarChart3, Settings, UserCog } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

type InviteKey = Database["public"]["Tables"]["invite_keys"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

interface InviteWithUser extends InviteKey {
  used_by_email?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<InviteWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [roleForInvite, setRoleForInvite] = useState<AppRole>("evaluator");
  const [filterTab, setFilterTab] = useState("all");

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      // Buscar convites com informação do usuário que usou
      const { data, error } = await supabase
        .from("invite_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar emails dos usuários que usaram os convites
      const invitesWithUsers = await Promise.all(
        (data || []).map(async (invite) => {
          if (invite.used_by) {
            const { data: userData } = await supabase.rpc("get_users_with_roles");
            const user = userData?.find((u) => u.id === invite.used_by);
            return { ...invite, used_by_email: user?.email };
          }
          return invite;
        })
      );

      setInvites(invitesWithUsers);
    } catch (error: any) {
      toast.error("Erro ao carregar convites");
      log.error('Erro ao carregar convites', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async () => {
    setCreatingInvite(true);
    try {
      // Gerar código usando a função do banco
      const { data: keyCode, error: keyError } = await supabase
        .rpc("generate_invite_key");

      if (keyError) throw keyError;

      // Inserir convite
      const { error: insertError } = await supabase
        .from("invite_keys")
        .insert({
          key_code: keyCode,
          expires_at: expiresAt || null,
          notes: notes || null,
          role: roleForInvite,
        });

      if (insertError) throw insertError;

      toast.success("Convite criado com sucesso!");
      setIsDialogOpen(false);
      setExpiresAt("");
      setNotes("");
      setRoleForInvite("evaluator");
      fetchInvites();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar convite");
      log.error('Erro ao criar convite', error, { roleForInvite, expiresAt, notes });
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success("Código copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Erro ao copiar código");
    }
  };

  const getFilteredInvites = () => {
    const now = new Date();
    switch (filterTab) {
      case "active":
        return invites.filter(
          (inv) =>
            inv.is_active &&
            !inv.used_at &&
            (!inv.expires_at || new Date(inv.expires_at) > now)
        );
      case "used":
        return invites.filter((inv) => inv.used_at);
      case "expired":
        return invites.filter(
          (inv) => inv.expires_at && new Date(inv.expires_at) <= now && !inv.used_at
        );
      default:
        return invites;
    }
  };

  const filteredInvites = getFilteredInvites();
  const totalInvites = invites.length;
  const usedInvites = invites.filter((inv) => inv.used_at).length;
  const activeInvites = invites.filter(
    (inv) =>
      inv.is_active &&
      !inv.used_at &&
      (!inv.expires_at || new Date(inv.expires_at) > new Date())
  ).length;

  return (
    <>
      <PageToolbar
        onRefresh={fetchInvites}
        showSearch={false}
        rightActions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Convite</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Convite</DialogTitle>
                <DialogDescription>
                  Gere um código de convite para novos usuários
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role a Atribuir</Label>
                  <Select value={roleForInvite} onValueChange={(value) => setRoleForInvite(value as AppRole)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evaluator">Avaliador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires">Data de Expiração (Opcional)</Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (Opcional)</Label>
                  <Input
                    id="notes"
                    placeholder="Ex: Convite para pesquisador fulano"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={generateInvite}
                  disabled={creatingInvite}
                  className="w-full"
                >
                  {creatingInvite ? "Gerando..." : "Gerar Convite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        <AdminBreadcrumb currentPage="Gerenciar Convites" />
        
        {/* Quick Access Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Acesso Rápido</CardTitle>
            <CardDescription>Ferramentas administrativas disponíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card 
                className="hover:shadow-lg transition-all cursor-pointer hover:border-blue-500/50" 
                onClick={() => navigate('/admin/users')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserCog className="h-5 w-5 text-blue-500" />
                    Gerenciar Usuários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Visualize e gerencie usuários cadastrados na plataforma
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-all cursor-pointer hover:border-green-500/50" 
                onClick={() => navigate('/admin/analytics')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Métricas e insights de uso da plataforma
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-all cursor-pointer hover:border-orange-500/50" 
                onClick={() => navigate('/admin/lexicon-setup')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5 text-orange-500" />
                    Configuração de Léxico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Gerencie importações de dicionários e léxicos
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-all cursor-pointer hover:border-red-500/50" 
                onClick={() => navigate('/admin/edge-functions')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DatabaseIcon className="h-5 w-5 text-red-500" />
                    Edge Functions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Monitore e gerencie funções serverless
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-all cursor-pointer hover:border-indigo-500/50" 
                onClick={() => navigate('/admin/metrics')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    Métricas do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Performance e saúde do sistema
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading text-primary">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerenciamento de convites de acesso
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Convites</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInvites}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Convites Usados</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usedInvites}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Convites Disponíveis
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeInvites}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Convites</CardTitle>
            <CardDescription>
              Gerencie todos os códigos de convite criados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={filterTab} onValueChange={setFilterTab}>
              <TabsList>
                <TabsTrigger value="all">Todos ({invites.length})</TabsTrigger>
                <TabsTrigger value="active">Ativos ({activeInvites})</TabsTrigger>
                <TabsTrigger value="used">Usados ({usedInvites})</TabsTrigger>
                <TabsTrigger value="expired">
                  Expirados (
                  {invites.filter(
                    (inv) =>
                      inv.expires_at &&
                      new Date(inv.expires_at) <= new Date() &&
                      !inv.used_at
                  ).length}
                  )
                </TabsTrigger>
              </TabsList>

              <TabsContent value={filterTab} className="mt-4">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">
                    Carregando...
                  </p>
                ) : filteredInvites.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum convite encontrado
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Criado em</TableHead>
                          <TableHead>Expira em</TableHead>
                          <TableHead>Usado por</TableHead>
                          <TableHead>Notas</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvites.map((invite) => {
                          const isExpired =
                            invite.expires_at &&
                            new Date(invite.expires_at) <= new Date();
                          const isUsed = !!invite.used_at;
                          const isActive =
                            invite.is_active && !isUsed && !isExpired;

                          return (
                            <TableRow key={invite.id}>
                              <TableCell className="font-mono font-bold">
                                {invite.key_code}
                              </TableCell>
                              <TableCell>
                                {invite.role === "admin" ? (
                                  <Badge className="bg-red-500/10 text-red-500">
                                    Admin
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-500/10 text-blue-500">
                                    Avaliador
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {isUsed ? (
                                  <Badge variant="outline" className="bg-green-500/10">
                                    Usado
                                  </Badge>
                                ) : isExpired ? (
                                  <Badge variant="outline" className="bg-red-500/10">
                                    Expirado
                                  </Badge>
                                ) : isActive ? (
                                  <Badge variant="outline" className="bg-blue-500/10">
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Inativo</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {invite.created_at
                                  ? format(
                                      new Date(invite.created_at),
                                      "dd/MM/yyyy HH:mm",
                                      { locale: ptBR }
                                    )
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {invite.expires_at ? (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(
                                      new Date(invite.expires_at),
                                      "dd/MM/yyyy HH:mm",
                                      { locale: ptBR }
                                    )}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {invite.used_by_email ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium">{invite.used_by_email}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {invite.used_at &&
                                        format(
                                          new Date(invite.used_at),
                                          "dd/MM/yyyy HH:mm",
                                          { locale: ptBR }
                                        )}
                                    </span>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {invite.notes || "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(invite.key_code, invite.id)
                                  }
                                  disabled={isUsed || isExpired}
                                >
                                  {copiedId === invite.id ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
