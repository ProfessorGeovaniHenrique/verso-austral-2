import { useCallback, useState } from 'react';
import { ProcessingProvider, useProcessing } from '@/contexts/ProcessingContext';
import { BatchProcessingProvider } from '@/contexts/BatchProcessingContext';
import { ResultsProvider } from '@/contexts/ResultsContext';
import { WorkflowProvider } from '@/contexts/WorkflowContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyStateMusicEnrichment } from '@/components/music/EmptyStateMusicEnrichment';
import { MusicAnalysisResult } from '@/components/music/MusicAnalysisResult';
import { MusicUploadDialog } from '@/components/music/MusicUploadDialog';
import { ingestionService } from '@/services/ingestionService';

function MusicEnrichmentContent() {
  const { uploadFile, uploadState, progress, error, parsedData, fileName, resetProcessing } = useProcessing();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const navigate = useNavigate();

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      await uploadFile(file);
      setShowUploadDialog(false);
      toast.success(`Arquivo processado com sucesso!`);
    } catch (err) {
      toast.error('Erro ao processar arquivo');
    }
  }, [uploadFile]);

  const handleCancel = useCallback(() => {
    resetProcessing();
    setShowUploadDialog(false);
    toast.info('Operação cancelada');
  }, [resetProcessing]);

  const handleImport = useCallback(async (corpusId: string | null) => {
    try {
      // Filtrar apenas músicas com título e artista
      const validSongs = parsedData.filter(song => song.titulo && song.artista);
      
      if (validSongs.length === 0) {
        toast.error('Nenhuma música válida encontrada (título e artista são obrigatórios)');
        return;
      }
      
      const result = await ingestionService.extractTitles(
        validSongs.map(song => ({
          titulo: song.titulo,
          artista: song.artista!,
          compositor: song.compositor,
          ano: song.ano,
          album: undefined,
          genero: undefined
        })),
        undefined,
        corpusId
      );
      
      toast.success(
        `${result.songsCreated} músicas importadas ${corpusId ? 'no corpus selecionado' : 'no catálogo geral'}! ${result.artistsCreated} artistas criados.`
      );
      navigate('/music-catalog');
    } catch (error) {
      toast.error('Erro ao importar dados');
      console.error('Import error:', error);
    }
  }, [parsedData, navigate]);

  // Estado: Análise completa (arquivo processado)
  if (uploadState === 'complete' && parsedData.length > 0) {
    return (
      <MusicAnalysisResult
        fileName={fileName || 'arquivo.xlsx'}
        totalSongs={parsedData.length}
        previewData={parsedData}
        onCancel={handleCancel}
        onImport={handleImport}
      />
    );
  }

  // Estado: Processando
  if (uploadState === 'uploading' || uploadState === 'processing') {
    return (
      <MusicUploadDialog
        open={true}
        onOpenChange={() => {}}
        onFileSelect={handleFileSelect}
        isUploading={true}
        progress={progress}
        error={error}
      />
    );
  }

  // Estado: Vazio (idle ou error)
  return (
    <>
      <EmptyStateMusicEnrichment 
        onImportClick={() => setShowUploadDialog(true)}
      />
      <MusicUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onFileSelect={handleFileSelect}
        isUploading={false}
        progress={progress}
        error={error}
      />
    </>
  );
}

export default function MusicEnrichment() {
  return (
    <WorkflowProvider>
      <ProcessingProvider>
        <BatchProcessingProvider>
          <ResultsProvider>
            <MusicEnrichmentContent />
          </ResultsProvider>
        </BatchProcessingProvider>
      </ProcessingProvider>
    </WorkflowProvider>
  );
}
