'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mx-auto mb-6">
          <span className="text-2xl font-bold text-gray-600">404</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Page Not Found
        </h1>

        <p className="text-gray-600 text-center mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
