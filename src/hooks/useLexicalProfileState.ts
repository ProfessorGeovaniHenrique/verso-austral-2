/**
 * useLexicalProfileState
 * Sprint AUD-C1: State management hook for TabLexicalProfile
 */

import { useState, useCallback } from 'react';
import { LexicalProfile } from '@/data/types/stylistic-analysis.types';
import { DominioSemantico } from '@/data/types/corpus.types';
import { toast } from 'sonner';

// Sprint BUG-SEM-3: Enhanced progress state with chunk info
export interface AnnotationProgressState {
  step: 'idle' | 'pos' | 'semantic' | 'calculating';
  progress: number;
  message: string;
  startedAt?: Date;
  processedItems?: number;
  currentChunk?: number;
  totalChunks?: number;
}

export interface LexicalProfileState {
  studyProfile: LexicalProfile | null;
  referenceProfile: LexicalProfile | null;
  studyDominios: DominioSemantico[];
  referenceDominios: DominioSemantico[];
  isAnalyzing: boolean;
  existingJob: any | null;
  showTheoryModal: boolean;
  ignorarMG: boolean;
  activeSubTab: string;
  annotationProgress: AnnotationProgressState;
}

export function useLexicalProfileState() {
  const [studyProfile, setStudyProfile] = useState<LexicalProfile | null>(null);
  const [referenceProfile, setReferenceProfile] = useState<LexicalProfile | null>(null);
  const [studyDominios, setStudyDominios] = useState<DominioSemantico[]>([]);
  const [referenceDominios, setReferenceDominios] = useState<DominioSemantico[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [existingJob, setExistingJob] = useState<any | null>(null);
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const [ignorarMG, setIgnorarMG] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [annotationProgress, setAnnotationProgress] = useState<AnnotationProgressState>({
    step: 'idle',
    progress: 0,
    message: ''
  });

  const handleClearCache = useCallback(() => {
    setStudyProfile(null);
    setReferenceProfile(null);
    setStudyDominios([]);
    setReferenceDominios([]);
    toast.success('Cache limpo! Execute a análise novamente.');
  }, []);

  const handleClearOldJobs = useCallback((setActiveAnnotationJobId: (id: string | null) => void) => {
    localStorage.removeItem('active-annotation-job-id');
    setExistingJob(null);
    setActiveAnnotationJobId(null);
    toast.success('Jobs antigos removidos da interface!');
  }, []);

  return {
    // State
    studyProfile,
    referenceProfile,
    studyDominios,
    referenceDominios,
    isAnalyzing,
    existingJob,
    showTheoryModal,
    ignorarMG,
    activeSubTab,
    annotationProgress,
    
    // Setters
    setStudyProfile,
    setReferenceProfile,
    setStudyDominios,
    setReferenceDominios,
    setIsAnalyzing,
    setExistingJob,
    setShowTheoryModal,
    setIgnorarMG,
    setActiveSubTab,
    setAnnotationProgress,
    
    // Handlers
    handleClearCache,
    handleClearOldJobs,
  };
}
