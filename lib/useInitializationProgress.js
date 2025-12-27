import { useEffect, useState, useCallback } from 'react';
import { getInitializationProgress } from './initialization-progress';

/**
 * React hook for tracking initialization progress
 */
export function useInitializationProgress() {
  const [progress, setProgress] = useState({
    percentage: 0,
    currentStep: null,
    currentStepLabel: 'Initializing...',
    completedSteps: [],
    elapsedSeconds: 0,
  });

  useEffect(() => {
    const tracker = getInitializationProgress();
    
    // Subscribe to progress updates
    const unsubscribe = tracker.onProgress((newProgress) => {
      setProgress(newProgress);
    });

    return unsubscribe;
  }, []);

  const startStep = useCallback((stepId) => {
    const tracker = getInitializationProgress();
    tracker.startStep(stepId);
  }, []);

  const completeStep = useCallback((stepId) => {
    const tracker = getInitializationProgress();
    tracker.completeStep(stepId);
  }, []);

  const start = useCallback(() => {
    const tracker = getInitializationProgress();
    tracker.start();
  }, []);

  return {
    progress,
    startStep,
    completeStep,
    start,
    isComplete: progress.completedSteps.length === 4,
  };
}

export default useInitializationProgress;
