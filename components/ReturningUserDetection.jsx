"use client";

import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, Check } from "lucide-react";
import { useUserSession } from "./UserSessionProvider";

export function ReturningUserDetection({ 
  credentials, 
  onConfirm, 
  onReject,
  isOpen = false 
}) {
  const { validationStatus } = useUserSession();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const handleRevalidate = async () => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/validate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();
      setValidationResult(result);

      if (result.allValid) {
        onConfirm?.(result);
      }
    } catch (error) {
      setValidationResult({
        allValid: false,
        error: error.message,
        expiredServices: [],
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRejectionFlow = () => {
    onReject?.();
  };

  if (!isOpen || !validationStatus?.isReturningUser) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border border-black max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3 text-blue-900">
          <AlertCircle className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Welcome back!</h2>
        </div>

        <p className="text-sm text-gray-700">
          We detected you've used this app before. We found cached credentials from your previous session.
        </p>

        {validationStatus?.lastService && (
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-sm text-gray-700">
              Last connected service: <span className="font-semibold capitalize">{validationStatus.lastService}</span>
            </p>
          </div>
        )}

        {validationResult?.expiredServices?.length > 0 && (
          <div className="bg-amber-50 p-3 rounded border border-amber-200">
            <p className="text-sm font-medium text-amber-900 mb-2">
              These services need re-authentication:
            </p>
            <ul className="text-sm text-amber-800 space-y-1">
              {validationResult.expiredServices.map(service => (
                <li key={service}>• {service}</li>
              ))}
            </ul>
          </div>
        )}

        {validationResult?.allValid && (
          <div className="bg-green-50 p-3 rounded border border-green-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-800">All credentials are valid!</p>
          </div>
        )}

        <div className="space-y-2 pt-4">
          <button
            onClick={handleRevalidate}
            disabled={isValidating}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded border border-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Re-validate Credentials
              </>
            )}
          </button>

          <button
            onClick={handleRejectionFlow}
            disabled={isValidating}
            className="w-full px-4 py-2 bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Use Different Account
          </button>
        </div>

        {validationResult?.error && (
          <p className="text-sm text-red-600 text-center">
            {validationResult.error}
          </p>
        )}
      </div>
    </div>
  );
}
