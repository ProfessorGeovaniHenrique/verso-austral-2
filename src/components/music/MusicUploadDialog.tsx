import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileUpload } from './FileUpload';

interface MusicUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export function MusicUploadDialog({
  open,
  onOpenChange,
  onFileSelect,
  isUploading,
  progress,
  error
}: MusicUploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Arquivo de Músicas</DialogTitle>
          <DialogDescription>
            Selecione um arquivo Excel (.xlsx) contendo os dados das músicas
          </DialogDescription>
        </DialogHeader>
        
        <FileUpload
          onFileSelect={onFileSelect}
          isUploading={isUploading}
          progress={progress}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}
