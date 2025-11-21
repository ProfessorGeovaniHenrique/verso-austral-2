import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { set, get } from 'idb-keyval';

export type WorkflowStep = 
  | 'upload' 
  | 'mapping' 
  | 'processing' 
  | 'enrichment' 
  | 'results';

interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  uploadedFileName?: string;
  columnMapping?: Record<string, string>;
  processedSongIds?: string[];
}

interface WorkflowContextType {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  canProceed: boolean;
  goToStep: (step: WorkflowStep) => void;
  completeStep: (step: WorkflowStep) => void;
  resetWorkflow: () => void;
  saveProgress: (data: Partial<WorkflowState>) => Promise<void>;
  loadProgress: () => Promise<void>;
  workflowState: WorkflowState;
}

const STORAGE_KEY = 'music-enrichment-workflow-state';

const STEP_ORDER: WorkflowStep[] = [
  'upload',
  'mapping',
  'processing',
  'enrichment',
  'results'
];

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    currentStep: 'upload',
    completedSteps: [],
  });

  const canProceed = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(workflowState.currentStep);
    const nextStep = STEP_ORDER[currentIndex + 1];
    return nextStep ? workflowState.completedSteps.includes(workflowState.currentStep) : false;
  }, [workflowState]);

  const goToStep = useCallback((step: WorkflowStep) => {
    const stepIndex = STEP_ORDER.indexOf(step);
    const currentIndex = STEP_ORDER.indexOf(workflowState.currentStep);

    // Allow going back or moving forward if previous steps are completed
    if (stepIndex <= currentIndex || 
        workflowState.completedSteps.includes(STEP_ORDER[stepIndex - 1])) {
      setWorkflowState(prev => ({
        ...prev,
        currentStep: step,
      }));
    }
  }, [workflowState]);

  const completeStep = useCallback((step: WorkflowStep) => {
    setWorkflowState(prev => {
      const newCompleted = prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step];

      const stepIndex = STEP_ORDER.indexOf(step);
      const nextStep = STEP_ORDER[stepIndex + 1];

      return {
        ...prev,
        completedSteps: newCompleted,
        currentStep: nextStep || step,
      };
    });
  }, []);

  const saveProgress = useCallback(async (data: Partial<WorkflowState>) => {
    const newState = { ...workflowState, ...data };
    setWorkflowState(newState);
    
    try {
      await set(STORAGE_KEY, newState);
    } catch (error) {
      console.error('Failed to save workflow progress:', error);
    }
  }, [workflowState]);

  const loadProgress = useCallback(async () => {
    try {
      const saved = await get<WorkflowState>(STORAGE_KEY);
      if (saved) {
        setWorkflowState(saved);
      }
    } catch (error) {
      console.error('Failed to load workflow progress:', error);
    }
  }, []);

  const resetWorkflow = useCallback(() => {
    const initialState: WorkflowState = {
      currentStep: 'upload',
      completedSteps: [],
    };
    setWorkflowState(initialState);
    set(STORAGE_KEY, initialState).catch(console.error);
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return (
    <WorkflowContext.Provider
      value={{
        currentStep: workflowState.currentStep,
        completedSteps: workflowState.completedSteps,
        canProceed: canProceed(),
        goToStep,
        completeStep,
        resetWorkflow,
        saveProgress,
        loadProgress,
        workflowState,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within WorkflowProvider');
  }
  return context;
}
