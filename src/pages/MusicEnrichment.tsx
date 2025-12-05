import { useCallback, useState, useEffect, useRef } from 'react';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('MusicEnrichment');
import { ProcessingProvider, useProcessing } from '@/contexts/ProcessingContext';
import { BatchProcessingProvider } from '@/contexts/BatchProcessingContext';
import { ResultsProvider } from '@/contexts/ResultsContext';
import { WorkflowProvider } from '@/contexts/WorkflowContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyStateMusicEnrichment } from '@/components/music/EmptyStateMusicEnrichment';
import { MusicAnalysisResult, type ImportMode } from '@/components/music/MusicAnalysisResult';
import { MusicUploadDialog } from '@/components/music/MusicUploadDialog';
import { MusicImportProgressModal } from '@/components/music/MusicImportProgressModal';
import { UpdateProgressCard } from '@/components/music/UpdateProgressCard';
import { ingestionService, type UpdateChunkProgress } from '@/services/ingestionService';
import { deduplicateMusicData, DeduplicationResult } from '@/lib/deduplication';

function MusicEnrichmentContent() {
  const { uploadFile, uploadState, progress, error, parsedData, fileName, resetProcessing } = useProcessing();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importResult, setImportResult] = useState<{ songsCreated: number; artistsCreated: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [songsProcessed, setSongsProcessed] = useState(0);
  const [deduplicationResult, setDeduplicationResult] = useState<DeduplicationResult | null>(null);
  
  // Estado específico para modo update
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateChunkProgress | null>(null);
  const updateStartTimeRef = useRef<number>(0);
  
  const navigate = useNavigate();

  // Executar deduplicação quando o arquivo for processado
  useEffect(() => {
    if (uploadState === 'complete' && parsedData.length > 0) {
      const result = deduplicateMusicData(parsedData);
      setDeduplicationResult(result);
      
      if (result.duplicatesRemoved > 0) {
        log.info('Duplicatas detectadas', { 
          total: result.totalOriginal, 
          unique: result.unique.length, 
          removed: result.duplicatesRemoved 
        });
      }
    } else {
      setDeduplicationResult(null);
    }
  }, [uploadState, parsedData]);

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
    setDeduplicationResult(null);
    setIsUpdating(false);
    setUpdateProgress(null);
    toast.info('Operação cancelada');
  }, [resetProcessing]);

  const handleImport = useCallback(async (corpusId: string | null, mode: ImportMode = 'import') => {
    try {
      // Usar dados deduplicados se disponíveis
      const songsToImport = deduplicationResult?.unique || parsedData;
      const validSongs = songsToImport.filter(song => song.titulo && song.artista);
      
      if (validSongs.length === 0) {
        toast.error('Nenhuma música válida encontrada (título e artista são obrigatórios)');
        return;
      }
      
      const mappedSongs = validSongs.map(song => ({
        titulo: song.titulo,
        artista: song.artista!,
        compositor: song.compositor,
        ano: song.ano,
        letra: song.letra,
        lyricsUrl: song.lyricsUrl,
        album: undefined,
        genero: undefined
      }));

      if (mode === 'update') {
        // Modo atualização com processamento chunked
        setImportTotal(validSongs.length);
        setIsUpdating(true);
        updateStartTimeRef.current = Date.now();
        setUpdateProgress({
          currentChunk: 0,
          totalChunks: Math.ceil(validSongs.length / 500),
          songsProcessed: 0,
          songsUpdated: 0,
          songsNotFound: 0
        });
        
        const updateResult = await ingestionService.updateSongsMetadataChunked(
          mappedSongs,
          {
            corpusId,
            chunkSize: 500,
            onProgress: (progress) => {
              setUpdateProgress(progress);
            }
          }
        );
        
        setIsUpdating(false);
        
        if (updateResult.songsNotFound > 0) {
          toast.warning(
            `${updateResult.songsUpdated} músicas atualizadas. ${updateResult.songsNotFound} não encontradas.`,
            { duration: 5000 }
          );
        } else {
          toast.success(`${updateResult.songsUpdated} músicas atualizadas com sucesso!`);
        }
        
        // Pequeno delay antes de navegar
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Usar window.location para forçar reload completo dos dados
        window.location.href = '/music-catalog';
      } else {
        // Modo importação: criar novas músicas
        setImportTotal(validSongs.length);
        setImportResult(null);
        setImportError(null);
        setIsImporting(true);
        setCurrentChunk(0);
        setTotalChunks(0);
        setSongsProcessed(0);
        setShowImportProgress(true);
        
        const result = await ingestionService.extractTitlesChunked(
          mappedSongs,
          {
            uploadId: undefined,
            corpusId,
            chunkSize: 5000,
            onProgress: (progress) => {
              setCurrentChunk(progress.currentChunk);
              setTotalChunks(progress.totalChunks);
              setSongsProcessed(progress.songsProcessed);
            }
          }
        );
        
        setIsImporting(false);
        setImportResult(result);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        setShowImportProgress(false);
        
        const dedupeInfo = deduplicationResult?.duplicatesRemoved 
          ? ` (${deduplicationResult.duplicatesRemoved} duplicatas removidas)`
          : '';
        
        toast.success(
          `${result.songsCreated} músicas importadas${dedupeInfo}! ${result.artistsCreated} artistas criados.`
        );
        
        navigate('/music-catalog');
      }
    } catch (error) {
      setIsImporting(false);
      setIsUpdating(false);
      setImportError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setShowImportProgress(false);
      toast.error(mode === 'update' ? 'Erro ao atualizar dados' : 'Erro ao importar dados');
      log.error('Import/Update error', error instanceof Error ? error : new Error(String(error)), { 
        mode,
        validSongsCount: (deduplicationResult?.unique || parsedData).filter(s => s.titulo && s.artista).length 
      });
    }
  }, [parsedData, deduplicationResult, navigate]);

  // Estado: Atualizando (modo update com progresso)
  if (isUpdating && updateProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <UpdateProgressCard
            currentChunk={updateProgress.currentChunk}
            totalChunks={updateProgress.totalChunks}
            songsProcessed={updateProgress.songsProcessed}
            totalSongs={importTotal}
            songsUpdated={updateProgress.songsUpdated}
            songsNotFound={updateProgress.songsNotFound}
            startTime={updateStartTimeRef.current}
          />
        </div>
      </div>
    );
  }

  // Estado: Análise completa (arquivo processado)
  if (uploadState === 'complete' && parsedData.length > 0) {
    return (
      <>
        <MusicAnalysisResult
          fileName={fileName || 'arquivo.xlsx'}
          totalSongs={parsedData.length}
          uniqueSongs={deduplicationResult?.unique.length || parsedData.length}
          duplicatesRemoved={deduplicationResult?.duplicatesRemoved || 0}
          duplicateGroups={deduplicationResult?.duplicateGroups || new Map()}
          previewData={deduplicationResult?.unique || parsedData}
          onCancel={handleCancel}
          onImport={handleImport}
        />
        <MusicImportProgressModal
          open={showImportProgress}
          totalSongs={importTotal}
          isProcessing={isImporting}
          result={importResult}
          error={importError}
          currentChunk={currentChunk}
          totalChunks={totalChunks}
          songsProcessed={songsProcessed}
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
