"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Circle, AlertCircle, Loader2, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { useUserSession } from "./UserSessionProvider";

const STEPS = [
  {
    number: 1,
    title: "Repository Detection",
    description: "Detecting and validating your GitHub repository",
    details: [
      "Verify repository exists and is accessible",
      "Validate branch configuration",
      "Detect project type and dependencies",
      "Identify build and start scripts"
    ]
  },
  {
    number: 2,
    title: "Machine Allocation",
    description: "Allocating Fly.io machine resources",
    details: [
      "Reserve unique app name",
      "Allocate compute resources",
      "Configure machine region",
      "Set up resource limits"
    ]
  },
  {
    number: 3,
    title: "Settings Configuration",
    description: "Configuring machine environment and settings",
    details: [
      "Set environment variables",
      "Configure memory and CPU",
      "Enable auto-start/stop",
      "Configure shutdown policies"
    ]
  },
  {
    number: 4,
    title: "Repository Boot",
    description: "Cloning and booting your repository",
    details: [
      "Clone repository to machine",
      "Install dependencies",
      "Build application if needed",
      "Start development server"
    ]
  }
];

export function IncrementalMachineSetup({ 
  projectId, 
  githubRepo, 
  githubBranch = "main",
  onSetupComplete,
  onError 
}) {
  const { userId, getAccessToken } = useUserSession();
  const [session, setSession] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepStatuses, setStepStatuses] = useState({
    1: "pending",
    2: "pending",
    3: "pending",
    4: "pending"
  });
  const [stepDetails, setStepDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  // Initialize setup session
  useEffect(() => {
    const initializeSetup = async () => {
      try {
        setLoading(true);
        const token = await getAccessToken();
        
        const response = await fetch(
          `/api/machine-setup?projectId=${projectId}&githubRepo=${encodeURIComponent(githubRepo)}&githubBranch=${githubBranch}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            }
          }
        );

        if (!response.ok) {
          throw new Error("Failed to initialize setup session");
        }

        const data = await response.json();
        if (data.success) {
          setSession(data.session);
          addLog("Setup session created successfully");
          addLog(`App Name: ${data.session.fly_app_name}`);
          addLog(`Preview URL: ${data.session.preview_url}`);
        }
      } catch (err) {
        setError(err.message);
        addLog(`Error: ${err.message}`, "error");
        if (onError) onError(err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId && githubRepo && userId) {
      initializeSetup();
    }
  }, [projectId, githubRepo, githubBranch, userId, getAccessToken, onError]);

  const addLog = useCallback((message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  }, []);

  const executeStep = async (stepNumber) => {
    if (!session) {
      setError("Setup session not initialized");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStepStatuses(prev => ({ ...prev, [stepNumber]: "running" }));
      addLog(`Executing Step ${stepNumber}: ${STEPS[stepNumber - 1].title}`);

      const token = await getAccessToken();

      const response = await fetch("/api/machine-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: session.id,
          stepNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Step ${stepNumber} failed`);
      }

      if (data.success) {
        const stepStatus = data.stepResult.status;
        setStepStatuses(prev => ({ ...prev, [stepNumber]: stepStatus }));
        setStepDetails(prev => ({ 
          ...prev, 
          [stepNumber]: data.stepResult.details 
        }));
        setSession(data.session);

        addLog(`✓ Step ${stepNumber} completed successfully`);
        
        if (data.stepResult.details?.description) {
          addLog(data.stepResult.details.description);
        }

        // Move to next step if current was successful
        if (stepStatus === "completed" && stepNumber < 4) {
          setCurrentStep(stepNumber + 1);
        }

        // Setup complete
        if (stepNumber === 4 && stepStatus === "completed") {
          addLog("🎉 Setup completed successfully!");
          if (onSetupComplete) {
            onSetupComplete({
              session: data.session,
              appName: session.fly_app_name,
              previewUrl: session.preview_url
            });
          }
        }
      }
    } catch (err) {
      const errorMessage = err.message || `Step ${stepNumber} failed`;
      setError(errorMessage);
      setStepStatuses(prev => ({ ...prev, [stepNumber]: "error" }));
      addLog(`✗ Error: ${errorMessage}`, "error");
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (stepNumber) => {
    const status = stepStatuses[stepNumber];
    if (status === "completed") {
      return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    } else if (status === "running") {
      return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
    } else if (status === "error") {
      return <AlertCircle className="w-6 h-6 text-red-500" />;
    }
    return <Circle className="w-6 h-6 text-gray-300" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* Setup Progress Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-6">Incremental Machine Setup</h2>
        
        {session && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Repository</p>
                <p className="font-semibold text-gray-900">{githubRepo}</p>
              </div>
              <div>
                <p className="text-gray-600">Branch</p>
                <p className="font-semibold text-gray-900">{githubBranch}</p>
              </div>
              <div>
                <p className="text-gray-600">App Name</p>
                <p className="font-semibold text-gray-900 font-mono">{session.fly_app_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Preview URL</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 font-mono text-sm break-all">{session.preview_url}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(session.preview_url)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Progress */}
        <div className="space-y-6">
          {STEPS.map((step, index) => (
            <div key={step.number}>
              {index > 0 && (
                <div className="flex justify-center mb-6">
                  <div className={`h-8 w-0.5 ${stepStatuses[step.number - 1] === "completed" ? "bg-green-500" : "bg-gray-200"}`} />
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  {getStepIcon(step.number)}
                </div>

                <div className="flex-grow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Step {step.number}: {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {stepStatuses[step.number]}
                    </span>
                  </div>

                  {/* Step Details */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                    {step.details.map((detail, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-1">•</span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Step Results */}
                  {stepDetails[step.number] && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-green-900 mb-2">
                        ✓ {stepDetails[step.number].description || `Step ${step.number} completed`}
                      </p>
                      
                      {stepDetails[step.number].repositoryName && (
                        <div className="text-sm text-green-800 space-y-1">
                          <p>Repository: <span className="font-mono">{stepDetails[step.number].repositoryName}</span></p>
                          <p>Branch: <span className="font-mono">{stepDetails[step.number].branchName}</span></p>
                          {stepDetails[step.number].projectType && (
                            <p>Project Type: <span className="font-mono">{stepDetails[step.number].projectType}</span></p>
                          )}
                        </div>
                      )}

                      {stepDetails[step.number].appName && (
                        <div className="text-sm text-green-800">
                          <p>App Name: <span className="font-mono">{stepDetails[step.number].appName}</span></p>
                          <p>Region: <span className="font-mono">{stepDetails[step.number].region}</span></p>
                        </div>
                      )}

                      {stepDetails[step.number].nextActions && (
                        <div className="text-sm text-green-800 mt-3">
                          <p className="font-semibold mb-2">Next Actions:</p>
                          <ul className="space-y-1">
                            {stepDetails[step.number].nextActions.map((action, i) => (
                              <li key={i} className="flex gap-2">
                                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step Error */}
                  {stepDetails[step.number]?.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-red-900 mb-1">
                        ✗ Error
                      </p>
                      <p className="text-sm text-red-800">{stepDetails[step.number].error}</p>
                    </div>
                  )}

                  {/* Execute Step Button */}
                  {stepStatuses[step.number] === "pending" && !loading && (
                    <button
                      onClick={() => executeStep(step.number)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                      Execute Step {step.number}
                    </button>
                  )}

                  {stepStatuses[step.number] === "running" && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Executing...
                    </div>
                  )}

                  {stepStatuses[step.number] === "completed" && step.number < 4 && (
                    <button
                      onClick={() => executeStep(step.number + 1)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                      Continue to Next Step
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Setup Error</h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logs Panel */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Setup Logs</h3>
        </div>
        <div className="h-48 overflow-y-auto bg-gray-50 p-4 font-mono text-sm space-y-1">
          {logs.length === 0 ? (
            <p className="text-gray-500">Waiting for setup to start...</p>
          ) : (
            logs.map((log, i) => (
              <div 
                key={i} 
                className={`${
                  log.type === "error" 
                    ? "text-red-600" 
                    : log.type === "warning" 
                    ? "text-yellow-600" 
                    : "text-gray-700"
                }`}
              >
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Setup Complete Summary */}
      {stepStatuses[4] === "completed" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-green-900 mb-2">Setup Complete! 🎉</h3>
              <p className="text-sm text-green-800 mb-4">
                Your Fly.io machine has been successfully configured and is ready to use.
              </p>
              
              {session && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-green-700 font-semibold">Preview URL:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <a 
                        href={session.preview_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 font-mono text-sm break-all"
                      >
                        {session.preview_url}
                      </a>
                      <a 
                        href={session.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-semibold">App Name:</p>
                    <p className="font-mono text-sm mt-1">{session.fly_app_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
