import { useCallback, useState } from 'react';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('MusicEnrichment');
import { ProcessingProvider, useProcessing } from '@/contexts/ProcessingContext';
import { BatchProcessingProvider } from '@/contexts/BatchProcessingContext';
import { ResultsProvider } from '@/contexts/ResultsContext';
import { WorkflowProvider } from '@/contexts/WorkflowContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyStateMusicEnrichment } from '@/components/music/EmptyStateMusicEnrichment';
import { MusicAnalysisResult } from '@/components/music/MusicAnalysisResult';
import { MusicUploadDialog } from '@/components/music/MusicUploadDialog';
import { MusicImportProgressModal } from '@/components/music/MusicImportProgressModal';
import { ingestionService } from '@/services/ingestionService';

function MusicEnrichmentContent() {
  const { uploadFile, uploadState, progress, error, parsedData, fileName, resetProcessing } = useProcessing();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importResult, setImportResult] = useState<{ songsCreated: number; artistsCreated: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
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
      
      // Resetar estados e mostrar modal de progresso
      setImportTotal(validSongs.length);
      setImportResult(null);
      setImportError(null);
      setIsImporting(true);
      setShowImportProgress(true);
      
      const result = await ingestionService.extractTitles(
        validSongs.map(song => ({
          titulo: song.titulo,
          artista: song.artista!,
          compositor: song.compositor,
          ano: song.ano,
          letra: song.letra,
          album: undefined,
          genero: undefined
        })),
        undefined,
        corpusId
      );
      
      // Atualizar com resultado real
      setIsImporting(false);
      setImportResult(result);
      
      // Aguardar um pouco para mostrar o resultado final
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setShowImportProgress(false);
      
      toast.success(
        `${result.songsCreated} músicas importadas ${corpusId ? 'no corpus selecionado' : 'no catálogo geral'}! ${result.artistsCreated} artistas criados.`
      );
      
      navigate('/music-catalog');
    } catch (error) {
      setIsImporting(false);
      setImportError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      // Aguardar antes de fechar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setShowImportProgress(false);
      toast.error('Erro ao importar dados');
      log.error('Import error', error instanceof Error ? error : new Error(String(error)), { validSongsCount: parsedData.filter(s => s.titulo && s.artista).length });
    }
  }, [parsedData, navigate]);

  // Estado: Análise completa (arquivo processado)
  if (uploadState === 'complete' && parsedData.length > 0) {
    return (
      <>
        <MusicAnalysisResult
          fileName={fileName || 'arquivo.xlsx'}
          totalSongs={parsedData.length}
          previewData={parsedData}
          onCancel={handleCancel}
          onImport={handleImport}
        />
        <MusicImportProgressModal
          open={showImportProgress}
          totalSongs={importTotal}
          isProcessing={isImporting}
          result={importResult}
          error={importError}
        />
      </>
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
