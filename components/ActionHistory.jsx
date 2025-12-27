"use client";

import { useState, useEffect } from "react";
import { RotateCcw, Clock, Trash2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function ActionHistory({
  projectId,
  userId,
  authToken,
  onRevert,
  onActionCreated,
  isLoading = false,
}) {
  const { session } = useAuth();
  const token = authToken || session?.access_token;
  const [actions, setActions] = useState([]);
  const [expandedActionId, setExpandedActionId] = useState(null);
  const [isReverting, setIsReverting] = useState(false);
  const [error, setError] = useState(null);
  const [reverted, setReverted] = useState(false);

  const fetchActions = async () => {
    if (!projectId || !token) return;

    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "getHistory", projectId }),
      });

      if (!response.ok) throw new Error("Failed to fetch actions");
      const data = await response.json();
      setActions(
        (data.actions || []).map((a) => ({
          ...a,
          timestamp: new Date(a.created_at),
        }))
      );
      setError(null);
    } catch (err) {
      console.error("Failed to fetch actions:", err);
      setError(err instanceof Error ? err.message : "Failed to load history");
    }
  };

  useEffect(() => {
    if (reverted) {
      fetchActions();
      setReverted(false);
    }
  }, [reverted]);

  useEffect(() => {
    if (projectId && token) {
      fetchActions();
    }
  }, [projectId, token]);

  const handleRevertAction = async (actionId) => {
    if (!projectId || !userId || !token) return;

    setIsReverting(true);
    setError(null);

    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "revert",
          projectId,
          actionId,
        }),
      });

      if (!response.ok) throw new Error("Failed to revert action");
      const data = await response.json();

      await onRevert(actionId, data.fileStates || {});
      setReverted(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Failed to revert action:", err);
    } finally {
      setIsReverting(false);
    }
  };

  const handleFullRollback = async (targetActionIndex) => {
    if (!projectId || !userId || !token) return;

    setIsReverting(true);
    setError(null);

    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "rollback",
          projectId,
          snapshotIndex,
        }),
      });

      if (!response.ok) throw new Error("Failed to rollback to snapshot");
      const data = await response.json();

      await onRevert("", data.fileStates || {});
      setReverted(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Failed to rollback:", err);
    } finally {
      setIsReverting(false);
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case "generation":
        return "";
      case "edit":
        return "✏️";
      case "revert":
        return "↩️";
      case "save":
        return "";
      default:
        return "•";
    }
  };

  const getActionColor = (type) => {
    switch (type) {
      case "generation":
        return "bg-blue-50 border-l-blue-400";
      case "edit":
        return "bg-amber-50 border-l-amber-400";
      case "revert":
        return "bg-red-50 border-l-red-400";
      case "save":
        return "bg-green-50 border-l-green-400";
      default:
        return "bg-gray-50 border-l-gray-400";
    }
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a project to view history
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-t border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Action History</h3>
        <p className="text-xs text-gray-600 mt-1">{actions.length} actions</p>
      </div>

      {error && (
        <div className="p-2 mx-2 mt-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {isLoading || !actions.length ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          {isLoading ? "Loading history..." : "No actions yet"}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 p-2">
            {actions.map((action, index) => (
              <div
                key={action.id}
                className={`border-l-4 p-3 rounded transition-colors cursor-pointer hover:bg-opacity-75 ${getActionColor(action.action_type)}`}
              >
                <div
                  onClick={() => setExpandedActionId(expandedActionId === action.id ? null : action.id)}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg flex-shrink-0">{getActionIcon(action.action_type)}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 capitalize">
                          {action.action_type}
                        </p>
                        {action.description && (
                          <p className="text-xs text-gray-700 truncate">{action.description}</p>
                        )}
                        {action.file_path && (
                          <p className="text-xs text-gray-600 font-mono">{action.file_path}</p>
                        )}
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {action.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevertAction(action.id);
                      }}
                      disabled={isReverting}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors disabled:text-gray-400"
                      title="Revert this action"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    {index > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFullRollback(index - 1);
                        }}
                        disabled={isReverting}
                        className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-colors disabled:text-gray-400"
                        title="Rollback to this point"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {expandedActionId === action.id && action.code_content && (
                  <div className="mt-2 p-2 bg-gray-900 rounded text-gray-100 font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap break-words">{action.code_content.slice(0, 500)}</pre>
                    {action.code_content.length > 500 && (
                      <p className="text-gray-400 text-xs mt-2">... ({action.code_content.length - 500} more characters)</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {actions.length > 0 && !isLoading && (
        <div className="border-t border-gray-200 p-2 bg-gray-50">
          <button
            onClick={() => handleFullRollback(0)}
            disabled={isReverting}
            className="w-full px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded font-semibold transition-colors disabled:text-gray-400"
          >
            Reset All Changes
          </button>
        </div>
      )}
    </div>
  );
}
