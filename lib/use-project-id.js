'use client';

import { useProject } from './project-context';
import { useMemo } from 'react';

/**
 * Hook to get a reliable project ID with automatic fallback
 * 
 * Returns:
 * - Actual projectId from context if available
 * - Auto-generated temporary projectId if none exists
 * - Stable ID that won't change on re-renders
 */
export function useProjectId() {
  const { projectId } = useProject();

  const effectiveProjectId = useMemo(() => {
    if (projectId) {
      return projectId;
    }
    // Generate a temporary but stable project ID
    // Use a combination of timestamp and random string to ensure uniqueness
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `preview-${timestamp}-${random}`;
  }, [projectId]);

  return {
    projectId: effectiveProjectId,
    isTemporary: !projectId,
    hasRealProjectId: !!projectId,
  };
}

export default useProjectId;
