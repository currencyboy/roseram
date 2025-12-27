"use client";

export function HistoryPanel({
  history,
  logs,
  onRevert,
  onClose,
}) {
  return (
    <div className="fixed inset-y-0 right-96 w-80 bg-gray-800 border-l border-gray-700 shadow-lg z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h2 className="font-bold">History & Logs</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-300 transition"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {history.length === 0 ? (
          <div className="text-gray-400 text-sm">No history yet</div>
        ) : (
          history.map((snapshot) => {
            const log = logs.find((l) => l.timestamp.getTime() === snapshot.timestamp.getTime());
            return (
              <div
                key={snapshot.id}
                className="bg-gray-700 rounded p-3 space-y-2 hover:bg-gray-600 transition cursor-pointer"
                onClick={() => onRevert(snapshot)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-100 line-clamp-2">
                      {snapshot.prompt}
                    </p>
                  </div>
                  {log?.status === "success" ? (
                    <span className="text-green-400 text-xs">✓</span>
                  ) : (
                    <span className="text-red-400 text-xs">✗</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {snapshot.tokensUsed} tokens •{" "}
                  {snapshot.timestamp.toLocaleTimeString()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="bg-gray-900 border-t border-gray-700 px-4 py-3 text-xs text-gray-400">
        <div>Total Generations: {logs.length}</div>
        <div>
          Successful:{" "}
          {logs.filter((l) => l.status === "success").length}
        </div>
        <div>
          Failed:{" "}
          {logs.filter((l) => l.status === "error").length}
        </div>
      </div>
    </div>
  );
}
