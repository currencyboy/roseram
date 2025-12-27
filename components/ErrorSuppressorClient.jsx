'use client';

import { useEffect } from 'react';
import { installErrorSuppressors } from '@/lib/error-suppressors';

/**
 * Client-side component that installs error suppressors
 * Prevents non-critical console errors from external services cluttering the console
 */
export function ErrorSuppressorClient() {
  useEffect(() => {
    installErrorSuppressors();
  }, []);

  return null;
}
