'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-red-200">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-6">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Something went wrong
        </h1>

        <p className="text-gray-600 text-center mb-6">
          An unexpected error occurred.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
