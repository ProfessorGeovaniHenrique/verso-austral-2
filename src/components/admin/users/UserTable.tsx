import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, KeyRound } from "lucide-react";
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

interface UserTableProps {
  users: UserWithRole[];
  currentUserId: string | undefined;
  onEdit: (user: UserWithRole) => void;
  onResetPassword: (user: UserWithRole) => void;
  onDelete: (user: UserWithRole) => void;
}

export function UserTable({ users, currentUserId, onEdit, onResetPassword, onDelete }: UserTableProps) {
  return (
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
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.email}
                {user.id === currentUserId && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Você
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {user.role === "admin" ? (
                  <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
                    Admin
                  </Badge>
                ) : user.role === "evaluator" ? (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
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
                    onClick={() => onEdit(user)}
                    title="Editar role"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResetPassword(user)}
                    title="Resetar senha"
                  >
                    <KeyRound className="h-4 w-4 text-amber-500" />
                  </Button>
                  {user.role && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(user)}
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
  );
}
