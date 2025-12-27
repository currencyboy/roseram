"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader, ChevronRight, ChevronDown, FileText, Folder, ArrowLeft, Eye, LogOut, AlertCircle, RefreshCw, Bell } from "lucide-react";
import { useIntegrations } from "@/lib/integrations-context";
import { useProject } from "@/lib/project-context";
import { useBranchSync } from "@/lib/branch-sync-context";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { CodeGeneratorChat } from "./CodeGeneratorChat";
import { ActionHistory } from "./ActionHistory";
import { VisualRenderer } from "./VisualRenderer";
import { ResizableLayout } from "./ResizableLayout";
import { FloatingAuthModal } from "./FloatingAuthModal";
import { IntegrationStatusBar } from "./IntegrationStatusBar";
import GitHubFilePoller from "@/lib/github-file-poller";

export function RepoExplorer() {
  const router = useRouter();
  const { github } = useIntegrations();
  const { repository: branchRepository } = useBranchSync();
  const { projectId: contextProjectId, setProjectId: setContextProjectId, isCreatingProject } = useProject();
  const { session, loading: authLoading } = useAuth();
  const [files, setFiles] = useState([
    {
      path: "index.html",
      name: "index.html",
      type: "file",
    },
    {
      path: "styles.css",
      name: "styles.css",
      type: "file",
    },
    {
      path: "script.js",
      name: "script.js",
      type: "file",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [previewHTML, setPreviewHTML] = useState("");
  const previewRef = useRef(null);
  const [fileCache, setFileCache] = useState({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [localProjectId, setLocalProjectId] = useState(null);
  const [defaultUserId, setDefaultUserId] = useState(null);
  const [fileChanges, setFileChanges] = useState({});
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [editorTab, setEditorTab] = useState("editor");
  const [showHistory, setShowHistory] = useState(false);
  const [fileHistory, setFileHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [mainViewMode, setMainViewMode] = useState("editor");
  const [panelSizes, setPanelSizes] = useState([25, 75]);
  const [chatPanelHeight, setChatPanelHeight] = useState(300);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isDraggingHeader, setIsDraggingHeader] = useState(false);
  const [projectCreationError, setProjectCreationError] = useState(null);
  const containerRef = useRef(null);
  const [filePoller, setFilePoller] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [showSyncNotification, setShowSyncNotification] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const pollerRef = useRef(null);

  const buildFileTree = (files) => {
    const tree = {};

    files.forEach((file) => {
      const parts = file.path.split("/");
      let current = tree;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {
            path: parts.slice(0, i + 1).join("/"),
            name: part,
            type: "folder",
            children: [],
          };
        }
        if (!current[part].children) current[part].children = [];
        current = current[part].children;
      }

      current[parts[parts.length - 1]] = {
        path: file.path,
        name: file.name,
        type: "file",
        sha: file.sha,
      };
    });

    return Object.values(tree).sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const handleAutoSync = useCallback(async (changes) => {
    console.log('[RepoExplorer] Auto-syncing changes:', changes);

    // Fetch updated files from GitHub
    for (const change of changes) {
      if (change.type === 'deleted') {
        // Remove deleted file from cache
        setFileCache(prev => {
          const updated = { ...prev };
          delete updated[change.path];
          return updated;
        });

        if (selectedFile?.path === change.path) {
          setSelectedFile(null);
        }
      } else if (change.type === 'modified' || change.type === 'added') {
        // Fetch updated file content
        try {
          const response = await fetch("/api/repository", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${github.token}`,
            },
            body: JSON.stringify({
              action: "getFile",
              owner: github.repository?.owner,
              repo: github.repository?.name,
              path: change.path,
              branch: github.repository?.defaultBranch || "main",
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setFileCache(prev => ({
              ...prev,
              [change.path]: data.file.content,
            }));

            // Update selected file if it's the one being synced
            if (selectedFile?.path === change.path) {
              setSelectedFile({
                ...selectedFile,
                content: data.file.content,
              });
            }
          }
        } catch (error) {
          console.error(`[RepoExplorer] Error syncing ${change.path}:`, error);
        }
      }
    }

    // Re-fetch repository structure to update file tree
    await fetchRepositoryStructure();

    // Auto-dismiss notification after 5 seconds
    setTimeout(() => {
      setPendingChanges([]);
      setShowSyncNotification(false);
    }, 5000);
  }, [github.token, github.repository?.owner, github.repository?.name, selectedFile?.path, fetchRepositoryStructure]);

  const fetchRepositoryStructure = useCallback(async () => {
    console.log("[RepoExplorer] Fetching structure for:", github.repository?.name);
    console.log("[RepoExplorer] Token status:", github.token ? `${github.token.substring(0, 10)}...` : "NOT CONFIGURED");

    if (!github.repository || !github.token) {
      console.log("[RepoExplorer] Skipping fetch - no repository or token");
      return;
    }

    setError(null);
    try {
      const response = await fetch("/api/repository", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${github.token}`,
        },
        body: JSON.stringify({
          action: "getStructure",
          owner: github.repository.owner,
          repo: github.repository.name,
          branch: github.repository.defaultBranch || "main",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const statusCode = response.status;
        console.error("[RepoExplorer] API Error:", statusCode, errorData);

        if (statusCode === 401) {
          throw new Error("GitHub token is invalid, expired, or lacks required permissions. Generate a new personal access token at https://github.com/settings/tokens with 'repo' scope.");
        } else if (statusCode === 404) {
          throw new Error("Repository not found. Verify the repository name and owner.");
        } else {
          throw new Error(errorData.details || errorData.error || `API error: ${statusCode}`);
        }
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch repository structure");
      }

      const filesList = buildFileTree(data.files || []);
      setFiles(filesList);
      setError(null);
      console.log("[RepoExplorer] Successfully loaded", filesList.length, "items");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("[RepoExplorer] Error:", errorMessage);
      setError(errorMessage);
    }
  }, [github.repository, github.token]);

  useEffect(() => {
    console.log("[RepoExplorer] Repository context:", {
      repo: github.repository?.name,
      hasToken: !!github.token
    });
    if (github.repository && github.token) {
      fetchRepositoryStructure();
    } else {
      setLoading(false);
    }
  }, [github.repository, github.token, fetchRepositoryStructure]);

  // Separate effect for file polling setup
  useEffect(() => {
    if (!github.repository || !github.token) {
      return;
    }

    // Initialize file poller for auto-sync
    const poller = new GitHubFilePoller(github.token);
    pollerRef.current = poller;

    // Initialize file hashes from current cache
    poller.initializeHashes(fileCache);

    // Register change listener
    const unsubscribe = poller.onChange((changeData) => {
      if (changeData.changes.length > 0) {
        setPendingChanges(changeData.changes);
        setShowSyncNotification(true);
        setLastSyncTime(new Date());
        console.log('[RepoExplorer] External changes detected:', changeData.changes);

        // Auto-apply changes if enabled
        if (autoSyncEnabled) {
          handleAutoSync(changeData.changes);
        }
      }
    });

    // Start polling only if enabled
    if (autoSyncEnabled) {
      poller.startPolling(
        github.repository.owner,
        github.repository.name,
        github.repository.defaultBranch || 'main',
        10000 // Poll every 10 seconds
      );
      setIsPolling(true);
      console.log('[RepoExplorer] File polling started');
    } else {
      setIsPolling(false);
    }

    return () => {
      poller.stopPolling();
      unsubscribe();
      setIsPolling(false);
      pollerRef.current = null;
    };
  }, [github.repository, github.token, autoSyncEnabled, fileCache, handleAutoSync]);

  useEffect(() => {
    if (!session && !authLoading) {
      setShowAuthModal(true);
    }
  }, [session, authLoading]);

  useEffect(() => {
    if (previewRef.current && previewHTML) {
      previewRef.current.srcdoc = previewHTML;
    }
  }, [previewHTML]);

  const handleFileClick = async (file) => {
    if (file.type === "folder") {
      const folderPath = file.path;
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        if (next.has(folderPath)) {
          next.delete(folderPath);
        } else {
          next.add(folderPath);
        }
        return next;
      });
      return;
    }

    try {
      const response = await fetch("/api/repository", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${github.token}`,
        },
        body: JSON.stringify({
          action: "getFile",
          owner: github.repository?.owner,
          repo: github.repository?.name,
          path: file.path,
          branch: github.repository?.defaultBranch || "main",
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch file");

      const data = await response.json();
      setSelectedFile(data.file);

      setFileCache(prev => ({
        ...prev,
        [file.path]: data.file.content,
      }));

      if (file.path.endsWith(".html")) {
        setPreviewHTML(data.file.content);
      }
    } catch (error) {
      console.error("Error fetching file:", error);
    }
  };

  const renderFileTree = (items, level = 0) => {
    return items.map((item) => {
      const hasExternalChanges = pendingChanges.some(change => change.path === item.path);
      const isModified = fileChanges[item.path]?.modified;

      return (
        <div key={item.path}>
          <div
            onClick={() => handleFileClick(item)}
            className={`flex items-center gap-1.5 px-2 py-1 hover:bg-blue-50 cursor-pointer text-xs transition-colors ${
              selectedFile?.path === item.path ? "bg-blue-100 border-l-2 border-blue-500 text-blue-900" : "text-gray-700"
            } ${hasExternalChanges ? 'bg-green-50' : ''}`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            title={hasExternalChanges ? 'This file was modified externally' : ''}
          >
            {item.type === "folder" ? (
              <>
                <span className="flex-shrink-0 w-4 flex items-center justify-center">
                  {expandedFolders.has(item.path) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </span>
                <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
              </>
            ) : (
              <>
                <span className="flex-shrink-0 w-4" />
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className={selectedFile?.path === item.path ? "font-bold" : ""}>{item.name}</span>
                <div className="ml-auto flex items-center gap-1">
                  {hasExternalChanges && (
                    <span className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0" title="External change"></span>
                  )}
                  {isModified && (
                    <span className="w-2 h-2 bg-yellow-600 rounded-full flex-shrink-0" title="Local modification"></span>
                  )}
                </div>
              </>
            )}
          </div>

          {item.type === "folder" && expandedFolders.has(item.path) && item.children && (
            <div>{renderFileTree(item.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  const getLanguageFromExtension = (path) => {
    if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
    if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
    if (path.endsWith(".html")) return "html";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".md")) return "markdown";
    return "plaintext";
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('local-user-id');
      if (!id) {
        id = `local-user-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('local-user-id', id);
      }
      setDefaultUserId(id);
    }
  }, []);

  const userId = session?.user?.id || defaultUserId || 'anonymous';

  useEffect(() => {
    if (files.length === 0 && !github.token) {
      console.log("[RepoExplorer] Initializing with empty files (no GitHub token)");
      setFiles([
        {
          path: "index.html",
          name: "index.html",
          type: "file",
        },
        {
          path: "styles.css",
          name: "styles.css",
          type: "file",
        },
        {
          path: "script.js",
          name: "script.js",
          type: "file",
        },
      ]);
      setLoading(false);
    }
  }, [github.token, files.length]);

  useEffect(() => {
    // Use context project ID if available and set locally
    if (contextProjectId) {
      setLocalProjectId(contextProjectId);
      console.log("[RepoExplorer] Using project from context:", contextProjectId);
      return;
    }

    // If we already have a local project ID, don't create another one
    if (localProjectId) return;

    // Only create a project if user is authenticated
    if (!session?.access_token) {
      console.log("[RepoExplorer] User not authenticated, waiting for authentication");
      return;
    }

    const initializeProject = async () => {
      try {
        // Prefer repository from branch sync context, fallback to integrations context
        const repoInfo = branchRepository || github.repository;

        if (!repoInfo) {
          console.log("[RepoExplorer] No repository info available yet, waiting...");
          return;
        }

        const repoUrl = repoInfo.url || repoInfo.html_url || `https://github.com/${repoInfo.owner}/${repoInfo.name}`;
        const repoBranch = repoInfo.branch || repoInfo.default_branch || "main";
        const repoName = repoInfo.name;

        const projectName = `${repoName}-${Date.now()}`;
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: projectName,
            description: `Project for ${repoName}`,
            repository_url: repoUrl,
            working_branch: repoBranch,
            status: "active",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create project");
        }

        const data = await response.json();
        const newProjectId = data.data?.id;
        if (!newProjectId) {
          throw new Error("No project ID returned from server");
        }

        setLocalProjectId(newProjectId);
        setContextProjectId(newProjectId);
        setProjectCreationError(null);
        console.log("[RepoExplorer] Project created successfully:", newProjectId);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[RepoExplorer] Project creation failed:", errorMsg);
        setProjectCreationError(errorMsg);
      }
    };

    initializeProject();
  }, [contextProjectId, session?.access_token, branchRepository, github.repository, setContextProjectId]);

  const projectId = contextProjectId || localProjectId;

  if (projectCreationError) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
          <h2 className="text-lg font-semibold text-red-900">Project Creation Failed</h2>
          <p className="text-red-700">{projectCreationError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading || isCreatingProject || !projectId) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-gray-600" />
          <p className="text-gray-600">{loading ? "Loading repository..." : isCreatingProject ? "Creating project..." : "Initializing project..."}</p>
        </div>
      </div>
    );
  }

  const handleCodeGenerated = (code, language, filePath) => {
    if (selectedFile) {
      const updatedFile = {
        ...selectedFile,
        content: code,
      };
      setSelectedFile(updatedFile);
      setFileCache(prev => ({
        ...prev,
        [selectedFile.path]: code,
      }));
    }
  };

  const handleRevert = async (actionId, fileStates) => {
    setFileCache(prev => ({
      ...prev,
      ...fileStates,
    }));

    if (selectedFile && fileStates[selectedFile.path]) {
      setSelectedFile({
        ...selectedFile,
        content: fileStates[selectedFile.path],
      });
    }
  };

  const loadFileHistory = async () => {
    if (!selectedFile || !projectId) return;

    setLoadingHistory(true);
    try {
      const response = await fetch("/api/file-snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${github.token}`,
        },
        body: JSON.stringify({
          action: "get-history",
          projectId,
          filePath: selectedFile.path,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFileHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const revertToSnapshot = async (snapshot) => {
    if (!selectedFile) return;

    try {
      const response = await fetch("/api/file-snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${github.token}`,
        },
        body: JSON.stringify({
          action: "revert",
          snapshotId: snapshot.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedFile({
          ...selectedFile,
          content: data.snapshot.content,
        });
        setFileChanges(prev => {
          const updated = { ...prev };
          delete updated[selectedFile.path];
          return updated;
        });
        alert("Reverted successfully!");
      }
    } catch (error) {
      console.error("Revert failed:", error);
      alert("Failed to revert file");
    }
  };

  const handleDividerMouseDown = (e) => {
    setIsDraggingDivider(true);
  };

  useEffect(() => {
    if (!isDraggingDivider) return;

    const handleMouseMove = (e) => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const newLeftWidth = (e.clientX - container.getBoundingClientRect().left) / containerWidth * 100;

      if (newLeftWidth > 15 && newLeftWidth < 85) {
        setPanelSizes([newLeftWidth, 100 - newLeftWidth]);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingDivider]);

  return (
    <>
      <FloatingAuthModal isOpen={showAuthModal || !session} onClose={() => !session ? null : setShowAuthModal(false)} required={!session} />
      <div style={{ display: "flex", height: "100vh", width: "100vw", flexDirection: "column", margin: 0, padding: 0 }} className="bg-white overflow-hidden" ref={containerRef}>
        <IntegrationStatusBar onOpenSettings={() => setShowAuthModal(true)} onOpenAuthModal={() => setShowAuthModal(true)} />
        <div style={{ display: "flex", flex: "1 1 auto", minHeight: 0 }} className="bg-white overflow-hidden">
        <div style={{ width: `${panelSizes[0]}%`, display: "flex", flexDirection: "column" }} className="border-r border-gray-300 bg-white overflow-hidden relative group">
          <div
            onMouseDown={() => setIsDraggingHeader(true)}
            onMouseUp={() => setIsDraggingHeader(false)}
            className={`p-3 border-b border-gray-200 space-y-2 ${isDraggingHeader ? "bg-blue-50" : "bg-gray-50"} cursor-grab active:cursor-grabbing select-none`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/setup")}
                  className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Go back to authentication setup"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-700" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-sm truncate text-gray-900">{github.repository?.name}</h2>
                  <p className="text-xs text-gray-500 truncate">{github.repository?.owner || 'github'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (pollerRef.current && github.repository && github.token) {
                      const changeData = await pollerRef.current.checkForChanges(
                        github.repository.owner,
                        github.repository.name,
                        github.repository.defaultBranch || 'main'
                      );

                      if (changeData.changes.length > 0) {
                        setPendingChanges(changeData.changes);
                        setShowSyncNotification(true);
                        setLastSyncTime(new Date());
                        await handleAutoSync(changeData.changes);
                      }
                    }
                  }}
                  className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Manually check for changes"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-700 ${isPolling ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                  className={`flex-shrink-0 p-1.5 rounded transition-colors ${
                    autoSyncEnabled
                      ? 'bg-blue-100 hover:bg-blue-200'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  title={autoSyncEnabled ? 'Auto-sync enabled' : 'Auto-sync disabled'}
                >
                  <Bell className={`w-4 h-4 ${autoSyncEnabled ? 'text-blue-700' : 'text-gray-700'}`} />
                </button>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Sign out or manage session"
                >
                  <LogOut className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>

            {showSyncNotification && pendingChanges.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <div className="text-xs text-blue-700">
                      <p className="font-semibold">
                        {pendingChanges.length} change{pendingChanges.length > 1 ? 's' : ''} synced from GitHub
                      </p>
                      <p className="text-blue-600 text-xs">
                        {pendingChanges.map(c => `${c.path} (${c.type})`).join(', ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSyncNotification(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {lastSyncTime && (
              <div className="text-xs text-gray-500 text-right">
                Last sync: {lastSyncTime.toLocaleTimeString()}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setMainViewMode("editor")}
                className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
                  mainViewMode === "editor"
                    ? "bg-blue-100 text-blue-900"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Code Mode
              </button>
              <button
                onClick={() => setMainViewMode("visual")}
                className={`px-2 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                  mainViewMode === "visual"
                    ? "bg-green-100 text-green-900"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Eye className="w-3 h-3" />
                Visual
              </button>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 cursor-grab active:cursor-grabbing select-none">
            <div className="absolute top-0 right-0 w-1 h-full bg-gray-300 hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-col-resize z-10" title="Drag to resize explorer panel" />
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Explorer</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {error ? (
              <div className="p-4 bg-red-50 border-b border-red-200 m-2 rounded">
                <p className="text-sm text-red-900 font-semibold">Error loading repository</p>
                <p className="text-xs text-red-700 mt-2">{error}</p>
                <button
                  onClick={fetchRepositoryStructure}
                  className="mt-3 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : files.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                <Loader className="w-4 h-4 animate-spin inline-block mr-2" />
                Loading files...
              </div>
            ) : (
              <div className="p-2">{renderFileTree(files)}</div>
            )}
          </div>
        </div>

        <div
          onMouseDown={handleDividerMouseDown}
          className="bg-gray-300 hover:bg-blue-500 transition-colors select-none cursor-col-resize"
          style={{
            width: "1px",
            height: "100%",
            cursor: "col-resize",
            userSelect: "none",
          }}
        />

        <div style={{ width: `${panelSizes[1]}%`, display: "flex", flexDirection: "column" }} className="bg-white overflow-hidden">
          {mainViewMode === "visual" ? (
            <VisualRenderer
              files={fileCache}
              selectedFile={selectedFile?.path}
              onFileSelect={(path) => {
                const fileToOpen = files.find(f => f.path === path);
                if (fileToOpen) {
                  handleFileClick(fileToOpen);
                }
              }}
            />
          ) : selectedFile ? (
            <>
              <div className="border-b border-gray-200 bg-gray-50 select-none">
              <div className="p-3 flex items-center justify-between border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm font-semibold truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 truncate">{selectedFile.path}</p>
                    </div>
                    {fileChanges[selectedFile.path]?.modified && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-900 text-xs rounded font-semibold">Modified</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowHistory(!showHistory);
                        if (!showHistory) {
                          loadFileHistory();
                        }
                      }}
                      className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors"
                      title="View file history"
                    >
                      {showHistory ? "Hide History" : "History"}
                    </button>
                    <button
                      onClick={() => setIsChatOpen(!isChatOpen)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title={isChatOpen ? "Hide chat" : "Show chat"}
                    >
                      {isChatOpen ? "Hide Chat" : "Show Chat"}
                    </button>
                  </div>
                </div>

                <div className="flex gap-1 px-3 py-2 border-t border-gray-200">
                  <button
                    onClick={() => setEditorTab("editor")}
                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                      editorTab === "editor"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Editor
                  </button>
                  {(selectedFile.path.endsWith(".html") || selectedFile.path.endsWith(".tsx") || selectedFile.path.endsWith(".jsx")) && (
                    <button
                      onClick={() => setEditorTab("preview")}
                      className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                        editorTab === "preview"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Preview
                    </button>
                  )}
                </div>
              </div>

              {editorTab === "editor" ? (
                <textarea
                  value={selectedFile.content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    setSelectedFile({
                      ...selectedFile,
                      content: newContent,
                    });
                    const originalContent = fileCache[selectedFile.path] || "";
                    setFileChanges(prev => ({
                      ...prev,
                      [selectedFile.path]: {
                        path: selectedFile.path,
                        originalContent,
                        modifiedContent: newContent,
                        modified: newContent !== originalContent,
                      },
                    }));
                  }}
                  className="flex-1 p-4 font-mono text-xs border-none outline-none resize-none bg-gray-900 text-gray-100"
                  spellCheck="false"
                />
              ) : (
                <div className="flex-1 p-4 bg-white overflow-auto">
                  <div className="bg-gray-50 rounded border border-gray-200 overflow-hidden">
                    <iframe
                      srcDoc={selectedFile.content}
                      className="w-full h-96 border-0"
                      title="Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </div>
              )}

              {showHistory && (
                <div className="border-t border-gray-200 bg-gray-50 p-3 max-h-40 overflow-y-auto">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Version History</p>
                  {loadingHistory ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader className="w-3 h-3 animate-spin" />
                      Loading history...
                    </div>
                  ) : fileHistory.length === 0 ? (
                    <p className="text-xs text-gray-500">No history yet</p>
                  ) : (
                    <div className="space-y-1">
                      {fileHistory.map((snapshot) => (
                        <div key={snapshot.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-gray-200 text-xs hover:bg-gray-100">
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-gray-900 font-medium">{snapshot.commit_message || "Snapshot"}</p>
                            <p className="text-gray-500 text-xs">{new Date(snapshot.created_at).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => revertToSnapshot(snapshot)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                          >
                            Revert
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500 text-center">
                <p className="font-semibold mb-2">Select a file to view</p>
                <p className="text-sm">Click on any file in the explorer to see its contents</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {Object.values(fileChanges).some(c => c.modified) && (
        <div className="border-t border-yellow-300 bg-yellow-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-yellow-900">
              {Object.values(fileChanges).filter(c => c.modified).length} file(s) changed
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Enter commit message..."
              className="flex-1 px-3 py-1.5 text-sm border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <button
              onClick={async () => {
                const changedFiles = Object.values(fileChanges).filter(c => c.modified);
                if (!changedFiles.length || !commitMessage.trim()) {
                  alert("Please add a commit message");
                  return;
                }

                setIsCommitting(true);
                try {
                  const filesObject = {};
                  changedFiles.forEach(change => {
                    filesObject[change.path] = change.modifiedContent;
                  });

                  const response = await fetch("/api/repository", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${github.token}`,
                    },
                    body: JSON.stringify({
                      action: "commitCode",
                      owner: github.repository?.owner || "",
                      repo: github.repository?.name || "",
                      repository: github.repository?.name || "",
                      files: filesObject,
                      commitMessage,
                      branch: github.repository?.defaultBranch || "main",
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    alert(`Commit failed: ${error.details || error.error}`);
                    return;
                  }

                  const result = await response.json();
                  alert(`Committed ${changedFiles.length} file(s) successfully!`);

                  setFileChanges({});
                  setCommitMessage("");

                  if (selectedFile) {
                    const newChange = fileChanges[selectedFile.path];
                    if (newChange?.modified) {
                      const updatedCache = { ...fileCache };
                      updatedCache[selectedFile.path] = newChange.modifiedContent;
                      setFileCache(updatedCache);
                    }
                  }
                } catch (error) {
                  console.error("Commit error:", error);
                  alert("Failed to commit changes");
                } finally {
                  setIsCommitting(false);
                }
              }}
              disabled={isCommitting || !commitMessage.trim()}
              className="px-4 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCommitting ? "Committing..." : "Commit & Push"}
            </button>
          </div>
        </div>
      )}

      {isChatOpen && (
        <>
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              let startY = e.clientY;
              let startHeight = chatPanelHeight;
              const handleMouseMove = (moveEvent) => {
                const newHeight = Math.max(150, startHeight - (moveEvent.clientY - startY));
                setChatPanelHeight(newHeight);
              };
              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };
              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
            className="bg-gray-300 hover:bg-blue-500 transition-colors select-none cursor-row-resize"
            style={{ height: "1px", userSelect: "none" }}
          />
          <div style={{ height: `${chatPanelHeight}px`, display: "flex", flexDirection: "column" }} className="border-t border-gray-200 bg-white overflow-hidden shadow-lg">
            {projectId && userId ? (
            <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
              <div style={{ flex: "1 1 50%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <CodeGeneratorChat
                  onCodeGenerated={handleCodeGenerated}
                  existingCode={selectedFile?.content}
                  currentFilePath={selectedFile?.path}
                  projectId={projectId}
                  userId={userId}
                  authToken={session?.access_token}
                  onActionRevert={handleRevert}
                  fileCache={fileCache}
                />
              </div>

              <div style={{ flex: "1 1 50%", display: "flex", flexDirection: "column", overflow: "hidden" }} className="border-l border-gray-200">
                <ActionHistory
                  projectId={projectId}
                  userId={userId}
                  authToken={session?.access_token}
                  onRevert={handleRevert}
                  isLoading={loading}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <Loader className="w-4 h-4 animate-spin mr-2" />
              Initializing...
            </div>
          )}
          </div>
        </>
      )}
      </div>
    </>
  );
}
