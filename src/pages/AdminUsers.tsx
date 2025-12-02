import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from '@/lib/loggerFactory';
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
import { PageToolbar } from "@/components/PageToolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

// Extracted components
import { UserStatsCards } from "@/components/admin/users/UserStatsCards";
import { UserTable } from "@/components/admin/users/UserTable";
import { EditRoleDialog, ResetPasswordDialog, DeleteRoleDialog } from "@/components/admin/users/UserDialogs";

const log = createLogger('AdminUsers');

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

  const saveRole = async () => {
    if (!editingUser) return;
    
    if (editingUser.id === currentUser?.id && editingUser.role === "admin") {
      toast.error("Você não pode modificar sua própria role de admin");
      return;
    }

    setSaving(true);
    try {
      if (editingUser.role === null) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: editingUser.id, role: selectedRole });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: selectedRole })
          .eq("user_id", editingUser.id);
        if (error) throw error;
      }

      toast.success("Role atualizada com sucesso!");
      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar role");
      log.error('Erro ao atualizar role', error, { userId: editingUser?.id, newRole: selectedRole });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteAlert = (user: UserWithRole) => {
    if (user.id === currentUser?.id && user.role === "admin") {
      toast.error("Você não pode remover sua própria role de admin");
      return;
    }
    setDeletingUser(user);
    setDeleteAlertOpen(true);
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
      setDeleteAlertOpen(false);
      setDeletingUser(null);
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
      setResetPasswordDialogOpen(false);
      setResettingPasswordUser(null);
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao redefinir senha");
      log.error('Erro ao redefinir senha', error, { userId: resettingPasswordUser?.id });
    } finally {
      setResettingPassword(false);
    }
  };

  // Computed values
  const filteredUsers = (() => {
    let filtered = users;

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

    if (searchTerm) {
      filtered = filtered.filter((u) =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  })();

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
          
          <div>
            <h1 className="text-3xl font-bold font-heading text-primary">
              Gerenciamento de Usuários
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize e gerencie as roles de todos os usuários cadastrados
            </p>
          </div>

          <UserStatsCards 
            totalUsers={totalUsers} 
            admins={admins} 
            evaluators={evaluators} 
            noRole={noRole} 
          />

          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>
                Gerencie as roles de acesso dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Tabs value={filterTab} onValueChange={setFilterTab}>
                  <TabsList>
                    <TabsTrigger value="all">Todos ({totalUsers})</TabsTrigger>
                    <TabsTrigger value="admins">Admins ({admins})</TabsTrigger>
                    <TabsTrigger value="evaluators">Avaliadores ({evaluators})</TabsTrigger>
                    <TabsTrigger value="no-role">Sem Role ({noRole})</TabsTrigger>
                  </TabsList>
                </Tabs>

                {loading ? (
                  <p className="text-center text-muted-foreground py-8">
                    Carregando...
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </p>
                ) : (
                  <UserTable
                    users={filteredUsers}
                    currentUserId={currentUser?.id}
                    onEdit={openEditDialog}
                    onResetPassword={openResetPasswordDialog}
                    onDelete={openDeleteAlert}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialogs */}
        <EditRoleDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={editingUser}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          onSave={saveRole}
          saving={saving}
        />

        <ResetPasswordDialog
          open={resetPasswordDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setResetPasswordDialogOpen(false);
              setResettingPasswordUser(null);
              setNewPassword("");
            }
          }}
          user={resettingPasswordUser}
          password={newPassword}
          onPasswordChange={setNewPassword}
          onReset={resetPassword}
          resetting={resettingPassword}
        />

        <DeleteRoleDialog
          open={deleteAlertOpen}
          onOpenChange={setDeleteAlertOpen}
          user={deletingUser}
          onDelete={deleteRole}
          deleting={deleting}
        />
      </div>
    </>
  );
}
