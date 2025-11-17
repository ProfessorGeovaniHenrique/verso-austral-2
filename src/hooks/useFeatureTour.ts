import { useEffect, useRef, useState } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { useAuth } from './useAuth';

interface TourStep {
  id: string;
  title: string;
  text: string;
  attachTo?: { 
    element: string; 
    on: 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'auto-start' | 'auto-end' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'right-start' | 'right-end' | 'left-start' | 'left-end';
  };
  buttons?: Array<{
    text: string;
    action: () => void;
    secondary?: boolean;
  }>;
}

export function useFeatureTour(featureName: string, steps: TourStep[]) {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const tourRef = useRef<any>(null);
  
  const hasSeenTour = () => {
    const seen = localStorage.getItem(`tour_${featureName}_completed`);
    return seen === 'true';
  };
  
  const markTourAsCompleted = () => {
    localStorage.setItem(`tour_${featureName}_completed`, 'true');
  };
  
  const startTour = () => {
    if (tourRef.current) {
      tourRef.current.start();
    }
  };
  
  useEffect(() => {
    if (!user) return;
    
    const timeout = setTimeout(() => {
      setIsReady(true);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [user]);
  
  useEffect(() => {
    if (!isReady || hasSeenTour()) return;
    
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-custom',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 8,
      }
    });
    
    steps.forEach((step) => {
      tour.addStep({
        ...step,
        buttons: step.buttons || [
          {
            text: 'Pular',
            action: () => {
              tour.cancel();
              markTourAsCompleted();
            },
            secondary: true
          },
          {
            text: 'Próximo',
            action: tour.next
          }
        ]
      });
    });
    
    tour.on('complete', markTourAsCompleted);
    tour.on('cancel', markTourAsCompleted);
    
    tourRef.current = tour;
    
    const autoStartTimeout = setTimeout(() => {
      tour.start();
    }, 1000);
    
    return () => {
      clearTimeout(autoStartTimeout);
      tour.complete();
    };
  }, [isReady, featureName]);
  
  return {
    startTour,
    hasSeenTour: hasSeenTour(),
  };
}
