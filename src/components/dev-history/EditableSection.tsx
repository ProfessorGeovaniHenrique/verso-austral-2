import { useState } from "react";
import { Pencil, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EditableSectionProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  onRestore?: () => Promise<void>;
  placeholder?: string;
  multiline?: boolean;
  editable?: boolean;
  className?: string;
  hasOverride?: boolean;
}

export function EditableSection({
  value,
  onSave,
  onRestore,
  placeholder = "Digite o texto...",
  multiline = true,
  editable = false,
  className,
  hasOverride = false
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (editedValue.trim() === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedValue(value);
    setIsEditing(false);
  };

  const handleRestore = async () => {
    if (!onRestore) return;
    
    setIsSaving(true);
    try {
      await onRestore();
      setEditedValue(value);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao restaurar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!editable && !isEditing) {
    return (
      <div className={cn("text-sm", className)}>
        {value}
        {hasOverride && (
          <span className="ml-2 text-xs text-muted-foreground">(editado)</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("group relative", className)}>
      {!isEditing ? (
        <div className="flex items-start gap-2">
          <div className="flex-1 text-sm">
            {value}
            {hasOverride && (
              <span className="ml-2 text-xs text-muted-foreground">(editado)</span>
            )}
          </div>
          {editable && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditedValue(value);
                  setIsEditing(true);
                }}
                className="h-7 w-7 p-0"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              {hasOverride && onRestore && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRestore}
                  disabled={isSaving}
                  className="h-7 w-7 p-0"
                  title="Restaurar original"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              placeholder={placeholder}
              className="min-h-[100px] text-sm"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm border rounded-md"
              autoFocus
            />
          )}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || editedValue.trim() === ""}
            >
              <Check className="h-3 w-3 mr-1" />
              Salvar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
            {hasOverride && onRestore && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRestore}
                disabled={isSaving}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restaurar Original
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
