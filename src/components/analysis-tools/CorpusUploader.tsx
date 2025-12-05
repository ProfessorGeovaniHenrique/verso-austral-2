/**
 * 📤 CORPUS UPLOADER
 * 
 * Componente para upload de corpus do usuário (TXT, CSV)
 * Suporta drag-and-drop e seleção de arquivo
 */

import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAnalysisTools, UserCorpusFile } from '@/contexts/AnalysisToolsContext';

interface CorpusUploaderProps {
  onUploadComplete?: (corpus: UserCorpusFile) => void;
  compact?: boolean;
}

export function CorpusUploader({ onUploadComplete, compact = false }: CorpusUploaderProps) {
  const { userCorpora, addUserCorpus, removeUserCorpus } = useAnalysisTools();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      toast.error('Formato não suportado. Use arquivos .txt ou .csv');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Arquivo muito grande. Limite: 10MB');
      return;
    }

    setIsProcessing(true);
    
    try {
      const content = await file.text();
      const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
      
      const corpusFile: UserCorpusFile = {
        id: crypto.randomUUID(),
        name: file.name,
        content,
        wordCount,
        uploadedAt: new Date()
      };
      
      addUserCorpus(corpusFile);
      toast.success(`Corpus "${file.name}" carregado (${wordCount.toLocaleString()} palavras)`);
      onUploadComplete?.(corpusFile);
    } catch (error) {
      toast.error('Erro ao processar arquivo');
      console.error('Corpus upload error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [addUserCorpus, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = ''; // Reset input
  }, [processFile]);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild disabled={isProcessing}>
              <span>
                <Upload className="h-4 w-4 mr-1" />
                {isProcessing ? 'Processando...' : 'Upload Corpus'}
              </span>
            </Button>
          </label>
        </div>
        
        {userCorpora.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {userCorpora.map(corpus => (
              <Badge key={corpus.id} variant="secondary" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {corpus.name}
                <button
                  onClick={() => removeUserCorpus(corpus.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload de Corpus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
        >
          <label className="cursor-pointer block">
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isProcessing ? 'Processando...' : 'Arraste um arquivo ou clique para selecionar'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Formatos: .txt, .csv (máx. 10MB)
            </p>
          </label>
        </div>

        {/* Uploaded Files List */}
        {userCorpora.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Corpora Carregados:</p>
            {userCorpora.map(corpus => (
              <div
                key={corpus.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{corpus.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {corpus.wordCount.toLocaleString()} palavras
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUserCorpus(corpus.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-md">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Upload de corpus próprio para análise comparativa. 
            O corpus permanece apenas na sua sessão atual.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
