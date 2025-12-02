import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: AppRole | null;
}

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  selectedRole: AppRole;
  onRoleChange: (role: AppRole) => void;
  onSave: () => void;
  saving: boolean;
}

export function EditRoleDialog({
  open,
  onOpenChange,
  user,
  selectedRole,
  onRoleChange,
  onSave,
  saving,
}: EditRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Role do Usuário</DialogTitle>
          <DialogDescription>
            Defina a role de acesso para {user?.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select value={selectedRole} onValueChange={(value) => onRoleChange(value as AppRole)}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving} className="btn-versoaustral-secondary">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  password: string;
  onPasswordChange: (password: string) => void;
  onReset: () => void;
  resetting: boolean;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  password,
  onPasswordChange,
  onReset,
  resetting,
}: ResetPasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetar Senha do Usuário</DialogTitle>
          <DialogDescription>
            Defina uma nova senha temporária para {user?.email}
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
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              autoComplete="off"
              autoFocus
              minLength={6}
            />
            {password && password.length < 6 && (
              <p className="text-sm text-destructive">
                A senha deve ter no mínimo 6 caracteres
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={resetting}>
            Cancelar
          </Button>
          <Button 
            onClick={onReset} 
            disabled={resetting || password.length < 6} 
            className="btn-versoaustral-secondary"
          >
            {resetting ? "Resetando..." : "Resetar Senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onDelete: () => void;
  deleting: boolean;
}

export function DeleteRoleDialog({
  open,
  onOpenChange,
  user,
  onDelete,
  deleting,
}: DeleteRoleDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover a role de{" "}
            <strong>{user?.email}</strong>? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={deleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? "Removendo..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
