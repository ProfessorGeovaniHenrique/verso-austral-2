import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('AdminUsers');
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
import { PageToolbar } from "@/components/PageToolbar";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, Shield, Edit, Trash2, Search, UserPlus, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: AppRole | null;
}

export default function AdminUsers() {
  const { user: currentUser } = useAuthContext();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  
  // Edit role dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("evaluator");
  const [saving, setSaving] = useState(false);
  
  // Delete role alert
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password dialog
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_users_with_roles");
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários");
      log.error('Erro ao carregar usuários', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.role || "evaluator");
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingUser(null);
  };

  const saveRole = async () => {
    if (!editingUser) return;
    
    // Validação: não permitir remover própria role de admin
    if (editingUser.id === currentUser?.id && editingUser.role === "admin") {
      toast.error("Você não pode modificar sua própria role de admin");
      return;
    }

    setSaving(true);
    try {
      if (editingUser.role === null) {
        // Inserir nova role
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: editingUser.id,
            role: selectedRole,
          });
        
        if (error) throw error;
      } else {
        // Atualizar role existente
        const { error } = await supabase
          .from("user_roles")
          .update({ role: selectedRole })
          .eq("user_id", editingUser.id);
        
        if (error) throw error;
      }

      toast.success("Role atualizada com sucesso!");
      closeEditDialog();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar role");
      log.error('Erro ao atualizar role', error, { userId: editingUser?.id, newRole: selectedRole });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteAlert = (user: UserWithRole) => {
    // Validação: não permitir remover própria role de admin
    if (user.id === currentUser?.id && user.role === "admin") {
      toast.error("Você não pode remover sua própria role de admin");
      return;
    }

    setDeletingUser(user);
    setDeleteAlertOpen(true);
  };

  const closeDeleteAlert = () => {
    setDeleteAlertOpen(false);
    setDeletingUser(null);
  };

  const deleteRole = async () => {
    if (!deletingUser || !deletingUser.role) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", deletingUser.id);
      
      if (error) throw error;

      toast.success("Role removida com sucesso!");
      closeDeleteAlert();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover role");
      log.error('Erro ao remover role', error, { userId: deletingUser?.id });
    } finally {
      setDeleting(false);
    }
  };

  const openResetPasswordDialog = (user: UserWithRole) => {
    setResettingPasswordUser(user);
    setNewPassword("");
    setResetPasswordDialogOpen(true);
  };

  const closeResetPasswordDialog = () => {
    setResetPasswordDialogOpen(false);
    setResettingPasswordUser(null);
    setNewPassword("");
  };

  const resetPassword = async () => {
    if (!resettingPasswordUser || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: resettingPasswordUser.id,
            newPassword: newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reset password');
      }

      toast.success(`Senha de ${resettingPasswordUser.email} redefinida com sucesso!`);
      closeResetPasswordDialog();
    } catch (error: any) {
      toast.error(error.message || "Erro ao redefinir senha");
      log.error('Erro ao redefinir senha', error, { userId: resettingPasswordUser?.id });
    } finally {
      setResettingPassword(false);
    }
  };

  const getFilteredUsers = () => {
    let filtered = users;

    // Filtro por tab
    switch (filterTab) {
      case "admins":
        filtered = filtered.filter((u) => u.role === "admin");
        break;
      case "evaluators":
        filtered = filtered.filter((u) => u.role === "evaluator");
        break;
      case "no-role":
        filtered = filtered.filter((u) => u.role === null);
        break;
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter((u) =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();
  const totalUsers = users.length;
  const admins = users.filter((u) => u.role === "admin").length;
  const evaluators = users.filter((u) => u.role === "evaluator").length;
  const noRole = users.filter((u) => u.role === null).length;

  return (
    <>
      <PageToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar usuários por email..."
        onRefresh={fetchUsers}
        rightActions={
          <Button
            size="sm"
            className="h-9 gap-2"
            onClick={() => navigate("/admin/dashboard")}
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Criar Convite</span>
          </Button>
        }
      />
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        <AdminBreadcrumb currentPage="Gerenciar Usuários" />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading text-primary">
              Gerenciamento de Usuários
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize e gerencie as roles de todos os usuários cadastrados
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Criar Convite
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{admins}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliadores</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{evaluators}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sem Role</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{noRole}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              Gerencie as roles de acesso dos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Tabs value={filterTab} onValueChange={setFilterTab} className="flex-1">
                  <TabsList>
                    <TabsTrigger value="all">Todos ({totalUsers})</TabsTrigger>
                    <TabsTrigger value="admins">Admins ({admins})</TabsTrigger>
                    <TabsTrigger value="evaluators">Avaliadores ({evaluators})</TabsTrigger>
                    <TabsTrigger value="no-role">Sem Role ({noRole})</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {loading ? (
                <p className="text-center text-muted-foreground py-8">
                  Carregando...
                </p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Data de Criação</TableHead>
                        <TableHead>Último Acesso</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.email}
                            {user.id === currentUser?.id && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Você
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.role === "admin" ? (
                              <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                                Admin
                              </Badge>
                            ) : user.role === "evaluator" ? (
                              <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                                Avaliador
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Usuário
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(user.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.last_sign_in_at
                              ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy HH:mm", {
                                  locale: ptBR,
                                })
                              : "Nunca"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                                title="Editar role"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openResetPasswordDialog(user)}
                                title="Resetar senha"
                              >
                                <KeyRound className="h-4 w-4 text-amber-500" />
                              </Button>
                              {user.role && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteAlert(user)}
                                  title="Remover role"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Role do Usuário</DialogTitle>
            <DialogDescription>
              Defina a role de acesso para {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evaluator">Avaliador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveRole} disabled={saving} className="btn-versoaustral-secondary">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Reset de Senha */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={closeResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha do Usuário</DialogTitle>
            <DialogDescription>
              Defina uma nova senha temporária para {resettingPasswordUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-reset-password">
                Nova Senha (mínimo 6 caracteres)
              </Label>
              <Input
                id="admin-reset-password"
                type="text"
                placeholder="Digite a nova senha..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="off"
                autoFocus
                minLength={6}
              />
              {newPassword && newPassword.length < 6 && (
                <p className="text-sm text-destructive">
                  A senha deve ter no mínimo 6 caracteres
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeResetPasswordDialog} disabled={resettingPassword}>
              Cancelar
            </Button>
            <Button onClick={resetPassword} disabled={resettingPassword || newPassword.length < 6} className="btn-versoaustral-secondary">
              {resettingPassword ? "Resetando..." : "Resetar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert de Remoção */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a role de{" "}
              <strong>{deletingUser?.email}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteAlert} disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteRole}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}
