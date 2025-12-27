/**
 * Initialization Progress Tracker
 * Helps track and report initialization progress to improve UX
 */

class InitializationProgress {
  constructor() {
    this.steps = [
      { id: 'files', label: 'Loading project files', weight: 30 },
      { id: 'dependencies', label: 'Analyzing dependencies', weight: 20 },
      { id: 'preview', label: 'Initializing preview', weight: 50 },
    ];
    
    this.currentStep = null;
    this.completedSteps = new Set();
    this.startTime = null;
    this.listeners = [];
  }

  /**
   * Register a progress listener callback
   */
  onProgress(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Start initialization tracking
   */
  start() {
    this.startTime = Date.now();
    this.currentStep = null;
    this.completedSteps.clear();
    this.notify();
  }

  /**
   * Mark a step as started
   */
  startStep(stepId) {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      this.currentStep = stepId;
      console.log(`[InitProgress] Starting: ${step.label}`);
      this.notify();
    }
  }

  /**
   * Mark a step as completed
   */
  completeStep(stepId) {
    this.completedSteps.add(stepId);
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      console.log(`[InitProgress] Completed: ${step.label}`);
    }
    if (this.currentStep === stepId) {
      this.currentStep = null;
    }
    this.notify();
  }

  /**
   * Get current progress as percentage
   */
  getProgress() {
    const completedWeight = Array.from(this.completedSteps)
      .reduce((sum, stepId) => {
        const step = this.steps.find(s => s.id === stepId);
        return sum + (step?.weight || 0);
      }, 0);

    const currentWeight = this.currentStep
      ? (this.steps.find(s => s.id === this.currentStep)?.weight || 0) * 0.3
      : 0;

    const totalWeight = this.steps.reduce((sum, s) => sum + s.weight, 0);
    return Math.round((completedWeight + currentWeight) / totalWeight * 100);
  }

  /**
   * Get current step label
   */
  getCurrentStepLabel() {
    if (this.currentStep) {
      const step = this.steps.find(s => s.id === this.currentStep);
      return step?.label || 'Initializing...';
    }
    
    // Find next incomplete step
    const nextIncomplete = this.steps.find(s => !this.completedSteps.has(s.id));
    return nextIncomplete?.label || 'Finalizing...';
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedSeconds() {
    if (!this.startTime) return 0;
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  /**
   * Notify all listeners of progress change
   */
  notify() {
    const progress = {
      percentage: this.getProgress(),
      currentStep: this.currentStep,
      currentStepLabel: this.getCurrentStepLabel(),
      completedSteps: Array.from(this.completedSteps),
      elapsedSeconds: this.getElapsedSeconds(),
    };

    this.listeners.forEach(callback => callback(progress));
  }

  /**
   * Check if all steps are complete
   */
  isComplete() {
    return this.completedSteps.size === this.steps.length;
  }

  /**
   * Reset progress tracker
   */
  reset() {
    this.startTime = null;
    this.currentStep = null;
    this.completedSteps.clear();
    this.listeners = [];
  }
}

// Singleton instance
let progressInstance = null;

export function getInitializationProgress() {
  if (!progressInstance) {
    progressInstance = new InitializationProgress();
  }
  return progressInstance;
}

export default InitializationProgress;
