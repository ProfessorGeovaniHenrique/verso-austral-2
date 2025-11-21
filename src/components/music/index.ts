// Music Enrichment Components - Fase 8
export { FileUpload } from './FileUpload';
export { ColumnMapper } from './ColumnMapper';
export type { ColumnMapping } from './ColumnMapper';

export { ProcessingPipeline } from './ProcessingPipeline';
export type { WorkflowStep } from './ProcessingPipeline';
export { ProcessingControl } from './ProcessingControl';
export { ProcessingProgress } from './ProcessingProgress';
export { ProcessingLog } from './ProcessingLog';
export type { LogEntry, LogType } from './ProcessingLog';

export { TitleExtractionResults } from './TitleExtractionResults';
export { ValidationTable } from './ValidationTable';
export type { ValidationStatus, ValidationError, MusicEntry } from './ValidationTable';

export { DraggableQueueTable } from './DraggableQueueTable';
export type { JobStatus, ProcessingJob } from './DraggableQueueTable';
export { EnrichmentProgress } from './EnrichmentProgress';
export { ErrorLog } from './ErrorLog';
export type { ErrorEntry } from './ErrorLog';

export { EnrichedDataTable } from './EnrichedDataTable';
export type { EnrichedSong } from './EnrichedDataTable';
export { EnrichmentBatchModal } from './EnrichmentBatchModal';
export { DataTable } from './DataTable';
export type { ColumnDef } from './DataTable';
export { SongCard } from './SongCard';
export type { Song } from './SongCard';
export { ArtistCard } from './ArtistCard';
export type { Artist } from './ArtistCard';
export { StatsCard } from './StatsCard';

export { AdvancedExportMenu } from './AdvancedExportMenu';
export type { ExportFormat, ExportOptions } from './AdvancedExportMenu';
export { ExportDialog } from './ExportDialog';
export { PerformanceDashboard } from './PerformanceDashboard';
export { ProcessingDashboard } from './ProcessingDashboard';

export { WorkflowTabs } from './WorkflowTabs';
export { ActionButtons } from './ActionButtons';
export { EmptyStateMusicEnrichment } from './EmptyStateMusicEnrichment';
export { MusicAnalysisResult } from './MusicAnalysisResult';
export { MusicUploadDialog } from './MusicUploadDialog';
