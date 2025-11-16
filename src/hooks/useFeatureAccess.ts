/**
 * Hook for feature access control
 * Used to enable/disable features based on environment variables
 */

export function useFeatureAccess() {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  
  return {
    advancedModeEnabled: !isDemoMode,
    posAnnotationEnabled: !isDemoMode,
    exportPdfEnabled: !isDemoMode,
  };
}
