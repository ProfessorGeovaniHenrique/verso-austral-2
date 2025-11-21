import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  progress: number;
  error?: string | null;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FORMATS = ['.xlsx', '.xls', '.csv'];

export function FileUpload({ onFileSelect, isUploading, progress, error }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!ACCEPTED_FORMATS.includes(extension)) {
      return `Formato inválido. Use: ${ACCEPTED_FORMATS.join(', ')}`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `Arquivo muito grande. Máximo: 20MB`;
    }
    
    return null;
  };

  const handleFileSelection = useCallback((file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelection(file);
  }, [handleFileSelection]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  }, [handleFileSelection]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-12 w-12 text-destructive" />;
    if (isUploading && progress === 100) return <CheckCircle2 className="h-12 w-12 text-green-500" />;
    return <Upload className="h-12 w-12 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-12 transition-colors text-center",
            isDragOver && "border-primary bg-primary/5",
            !isDragOver && "border-muted-foreground/25",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            {getStatusIcon()}
            
            {!selectedFile && !isUploading && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    Arraste um arquivo ou clique para selecionar
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Formatos aceitos: Excel (.xlsx, .xls) ou CSV
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tamanho máximo: 20MB
                  </p>
                </div>
                
                <Button asChild>
                  <label className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4" />
                    Selecionar Arquivo
                    <input
                      type="file"
                      accept={ACCEPTED_FORMATS.join(',')}
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                </Button>
              </>
            )}
            
            {selectedFile && !isUploading && !error && (
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {isUploading && (
              <div className="w-full max-w-md space-y-2">
                <p className="font-medium">Processando arquivo...</p>
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground">{progress}%</p>
              </div>
            )}
            
            {error && (
              <div className="text-destructive">
                <p className="font-medium">Erro ao processar arquivo</p>
                <p className="text-sm">{error}</p>
                <Button variant="outline" onClick={clearFile} className="mt-4">
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
