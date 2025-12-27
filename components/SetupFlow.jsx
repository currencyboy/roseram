"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader, AlertCircle } from "lucide-react";
import { useIntegrations } from "@/lib/integrations-context";
import { useUserSession } from "./UserSessionProvider";
import { GitHubIntegration } from "./GitHubIntegration";
import { GitHubRepositorySelector } from "./GitHubRepositorySelector";
import { SupabaseIntegration } from "./SupabaseIntegration";
import { EnvVariableImporter } from "./EnvVariableImporter";
import { ReturningUserDetection } from "./ReturningUserDetection";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { getCredentials } from "@/lib/user-session";

export function SetupFlow() {
  const router = useRouter();
  const { github, supabase, isSetupComplete } = useIntegrations();
  const { initializeUserSession, storeCredentials, validationStatus, userId } = useUserSession();
  const [loading, setLoading] = useState(false);
  const [preloadedConfig, setPreloadedConfig] = useState(null);
  const [showReturningUserPrompt, setShowReturningUserPrompt] = useState(false);
  const [credentialsForValidation, setCredentialsForValidation] = useState(null);
  const [sessionError, setSessionError] = useState(null);

  // Handle environment variables import
  const handleConfigImport = async (config) => {
    try {
      setLoading(true);
      setSessionError(null);

      // Initialize user session from first available service
      const firstService = Object.keys(config).find(
        key => config[key] && ['github_token', 'supabase_url', 'netlify_token'].includes(key)
      );

      if (firstService) {
        const serviceMap = {
          github_token: 'github',
          supabase_url: 'supabase',
          netlify_token: 'netlify',
        };

        const service = serviceMap[firstService];
        if (service) {
          const sessionResult = await initializeUserSession(service, config);

          if (!sessionResult.success) {
            setSessionError(sessionResult.error);
            setLoading(false);
            return;
          }
        }
      }

      // Store credentials with validation
      const credentialResult = await storeCredentials(config, true);

      if (credentialResult.success) {
        setPreloadedConfig(config);

        // Check if returning user
        if (credentialResult.isReturningUser) {
          setCredentialsForValidation(config);
          setShowReturningUserPrompt(true);
        }
      } else if (credentialResult.expiredService) {
        setSessionError(
          `${credentialResult.expiredService} credentials are expired. Please update them.`
        );
      } else {
        setSessionError(credentialResult.error || 'Failed to validate credentials');
      }
    } catch (error) {
      setSessionError(error.message || 'Failed to import configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!isSetupComplete) return;
    setLoading(true);
    try {
      router.push("/");
    } catch {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      router.push("/");
    } catch {
      setLoading(false);
    }
  };

  const handleReturningUserConfirm = () => {
    setShowReturningUserPrompt(false);
    setPreloadedConfig(credentialsForValidation);
  };

  const handleReturningUserReject = () => {
    setShowReturningUserPrompt(false);
    setCredentialsForValidation(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
      <ReturningUserDetection
        isOpen={showReturningUserPrompt}
        credentials={credentialsForValidation}
        onConfirm={handleReturningUserConfirm}
        onReject={handleReturningUserReject}
      />

      <div className="w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Connect Your Integrations</h1>
          <p className="text-sm text-gray-600 mb-4">
            {userId ? `Welcome back! (User: ${userId.substring(0, 20)}...)` : 'Authenticate with your services to start building'}
          </p>
        </div>

        {sessionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Session Error</p>
              <p className="text-sm text-red-800 mt-1">{sessionError}</p>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left Column - Environment Variable Importer */}
          <div>
            <EnvVariableImporter onImport={handleConfigImport} isOpen={true} />
          </div>

          {/* Right Column - Integration Forms */}
          <div className="space-y-6">
            {/* GitHub Integration */}
            <div className="border border-black">
              <div className="p-4 border-b border-black bg-gray-50">
                <h2 className="font-semibold">GitHub</h2>
                <p className="text-sm text-gray-600">Connect your repository</p>
              </div>
              <div className="p-4 space-y-4">
                {!github.token ? (
                  <GitHubIntegration
                    onRepositorySelected={(repo) => {
                      console.log("[SetupFlow] Repository selected:", repo);
                      github.setRepository(repo);
                      if (preloadedConfig?.github_token) {
                        github.setToken(preloadedConfig.github_token);
                      }
                    }}
                    onTokenSet={(token) => {
                      console.log("[SetupFlow] Token set from GitHub form");
                      github.setToken(token);
                    }}
                    isComplete={!!github.repository}
                    preloadedToken={preloadedConfig?.github_token}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-sm text-green-900 font-medium">GitHub token connected</p>
                    </div>
                    <GitHubRepositorySelector
                      githubToken={github.token}
                      onRepositorySelect={(repo) => {
                        console.log("[SetupFlow] Repository selected from selector:", repo);
                        github.setRepository({
                          owner: repo.owner,
                          name: repo.name,
                          id: repo.id,
                          defaultBranch: repo.defaultBranch || repo.default_branch,
                        });
                      }}
                      onError={(error) => {
                        console.error("[SetupFlow] Repository selection error:", error);
                        setSessionError(error);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Supabase Integration */}
            <div className="border border-black">
              <div className="p-4 border-b border-black bg-gray-50">
                <h2 className="font-semibold">Supabase</h2>
                <p className="text-sm text-gray-600">Connect your database and schema</p>
              </div>
              <div className="p-4">
                <SupabaseIntegration
                  onSchemaSelected={(url, key, schema) => {
                    supabase.setCredentials(url, key);
                    supabase.setSchema(schema);
                  }}
                  isComplete={!!supabase.schema}
                  preloadedUrl={preloadedConfig?.supabase_url}
                  preloadedKey={preloadedConfig?.supabase_anon_key}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
            Skip for Now
          </button>
          <button
            onClick={handleContinue}
            disabled={loading || !isSetupComplete}
            className="flex-1 px-4 py-2 bg-black text-white disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
            Continue to Builder
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center mt-6">
          You can always add or change integrations later in builder settings
        </p>
      </div>

      <DiagnosticsPanel />
    </div>
  );
}
