'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader, ChevronRight, ChevronDown, FileText, Folder, Eye, Code, Zap, Copy, Download, Settings, Menu, X, AlertCircle, MessageSquare, Github, Package, LogOut, Plus, Trash2, GitBranch, Globe } from 'lucide-react';
import { useIntegrations } from '@/lib/integrations-context';
import { useBranchSync } from '@/lib/branch-sync-context';
import { useAuth } from './AuthProvider';
import { useBilling } from './BillingProvider';
import { useProject } from '@/lib/project-context';
import { RevisionHistory } from './RevisionHistory';
import { ActionsLog } from './ActionsLog';
import { useRevisions } from '@/lib/useRevisions';
import { useResizable } from '@/lib/useResizable';
import { EnhancedIntegrationModal } from './EnhancedIntegrationModal';
import { SmartCodeChat } from './SmartCodeChat';
import { FileDiffPreview } from './FileDiffPreview';
import { FloatingAuthModal } from './FloatingAuthModal';
import { PreviewPanel } from './PreviewPanel';
import { EnhancedPreview } from './EnhancedPreview';
import { buildCodebaseContextString } from '@/lib/codebase-intelligence';
import { IntegrationStatusBar } from './IntegrationStatusBar';
import { detectFrameworks, detectDependencies } from '@/lib/dependency-detector';
import { detectEntryPoint } from '@/lib/entry-point-detector';
import { BranchFileLoader } from './BranchFileLoader';
import { BalanceMeter } from './BalanceMeter';
import { UsageInsightsModal } from './UsageInsightsModal';
import { BranchCreationModal } from './BranchCreationModal';
import CodeBuilderErrorBoundary from './CodeBuilderErrorBoundary';

function CodeBuilderComponent() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const { github } = useIntegrations();
  const { currentBranch, repository } = useBranchSync();
  const { session } = useAuth();
  const { openBillingModal } = useBilling();
  const { projectId: contextProjectId, isCreatingProject } = useProject();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [previewHTML, setPreviewHTML] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileCache, setFileCache] = useState({});
  const [fileChanges, setFileChanges] = useState({});
  const [viewMode, setViewMode] = useState('split');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const projectId = contextProjectId;
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [codebaseAnalysis, setCodebaseAnalysis] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(null);
  const [allFiles, setAllFiles] = useState([]);
  const [previewPath, setPreviewPath] = useState('/');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [devServerUrl, setDevServerUrl] = useState('http://localhost:3001');
  const [urlRepoLoaded, setUrlRepoLoaded] = useState(false);
  const [frameworks, setFrameworks] = useState([]);
  const [detectedDependencies, setDetectedDependencies] = useState([]);
  const [pushingChanges, setPushingChanges] = useState(false);
  const [pushError, setPushError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [editorTab, setEditorTab] = useState('preview');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [entryPointLoaded, setEntryPointLoaded] = useState(false);
  const [isInMemoryMode, setIsInMemoryMode] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState(new Set()); // Track which files are loaded into memory
  const [indexedFiles, setIndexedFiles] = useState([]); // All available files (metadata only)
  const [branchCreationProgress, setBranchCreationProgress] = useState(null);
  const [branchCreationError, setBranchCreationError] = useState(null);
  const [existingBranches, setExistingBranches] = useState([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [previewConfig, setPreviewConfig] = useState(null);
  const [previewStatus, setPreviewStatus] = useState('idle'); // idle, loading, running, error
  const branchCreationTimeoutRef = useRef(null);
  const branchCreationStartRef = useRef(null);
  const iframeRef = useRef(null);
  const { saveRevision, logAction } = useRevisions(projectId);


  // Stub function for backward compatibility
  const syncFile = () => {};

  // Track branch creation progress
  useEffect(() => {
    if (!currentBranch && repository && github.token) {
      // Branch creation is in progress, start timer to show modal if it takes too long
      if (!branchCreationStartRef.current) {
        branchCreationStartRef.current = Date.now();
        setBranchCreationProgress('Initializing...');

        branchCreationTimeoutRef.current = setTimeout(() => {
          setShowBranchModal(true);
          setBranchCreationProgress('Taking longer than expected. Checking for existing branches...');
        }, 3000); // Show modal after 3 seconds
      }
    } else if (currentBranch && branchCreationStartRef.current) {
      // Branch creation completed, clear tracking
      if (branchCreationTimeoutRef.current) {
        clearTimeout(branchCreationTimeoutRef.current);
      }
      branchCreationStartRef.current = null;
      setBranchCreationProgress(null);
      setBranchCreationError(null);
      setShowBranchModal(false);
    }

    return () => {
      if (branchCreationTimeoutRef.current) {
        clearTimeout(branchCreationTimeoutRef.current);
      }
    };
  }, [currentBranch, repository, github.token]);

  useEffect(() => {
    if (currentBranch && repository && github.token) {
      console.log('[CodeBuilder] Repository and branch ready for Fly.io preview:', {
        owner: currentBranch.owner,
        repo: currentBranch.repo,
        branch: currentBranch.name,
      });

      setError(null);
    }
  }, [currentBranch, repository, github.token]);


  const leftPanel = useResizable(405, 400, 800);
  const codeEditorPanel = useResizable(192, 100, 600);

  // Auth check - removed to allow unauthenticated access
  useEffect(() => {
    // Users can access the app without signing in
    console.log("[CodeBuilder] Authentication optional - allowing access without sign-in");
  }, [session]);

  // Handle logout
  const handleLogout = async () => {
    try {
      // Sign out using the auth context
      await fetch('/api/auth/logout', { method: 'POST' });
      // The onAuthStateChange listener will update the session state
      // and automatically redirect or show the auth modal
      console.log("User logged out");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = process.env.NEXT_PUBLIC_APP_URL ||
                 (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);
      setDevServerUrl(url);
    }
  }, []);


  const buildFileTree = (files) => {
    const treeMap = new Map(); // Map to track all folder nodes
    const rootItems = []; // Top-level items
    const totalFiles = files.length;

    // First pass: create all folders and files
    files.forEach((file) => {
      const parts = file.path.split('/').filter(p => p); // Remove empty parts from leading/trailing slashes
      if (parts.length === 0) {
        console.warn('[CodeBuilder] Skipping file with empty path:', file);
        return;
      }

      // Create all parent folders and track them
      for (let i = 0; i < parts.length - 1; i++) {
        const folderPath = parts.slice(0, i + 1).join('/');
        if (!treeMap.has(folderPath)) {
          treeMap.set(folderPath, {
            path: folderPath,
            name: parts[i],
            type: 'folder',
            children: [],
            parentPath: i > 0 ? parts.slice(0, i).join('/') : null,
          });
        }
      }

      // Add the file to its parent folder
      const fileObj = {
        path: file.path,
        name: file.name || file.path.split('/').pop(),
        type: 'file',
        sha: file.sha,
      };

      if (parts.length === 1) {
        // Root-level file
        rootItems.push(fileObj);
      } else {
        const parentPath = parts.slice(0, parts.length - 1).join('/');
        if (!treeMap.has(parentPath)) {
          treeMap.set(parentPath, {
            path: parentPath,
            name: parts[parts.length - 2],
            type: 'folder',
            children: [],
            parentPath: parts.length > 2 ? parts.slice(0, parts.length - 2).join('/') : null,
          });
        }
        treeMap.get(parentPath).children.push(fileObj);
      }
    });

    // Second pass: build parent-child relationships between folders
    treeMap.forEach((folder, folderPath) => {
      if (folder.parentPath === null) {
        // Top-level folder
        rootItems.push(folder);
      } else {
        // Nested folder - add to parent's children
        const parent = treeMap.get(folder.parentPath);
        if (parent) {
          // Check if this folder is already in parent's children
          if (!parent.children.some(child => child.path === folderPath)) {
            parent.children.push(folder);
          }
        }
      }
    });

    const sortItems = (items) => {
      return items.sort((a, b) => {
        // Folders first, then files
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        // Alphabetically within each type
        return a.name.localeCompare(b.name);
      }).map(item => ({
        ...item,
        children: item.children ? sortItems(item.children) : undefined,
      }));
    };

    const sortedResult = sortItems(rootItems);
    console.log(`[CodeBuilder] Built file tree: ${totalFiles} files → ${sortedResult.length} top-level items, ${treeMap.size} folders`);

    return sortedResult;
  };

  const analyzeCodebase = useCallback(async () => {
    if (isInMemoryMode && fileCache && Object.keys(fileCache).length > 0) {
      try {
        const codebaseContent = Object.values(fileCache).join('\n');
        const detectedFrameworks = detectFrameworks(codebaseContent);
        const detectedDeps = detectDependencies(codebaseContent);

        setFrameworks(detectedFrameworks);
        setDetectedDependencies(detectedDeps);
        setCodebaseAnalysis({ frameworks: detectedFrameworks, dependencies: detectedDeps });
      } catch (err) {
        console.error('[CodeBuilder] Codebase analysis error:', err);
      }
    }
  }, [isInMemoryMode, fileCache]);


  // Auto-detect and load entry point file for forked repos
  useEffect(() => {
    if (allFiles.length > 0 && !entryPointLoaded && isInMemoryMode) {
      analyzeCodebase();
      detectEntryPoint(allFiles).then((entryPoint) => {
        if (entryPoint) {
          console.log('[CodeBuilder] Detected entry point:', entryPoint);

          // Find the entry point file in the files list
          const findFileInTree = (tree, targetPath) => {
            if (Array.isArray(tree)) {
              for (const item of tree) {
                if (item.path === targetPath) return item;
                if (item.children) {
                  const found = findFileInTree(item.children, targetPath);
                  if (found) return found;
                }
              }
            }
            return null;
          };

          const entryFile = findFileInTree(files, entryPoint.path);
          if (entryFile) {
            console.log('[CodeBuilder] Loading entry point file:', entryPoint.path);
            // Auto-click the entry point file
            handleFileClick(entryFile);
            // Use the detected entry point's preview path
            setPreviewPath(entryPoint.previewPath || '/');
            console.log('[CodeBuilder] Set preview path to:', entryPoint.previewPath);
          } else {
            console.warn('[CodeBuilder] Entry point file not found in tree:', entryPoint.path);
            // Still set preview path even if file not found
            setPreviewPath(entryPoint.previewPath || '/');
          }
        } else {
          console.warn('[CodeBuilder] No entry point detected, using root path');
          setPreviewPath('/');
        }
        setEntryPointLoaded(true);
      });
    }
  }, [allFiles, files, entryPointLoaded, isInMemoryMode, analyzeCodebase]);

  const handleFileClick = async (file) => {
    if (file.type === 'folder') {
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
      // Load file on-demand if not already in cache
      const content = await loadFileOnDemand(file.path);

      setSelectedFile({
        path: file.path,
        name: file.name,
        content: content || `<!-- ${file.name} -->\n<!-- Edit this file -->`,
      });

      // Update preview path - for Next.js app, root file previews at /
      const isRootEntry = file.path === 'app/page.jsx' || file.path === 'app/page.tsx' || file.path === 'app/page.js' || file.path === 'app/page.ts';
      setPreviewPath(isRootEntry ? '/' : file.path);

      // Auto-switch to preview tab for preview-able files
      const isPreviewable = /\.(html|jsx|tsx)$/.test(file.path);
      setEditorTab(isPreviewable ? 'preview' : 'code');

      logAction('edit', file.path, `Opened ${file.name}`);
    } catch (err) {
      console.error('[CodeBuilder] Error selecting file:', err);
      setError(`Failed to load file: ${err.message}`);
    }
  };

  /**
   * Handle file selection and update editor
   * Called when user selects a file to edit
   */
  const loadFileOnDemand = async (filePath) => {
    // If already in cache, return immediately
    if (fileCache[filePath] !== undefined) {
      return fileCache[filePath];
    }

    // If already loaded, return from memory
    if (loadedFiles.has(filePath)) {
      return fileCache[filePath];
    }

    // Files are loaded from GitHub, not from WebContainer
    return '';
  };

  const handleFileContentChange = (newContent) => {
    if (!selectedFile) return;

    const filePath = selectedFile.path;
    setSelectedFile((prev) => prev ? { ...prev, content: newContent } : null);

    setFileChanges((prev) => ({
      ...prev,
      [filePath]: {
        path: filePath,
        originalContent: fileCache[filePath] || '',
        modifiedContent: newContent,
        modified: newContent !== (fileCache[filePath] || ''),
      },
    }));

    // In memory mode: update fileCache immediately so File Explorer stays in sync
    if (isInMemoryMode) {
      setFileCache((prev) => ({
        ...prev,
        [filePath]: newContent,
      }));

      // Changes are synced through the fileCache state
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;

    try {
      saveRevision(
        selectedFile.path,
        selectedFile.content,
        'edit',
        'Manual save'
      );

      // Update file cache
      setFileCache(prev => ({
        ...prev,
        [selectedFile.path]: selectedFile.content,
      }));

      // File is synced through fileCache state

      // In memory mode: rebuild file tree to reflect changes in File Explorer
      if (isInMemoryMode) {
        const updatedFiles = allFiles.map(path => ({
          path,
          name: path.split('/').pop(),
          type: 'file',
          sha: '', // Not needed in memory mode
        }));
        const filesList = buildFileTree(updatedFiles);
        setFiles(filesList);
        console.log('[CodeBuilder] File tree updated in memory mode');
      }

      logAction('edit', selectedFile.path, 'File saved');
      setError(null);

      // Trigger immediate preview refresh for code files
      const isCodeFile = /\.(html|css|js|jsx|tsx|ts)$/.test(selectedFile.path);
      if (isCodeFile) {
        // Immediate refresh
        setRefreshTrigger(prev => prev + 1);

        // Secondary refresh to ensure iframe is fully updated
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 250);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    }
  };


  const handlePushChanges = async () => {
    if (!github.token || !github.repository) {
      setPushError('GitHub repository not connected');
      return;
    }

    if (Object.keys(fileChanges).length === 0) {
      setPushError('No changes to push');
      return;
    }

    setPushingChanges(true);
    setPushError(null);

    try {
      // Prepare files for commit
      const filesToCommit = Object.values(fileChanges).map(change => ({
        path: change.path,
        content: change.modifiedContent,
      }));

      const response = await fetch('/api/repository/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${github.token}`,
        },
        body: JSON.stringify({
          owner: github.repository.owner,
          repo: github.repository.name,
          token: github.token,
          branch: github.repository.defaultBranch || 'main',
          message: `Update from ROSERAM Builder - ${new Date().toISOString()}`,
          files: filesToCommit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Push failed (${response.status})`);
      }

      const data = await response.json();

      // Clear file changes after successful push
      setFileChanges({});
      logAction('push', 'commit', `Pushed ${filesToCommit.length} files to GitHub`);

      // Show success message
      setError(null);
      alert(`✅ Successfully pushed ${filesToCommit.length} file(s) to GitHub\n\nCommit: ${data.commit.sha.substring(0, 7)}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Push failed';
      console.error('Push error:', errorMsg);
      setPushError(errorMsg);
    } finally {
      setPushingChanges(false);
    }
  };

  const handlePushToMain = async () => {
    if (!currentBranch || !github.token) {
      setError('No repository branch or GitHub token configured');
      return;
    }

    // Get files from memory or tracked changes
    let filesToPush;

    if (isInMemoryMode) {
      // In memory mode, use fileCache
      filesToPush = fileCache;
    } else {
      // Use tracked fileChanges
      filesToPush = Object.fromEntries(
        Object.entries(fileChanges).map(([key, change]) => [change.path, change.modifiedContent])
      );
    }

    if (Object.keys(filesToPush).length === 0) {
      const message = isInMemoryMode
        ? 'No files to push. Edit files in the editor to create changes, then push them to GitHub.'
        : 'No files have been modified. Edit files and try again.';
      setError(message);
      return;
    }

    setPushingChanges(true);
    setError(null);

    try {
      // Convert to array format (handle both objects and arrays)
      const filesArray = Array.isArray(filesToPush)
        ? filesToPush
        : Object.entries(filesToPush).map(([path, content]) => ({ path, content }));

      // Push to GitHub using the forked repo info
      const response = await fetch('/api/github/push-to-main', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${github.token}`,
        },
        body: JSON.stringify({
          token: github.token,
          owner: repository?.owner || currentBranch?.owner,
          repo: repository?.name || currentBranch?.repo,
          files: filesArray,
          message: `Update from ROSERAM Builder - ${new Date().toISOString()}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Push failed (${response.status})`);
      }

      const result = await response.json();

      if (result && result.success) {
        // Clear file changes after successful push
        setFileChanges({});
        setError(null);
        logAction('push', 'main', `Pushed ${filesArray.length} files to ${forkedRepo.repoName} main branch`);

        alert(`✅ Successfully pushed ${filesArray.length} file(s) to main branch\n\nCommit: ${result.commit.sha.substring(0, 7)}`);
      } else {
        throw new Error('Push operation failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Push failed';
      console.error('[CodeBuilder] Push to main error:', errorMsg);
      setError(errorMsg);
    } finally {
      setPushingChanges(false);
    }
  };

  const handleApplyPendingChanges = async (files) => {
    try {
      // Handle both old format (with newContent) and new format (with content)
      const appliedChanges = [];
      let firstFile = null;

      for (const file of files) {
        const filePath = file.path;
        const fileContent = file.content || file.newContent;

        if (!filePath || !fileContent) continue;

        await saveRevision(
          filePath,
          fileContent,
          'generate',
          `Generated via Smart AI - ${file.reason || 'Code generation'}`
        );

        setFileCache(prev => ({
          ...prev,
          [filePath]: fileContent,
        }));

        if (selectedFile?.path === filePath) {
          setSelectedFile(prev => prev ? { ...prev, content: fileContent } : null);
        }

        appliedChanges.push(filePath);

        // Track the first file to auto-select it
        if (!firstFile) {
          firstFile = { path: filePath, content: fileContent, name: filePath.split('/').pop() };
        }
      }

      // Auto-select and display the first modified file in real-time
      if (firstFile && !selectedFile?.path) {
        setSelectedFile({
          path: firstFile.path,
          name: firstFile.name,
          content: firstFile.content,
        });

        // Auto-switch to preview tab for previewable files
        const isPreviewable = /\.(html|jsx|tsx)$/.test(firstFile.path);
        if (isPreviewable) {
          setEditorTab('preview');
          setPreviewPath(firstFile.path);
        }
      } else if (firstFile && selectedFile?.path !== firstFile.path) {
        // If a different file was selected, update it
        setSelectedFile({
          path: firstFile.path,
          name: firstFile.name,
          content: firstFile.content,
        });

        const isPreviewable = /\.(html|jsx|tsx)$/.test(firstFile.path);
        if (isPreviewable) {
          setEditorTab('preview');
          setPreviewPath(firstFile.path);
        }
      }

      setPendingChanges(null);
      setError(null);
      logAction('generate', 'multiple', `Applied smart-generated changes to ${appliedChanges.length} files`);

      // Trigger multiple refreshes for better UI responsiveness
      setRefreshTrigger(prev => prev + 1);

      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 100);

      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to apply changes';
      console.error('Error applying changes:', errorMsg);
      setError(errorMsg);
    }
  };

  const handleRestoreRevision = async (revision) => {
    if (!selectedFile) return;

    setSelectedFile((prev) => prev ? { ...prev, content: revision.content } : null);
    handleFileContentChange(revision.content);
    setFileCache((prev) => ({
      ...prev,
      [selectedFile.path]: revision.content,
    }));
  };

  // Add new file in memory mode
  const handleCreateFile = useCallback((filePath, content = '') => {
    if (!isInMemoryMode) {
      setError('File creation is only available in memory mode (after forking)');
      return;
    }

    if (fileCache[filePath]) {
      setError(`File ${filePath} already exists`);
      return;
    }

    setFileCache((prev) => ({
      ...prev,
      [filePath]: content,
    }));

    setAllFiles((prev) => [...prev, filePath]);

    const updatedFiles = [...allFiles, filePath].map(path => ({
      path,
      name: path.split('/').pop(),
      type: 'file',
      sha: '',
    }));
    const filesList = buildFileTree(updatedFiles);
    setFiles(filesList);

    // Auto-select the new file
    setSelectedFile({
      path: filePath,
      name: filePath.split('/').pop(),
      content,
      type: 'file',
    });

    setFileChanges((prev) => ({
      ...prev,
      [filePath]: {
        path: filePath,
        originalContent: '',
        modifiedContent: content,
        modified: true,
      },
    }));

    logAction('create', filePath, `Created new file ${filePath}`);
    console.log(`[CodeBuilder] Created new file: ${filePath}`);
  }, [isInMemoryMode, fileCache, allFiles, logAction]);

  // Delete file in memory mode
  const handleDeleteFile = useCallback((filePath) => {
    if (!isInMemoryMode) {
      setError('File deletion is only available in memory mode (after forking)');
      return;
    }

    setFileCache((prev) => {
      const newCache = { ...prev };
      delete newCache[filePath];
      return newCache;
    });

    setAllFiles((prev) => prev.filter(p => p !== filePath));

    const updatedFiles = allFiles.filter(p => p !== filePath).map(path => ({
      path,
      name: path.split('/').pop(),
      type: 'file',
      sha: '',
    }));
    const filesList = buildFileTree(updatedFiles);
    setFiles(filesList);

    // If the deleted file was selected, clear selection
    if (selectedFile?.path === filePath) {
      setSelectedFile(null);
    }

    setFileChanges((prev) => {
      const newChanges = { ...prev };
      delete newChanges[filePath];
      return newChanges;
    });

    logAction('delete', filePath, `Deleted file ${filePath}`);
    console.log(`[CodeBuilder] Deleted file: ${filePath}`);
  }, [isInMemoryMode, fileCache, allFiles, selectedFile, logAction]);

  const renderFileTree = (items, level = 0) => {
    return items.map((item) => (
      <div key={item.path}>
        <div
          className={`flex items-center gap-1.5 px-2 py-1 hover:bg-blue-50 cursor-pointer text-xs transition-colors group ${
            selectedFile?.path === item.path ? 'bg-blue-100 border-l-2 border-blue-500 text-blue-900' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <div
            onClick={() => handleFileClick(item)}
            className="flex items-center gap-1.5 flex-1 min-w-0"
          >
            {item.type === 'folder' ? (
              <>
                <span className="flex-shrink-0 w-4 flex items-center justify-center">
                  {expandedFolders.has(item.path) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </span>
                <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="font-medium truncate">{item.name}</span>
              </>
            ) : (
              <>
                <span className="flex-shrink-0 w-4" />
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className={`truncate ${selectedFile?.path === item.path ? 'font-bold' : ''}`}>{item.name}</span>
                {fileChanges[item.path]?.modified && (
                  <span className="ml-auto w-2 h-2 bg-yellow-600 rounded-full flex-shrink-0"></span>
                )}
              </>
            )}
          </div>

          {isInMemoryMode && item.type === 'file' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete ${item.name}?`)) {
                  handleDeleteFile(item.path);
                }
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 text-red-600 rounded transition-colors flex-shrink-0"
              title="Delete file"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {item.type === 'folder' && expandedFolders.has(item.path) && item.children && (
          <div>{renderFileTree(item.children, level + 1)}</div>
        )}
      </div>
    ));
  };


  return (
    <div className="flex h-screen w-screen bg-gray-50 relative overflow-hidden">
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-4 p-2 bg-white hover:bg-gray-100 rounded-r-lg transition-colors border border-l-0 border-gray-200 shadow-md z-50"
          title="Expand File Explorer"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
      <div
        className={`${
          sidebarOpen ? 'w-64 flex-shrink-0' : 'w-0'
        } transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}
      >
        <div className="p-3 border-b border-gray-200 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-sm">
              File Explorer
            </h2>
            <div className="flex items-center gap-1">
            {isInMemoryMode && (
              <button
                onClick={() => {
                  const fileName = prompt('Enter new file path (e.g., src/App.jsx):');
                  if (fileName) {
                    handleCreateFile(fileName, '');
                  }
                }}
                className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                title="Create new file"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            </div>
          </div>
          {currentBranch && (
            <div className="text-xs bg-green-50 text-green-700 px-2 py-1.5 rounded border border-green-200 truncate">
              <span className="font-semibold">🌿 </span>
              <code className="font-mono text-xs">{currentBranch.name.substring(0, 30)}</code>
              {currentBranch.name.length > 30 && <span>...</span>}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : files.length > 0 ? (
            <div>{renderFileTree(files)}</div>
          ) : (
            <div className="p-3 text-xs text-gray-500 text-center space-y-2">
              <p>No files found</p>
              {!currentBranch && (
                <div className="text-blue-600 text-xs bg-blue-50 p-2 rounded">
                  Connect GitHub to start editing
                </div>
              )}
              {currentBranch && (
                <div className="text-blue-600 text-xs bg-blue-50 p-2 rounded">
                  Loading branch files...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Load files from the working branch */}
      <BranchFileLoader
        githubToken={github.token}
        onFilesLoaded={(files) => {
          if (!files) {
            console.log('[CodeBuilder] BranchFileLoader returned null');
            return;
          }

          if (files.length === 0) {
            console.log('[CodeBuilder] Working branch is empty (newly created)');
            setIsInMemoryMode(true);
            return;
          }

          // Only update if we don't already have files
          if (allFiles.length === 0 && files.length > 0) {
            const newFileCache = {};
            files.forEach(file => {
              if (file.path) {
                newFileCache[file.path] = file.content || '';
              }
            });

            const fileStructure = files.map(f => ({
              path: f.path,
              name: f.name || f.path.split('/').pop(),
              type: 'file',
              sha: f.sha,
            }));

            setFileCache(newFileCache);
            setAllFiles(fileStructure.map(f => f.path));
            const filesList = buildFileTree(fileStructure);
            setFiles(filesList);
            setIsInMemoryMode(true);

            console.log('[CodeBuilder] Loaded and synced files from working branch:', files.length);
          }
        }}
        onError={(errorMsg) => {
          console.error('[CodeBuilder] BranchFileLoader error:', errorMsg);
          setError(errorMsg);
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between w-full">
          {/* Session Indicator and Repository Selector */}
          <div className="flex items-center gap-2">
            {session?.user ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm border border-green-200"
                title="Click to view account details"
              >
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                Signed in: {session.user.email}
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm border border-gray-300"
                title="Click to sign in"
              >
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                Not signed in
              </button>
            )}

          </div>

          <div className="flex items-center gap-3">
            <BalanceMeter onOpenModal={openBillingModal} />

            {!github.token && (
              <button
                onClick={() => setShowIntegrationModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-medium text-sm border border-amber-200"
              >
                <AlertCircle className="w-4 h-4" />
                Connect GitHub
              </button>
            )}


            {currentBranch && (isInMemoryMode || Object.keys(fileChanges).length > 0) && (
              <button
                onClick={handlePushToMain}
                disabled={pushingChanges}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                title="Push changes to GitHub"
              >
                {pushingChanges ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                Push to GitHub ({Object.keys(fileChanges).length > 0 ? Object.keys(fileChanges).length : Object.keys(fileCache).length})
              </button>
            )}

            <button
              onClick={() => setShowIntegrationModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
              title="Integration settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {session?.user && (
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-600 hover:text-red-600"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Status notifications are now in Status tab - only show if no currentBranch */}
        {!currentBranch && (
          <>
            <IntegrationStatusBar
              onOpenSettings={() => setShowIntegrationModal(true)}
              onOpenAuthModal={() => setShowAuthModal(true)}
            />
          </>
        )}

        {!currentBranch ? (
          <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
            <div className="text-center space-y-4 max-w-md p-4">
              {!github.token ? (
                <>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Github className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Connect GitHub</h2>
                  <p className="text-gray-600 text-sm">To get started, connect your GitHub account and select a repository to start editing.</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      console.log('[CodeBuilder] Connect GitHub button clicked', e);
                      setShowIntegrationModal(true);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Github className="w-4 h-4" />
                    Connect GitHub
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Github className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Select a Repository</h2>
                  <p className="text-gray-600 text-sm">Choose a GitHub repository to start editing and create your working branch.</p>
                  <button
                    onClick={() => setShowIntegrationModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
                  >
                    <Github className="w-4 h-4" />
                    Select Repository
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden relative">
            {pendingChanges && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 m-4">
                <div className="w-full max-w-4xl h-5/6 bg-white rounded-lg shadow-2xl overflow-hidden">
                  <FileDiffPreview
                    changes={pendingChanges}
                    onApply={handleApplyPendingChanges}
                    onCancel={() => setPendingChanges(null)}
                    loading={generating}
                  />
                </div>
              </div>
            )}

            {/* Left Panel: Smart Code Chat */}
            <div
              ref={leftPanel.containerRef}
              style={{ width: `${leftPanel.width}px` }}
              className="flex flex-col overflow-hidden flex-shrink-0 p-3 bg-white"
            >
              <SmartCodeChat
                onGenerateCode={handleApplyPendingChanges}
                onClose={() => {
                  setSelectedFile(null);
                  setFiles([]);
                  setShowIntegrationModal(true);
                }}
                loading={generating}
                error={error}
                codebaseContext={codebaseAnalysis ? buildCodebaseContextString(codebaseAnalysis) : ''}
                fileList={allFiles}
                fileContents={fileCache}
                conversationHistory={chatHistory}
                onHistoryUpdate={setChatHistory}
                onDetectionResults={(results) => {
                  console.log('[CodeBuilder] Detection results:', results);
                  // You can use this to highlight files in the explorer, etc.
                }}
              />
            </div>

            {/* Fixed Divider */}
            <div
              className="w-1 bg-gray-200 flex-shrink-0"
              style={{ userSelect: 'none' }}
            />

            {/* Right Panel: Code Editor + Live Preview with Tabs */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedFile ? (
                <div className="flex flex-col h-full">
                  {/* Tab Headers */}
                  <div className="flex gap-0 border-b border-gray-200 bg-gray-50 rounded-t-lg mb-0 flex-shrink-0">
                    <button
                      onClick={() => setEditorTab('code')}
                      className={`px-4 py-3 text-sm font-medium transition-colors ${
                        editorTab === 'code'
                          ? 'bg-white text-gray-900 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Code
                    </button>
                    <button
                      onClick={() => setEditorTab('preview')}
                      className={`px-4 py-3 text-sm font-medium transition-colors ${
                        editorTab === 'preview'
                          ? 'bg-white text-gray-900 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setEditorTab('status')}
                      className={`px-4 py-3 text-sm font-medium transition-colors ${
                        editorTab === 'status'
                          ? 'bg-white text-gray-900 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Status
                    </button>
                    <button
                      onClick={() => setEditorTab('history')}
                      className={`px-4 py-3 text-sm font-medium transition-colors ${
                        editorTab === 'history'
                          ? 'bg-white text-gray-900 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      History
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-hidden bg-white border border-t-0 border-gray-200 rounded-b-lg">
                    {/* Code Tab */}
                    {editorTab === 'code' && (
                      <div className="flex flex-col h-full w-full">
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between select-none flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-gray-600">{selectedFile.name}</p>
                            <span className="text-xs text-gray-500">{selectedFile.path}</span>
                          </div>
                          <button
                            onClick={handleSaveFile}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                          >
                            Save
                          </button>
                        </div>
                        <textarea
                          value={selectedFile.content}
                          onChange={(e) => handleFileContentChange(e.target.value)}
                          className="flex-1 p-4 font-mono text-xs resize-none focus:outline-none border-0 overflow-auto"
                          spellCheck="false"
                        />
                      </div>
                    )}

                    {/* Preview Tab */}
                    {editorTab === 'preview' && (
                      <div className="flex-1 overflow-hidden w-full h-full">
                        <EnhancedPreview
                          projectId={projectId}
                          currentBranch={currentBranch}
                          repository={repository}
                          onOpenIntegrations={() => setShowIntegrationModal(true)}
                          onInitiateDeployment={(repoInfo) => {
                            console.log('[CodeBuilder] Initiating deployment for:', repoInfo);
                            // Fly.io deployment is handled by SyncedFlyPreview
                            setEditorTab('status');
                          }}
                          onPreviewStatusChange={(previewUpdate) => {
                            console.log('[CodeBuilder] Preview status update:', previewUpdate);
                            setPreviewStatus(previewUpdate.status);
                            if (previewUpdate.config) {
                              setPreviewConfig(previewUpdate.config);
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Status Tab */}
                    {editorTab === 'status' && (
                      <div className="flex flex-col h-full overflow-auto p-3 space-y-3">
                        {/* Integration Status */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            Integration Status
                          </h3>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <IntegrationStatusBar
                              onOpenSettings={() => setShowIntegrationModal(true)}
                              onOpenAuthModal={() => setShowAuthModal(true)}
                            />
                          </div>
                        </div>

                        {/* Working Branch Status */}
                        {currentBranch && (
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                              Working Branch
                            </h3>
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                              <div className="space-y-2">
                                <div>
                                  <strong className="block text-green-900">Branch Name:</strong>
                                  <code className="font-mono text-xs bg-white px-2 py-1 rounded mt-1 inline-block">{currentBranch.name}</code>
                                </div>
                                <div>
                                  <strong className="block text-green-900">Repository:</strong>
                                  <span className="text-xs text-green-700">{currentBranch.owner}/{currentBranch.repo}</span>
                                </div>
                                {currentBranch.url && (
                                  <div>
                                    <strong className="block text-green-900">URL:</strong>
                                    <a href={currentBranch.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                      View on GitHub
                                    </a>
                                  </div>
                                )}
                                <div className="mt-3 p-2 bg-white border border-green-200 rounded">
                                  <p className="text-xs text-green-700 font-medium">✓ Changes will sync to GitHub automatically</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Fly.io Preview Status */}
                        {currentBranch && (
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              Preview Environment
                            </h3>
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                              <div className="space-y-2">
                                <div>
                                  <strong className="block text-blue-900">Repository:</strong>
                                  <span className="text-xs text-blue-700">{currentBranch.owner}/{currentBranch.repo}</span>
                                </div>
                                <div>
                                  <strong className="block text-blue-900">Branch:</strong>
                                  <code className="font-mono text-xs bg-white px-2 py-1 rounded mt-1 inline-block">{currentBranch.name}</code>
                                </div>
                                <div>
                                  <strong className="block text-blue-900">Files Loaded:</strong>
                                  <span className="text-xs text-blue-700">{Object.keys(fileCache).length} files</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                  <strong className="block text-blue-900 mb-2">Preview Status:</strong>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${previewStatus === 'running' ? 'bg-green-500 animate-pulse' : previewStatus === 'error' ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                                    <span className="text-xs capitalize">{previewStatus || 'initializing'}</span>
                                  </div>
                                  {previewConfig?.previewUrl && (
                                    <div className="mt-2">
                                      <a
                                        href={previewConfig.previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline break-all"
                                      >
                                        {previewConfig.previewUrl}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Error Status */}
                        {(error || pushError) && (
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                              Errors
                            </h3>
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                              {error || pushError}
                            </div>
                          </div>
                        )}

                        {!currentBranch && !error && !pushError && (
                          <div className="flex items-center justify-center h-32 text-gray-500">
                            <p className="text-sm">No status information available</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* History Tab */}
                    {editorTab === 'history' && (
                      <div className="flex flex-col h-full overflow-auto">
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
                          {chatHistory && chatHistory.length > 0 ? (
                            <div className="space-y-3 p-3">
                              {chatHistory.map((message, index) => (
                                <div key={message.id || index} className="space-y-2">
                                  <div className={`rounded-lg p-3 ${
                                    message.role === 'user'
                                      ? 'bg-blue-50 border border-blue-200'
                                      : 'bg-green-50 border border-green-200'
                                  }`}>
                                    <div className="flex items-start gap-2">
                                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                        message.role === 'user'
                                          ? 'bg-blue-200 text-blue-900'
                                          : 'bg-green-200 text-green-900'
                                      }`}>
                                        {message.role === 'user' ? 'You' : 'Grok'}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap break-words">
                                      {message.content}
                                    </p>
                                  </div>

                                  {message.detection && (
                                    <div className="ml-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                      <p className="text-xs font-semibold text-yellow-900 mb-2">📊 Analysis:</p>
                                      <div className="text-xs text-yellow-800 space-y-1">
                                        {message.detection.filesAffected && (
                                          <p>
                                            <strong>Files Affected:</strong> {message.detection.filesAffected.length > 0
                                              ? message.detection.filesAffected.slice(0, 3).join(', ')
                                              : 'None'}
                                            {message.detection.filesAffected.length > 3 && ` +${message.detection.filesAffected.length - 3} more`}
                                          </p>
                                        )}
                                        {message.detection.changeTypes && message.detection.changeTypes.length > 0 && (
                                          <p>
                                            <strong>Changes:</strong> {message.detection.changeTypes.join(', ')}
                                          </p>
                                        )}
                                        {message.detection.relevantFiles && message.detection.relevantFiles.length > 0 && (
                                          <p>
                                            <strong>Related:</strong> {message.detection.relevantFiles.slice(0, 2).join(', ')}
                                            {message.detection.relevantFiles.length > 2 && ` +${message.detection.relevantFiles.length - 2} more`}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {message.generation && (
                                    <div className="ml-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                      <p className="text-xs font-semibold text-indigo-900 mb-2">💾 Generated:</p>
                                      <div className="text-xs text-indigo-800 space-y-1">
                                        {message.generation.files && (
                                          <p>
                                            <strong>Files:</strong> {message.generation.files.length} modified/created
                                          </p>
                                        )}
                                        {message.generation.explanation && (
                                          <p>
                                            <strong>Details:</strong> {message.generation.explanation.substring(0, 100)}...
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 flex-col gap-2">
                              <MessageSquare className="w-8 h-8 text-gray-300" />
                              <p className="text-sm">No conversation history yet</p>
                              <p className="text-xs">Start by asking Grok to generate or modify code</p>
                            </div>
                          )}
                        </div>

                        {chatHistory && chatHistory.length > 0 && (
                          <div className="border-t border-gray-200 p-3 bg-gray-50">
                            <div className="text-xs text-gray-600 space-y-1">
                              <p><strong>Summary:</strong> {chatHistory.filter(m => m.role === 'user').length} requests, {chatHistory.filter(m => m.role === 'assistant' && m.generation).length} generations</p>
                              {chatHistory.filter(m => m.generation && m.generation.files).length > 0 && (
                                <p><strong>Total Changes:</strong> {chatHistory.reduce((sum, m) => sum + (m.generation?.files?.length || 0), 0)} files modified</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>Select a file to view its code or preview</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <EnhancedIntegrationModal
        isOpen={showIntegrationModal}
        onClose={() => setShowIntegrationModal(false)}
      />

      <FloatingAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        required={true}
      />

      <UsageInsightsModal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
      />

      <BranchCreationModal
        isOpen={showBranchModal}
        owner={repository?.owner}
        repo={repository?.repo}
        progress={branchCreationProgress}
        error={branchCreationError}
        existingBranches={existingBranches}
        onRetry={() => {
          // Retry branch creation by switching repos
          setShowIntegrationModal(true);
          setShowBranchModal(false);
        }}
        onCancel={() => {
          setShowBranchModal(false);
          branchCreationStartRef.current = null;
        }}
        onSelectExistingBranch={(branch) => {
          // User selected an existing branch
          setShowBranchModal(false);
          console.log('[CodeBuilder] User selected existing branch:', branch.name);
          // The branch sync context should handle resuming the branch
        }}
      />
    </div>
  );
}

export function CodeBuilder() {
  return (
    <CodeBuilderErrorBoundary>
      <CodeBuilderComponent />
    </CodeBuilderErrorBoundary>
  );
}
