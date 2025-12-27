"use client";

import { useState, useEffect } from "react";
import { Clock, X, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

export function SessionHistory({
  projectId,
  userId,
  authToken,
  onSessionSelect,
  onActionRevert,
  isLoading = false,
}) {
  const [sessions, setSessions] = useState([]);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState(null);

  const fetchSessions = async () => {
    if (!projectId || !authToken) return;

    setLoading(true);
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          action: "getHistory", 
          projectId,
          type: "sessions"
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      
      const groupedBySession = (data.actions || []).reduce((acc, action) => {
        const sessionId = action.session_id || "default";
        if (!acc[sessionId]) {
          acc[sessionId] = {
            id: sessionId,
            timestamp: new Date(action.created_at),
            actions: [],
          };
        }
        acc[sessionId].actions.push({
          ...action,
          timestamp: new Date(action.created_at),
        });
        return acc;
      }, {});

      setSessions(Object.values(groupedBySession).sort((a, b) => b.timestamp - a.timestamp));
      setError(null);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [projectId, authToken]);

  const handleRestoreSession = (session) => {
    if (onSessionSelect) {
      onSessionSelect(session);
    }
  };

  const handleRevertAction = async (action) => {
    if (!projectId || !authToken || !action.id) return;

    setReverting(action.id);
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action: "revert",
          projectId,
          actionId: action.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to revert action");
      const data = await response.json();

      if (onActionRevert) {
        onActionRevert(action.id, data.fileStates || {});
      }

      await fetchSessions();
    } catch (err) {
      console.error("Failed to revert action:", err);
      setError(err instanceof Error ? err.message : "Failed to revert action");
    } finally {
      setReverting(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSessionLabel = (session) => {
    const actionCount = session.actions?.length || 0;
    return `${formatDate(session.timestamp)} (${actionCount} action${actionCount !== 1 ? "s" : ""})`;
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
        Loading sessions...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-sm text-gray-700">Session History</h3>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No sessions yet
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => setExpandedSessionId(
                    expandedSessionId === session.id ? null : session.id
                  )}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-100 transition-colors"
                >
                  {expandedSessionId === session.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {getSessionLabel(session)}
                    </p>
                  </div>
                </button>

                {expandedSessionId === session.id && (
                  <div className="bg-gray-50 border-t border-gray-200 divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {session.actions.map((action, index) => (
                      <div key={action.id || index} className="px-4 py-2 text-xs hover:bg-white transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-700">
                              {action.name || action.action_type || action.type || "Action"}
                            </p>
                            {action.description && (
                              <p className="text-gray-500 text-xs mt-0.5 truncate">
                                {action.description}
                              </p>
                            )}
                            {action.metadata?.prompt && (
                              <p className="text-gray-500 text-xs mt-0.5 truncate italic">
                                Prompt: {action.metadata.prompt}
                              </p>
                            )}
                            <p className="text-gray-400 text-xs mt-1">
                              {formatDate(action.timestamp)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRevertAction(action)}
                            disabled={reverting === action.id}
                            className="flex-shrink-0 p-1 hover:bg-white rounded transition-colors disabled:opacity-50"
                            title="Revert to this action"
                          >
                            {reverting === action.id ? (
                              <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
