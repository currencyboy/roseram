import { useState, useCallback } from 'react';

export function useRevisions(projectId) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveRevision = useCallback(
    async (filePath, content, changeType, message) => {
      if (!projectId) {
        console.warn('No projectId for revision save');
        return null;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch('/api/revisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            filePath,
            content,
            changeType,
            message,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save revision');
        }

        const data = await response.json();
        return data.revision || null;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error saving revision';
        setError(errorMsg);
        console.error('Error saving revision:', err);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId]
  );

  const logAction = useCallback(
    async (action, target, description) => {
      if (!projectId) {
        console.warn('No projectId for action log');
        return null;
      }

      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            action,
            target,
            description,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to log action');
        }

        return await response.json();
      } catch (err) {
        console.error('Error logging action:', err);
        return null;
      }
    },
    [projectId]
  );

  return {
    saveRevision,
    logAction,
    isSaving,
    error,
  };
}
