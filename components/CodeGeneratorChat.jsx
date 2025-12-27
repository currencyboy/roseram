"use client";

import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, History, ChevronDown, ChevronUp, X, Clock } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { SessionHistory } from "./SessionHistory";

export function CodeGeneratorChat({
  onCodeGenerated,
  existingCode,
  currentFilePath,
  projectId,
  userId,
  authToken,
  onActionCreated,
  onActionRevert,
  fileCache,
}) {
  const { session } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [generatedBlocks, setGeneratedBlocks] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const token = authToken || session?.access_token;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [generatedBlocks]);

  const detectLanguage = (filePath) => {
    if (!filePath) return undefined;
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) return "typescript";
    if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) return "javascript";
    if (filePath.endsWith(".py")) return "python";
    if (filePath.endsWith(".html")) return "html";
    if (filePath.endsWith(".css")) return "css";
    if (filePath.endsWith(".json")) return "json";
    if (filePath.endsWith(".sql")) return "sql";
    if (filePath.endsWith(".md")) return "markdown";
    return "plaintext";
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const blockId = `block-${Date.now()}`;
    const language = detectLanguage(currentFilePath);
    const promptText = prompt;

    // Add generating block
    setGeneratedBlocks((prev) => [
      ...prev,
      {
        id: blockId,
        prompt: promptText,
        code: "",
        language,
        filePath: currentFilePath,
        timestamp: new Date(),
        status: "generating",
      },
    ]);

    setSelectedBlockId(blockId);
    setPrompt("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/grok-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          context: {
            language,
            filePath: currentFilePath,
            existingCode,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedCode = data.code || "";

      // Update block with generated code
      setGeneratedBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId
            ? {
                ...block,
                code: generatedCode,
                status: "complete",
              }
            : block
        )
      );

      // Track action in database if project and user are available
      if (projectId && userId && token) {
        try {
          const actionResponse = await fetch("/api/actions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: "create",
              projectId,
              actionType: "generation",
              description: `Generated code for ${currentFilePath}`,
              filePath: currentFilePath,
              codeContent: generatedCode,
              filesSnapshot: fileCache || {},
              metadata: {
                prompt: promptText,
                language,
                model: "grok-4",
              },
            }),
          });

          if (actionResponse.ok) {
            const actionData = await actionResponse.json();
            onActionCreated?.(actionData.action.id);
          }
        } catch (err) {
          console.error("Failed to track action:", err);
        }
      }

      onCodeGenerated(generatedCode, language, currentFilePath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setGeneratedBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId
            ? {
                ...block,
                status: "error",
                error: errorMessage,
              }
            : block
        )
      );
      console.error("Code generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevert = (blockId) => {
    setGeneratedBlocks((prev) => prev.filter((block) => block.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const handleClearHistory = () => {
    setGeneratedBlocks([]);
    setSelectedBlockId(null);
  };

  const selectedBlock = generatedBlocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="flex flex-col h-full bg-white border-t border-gray-200">
      {/* Chat Header with Session History Icon */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-sm text-gray-700">Code Generator</h3>
        <button
          onClick={() => setShowSessionHistory(!showSessionHistory)}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors opacity-60 hover:opacity-100"
          title="Toggle session history"
        >
          <History className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col gap-0">
        {/* Code Display or Session History */}
        {showSessionHistory ? (
          <SessionHistory
            projectId={projectId}
            userId={userId}
            authToken={token}
            onActionRevert={onActionRevert}
            isLoading={false}
          />
        ) : (
          <>
            {/* Code Display Area */}
            {selectedBlock ? (
              <>
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Generated Code</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {selectedBlock.language && (
                        <span className="mr-2 font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                          {selectedBlock.language}
                        </span>
                      )}
                      {selectedBlock.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevert(selectedBlock.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Revert this generation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div
                  ref={scrollRef}
                  className="flex-1 overflow-auto p-4 font-mono text-sm bg-gray-900 text-gray-100"
                >
                  {selectedBlock.status === "generating" ? (
                    <div className="animate-pulse text-gray-400">Generating code...</div>
                  ) : selectedBlock.status === "error" ? (
                    <div className="text-red-400">
                      <p className="font-semibold mb-2">Error:</p>
                      <p>{selectedBlock.error}</p>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words">{selectedBlock.code}</pre>
                  )}
                </div>

                <div className="p-2 border-t border-gray-200 bg-gray-50">
                  <p className="text-xs text-gray-600 line-clamp-2">
                    <span className="font-semibold">Prompt:</span> {selectedBlock.prompt}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div className="text-gray-400">
                  <p className="font-semibold mb-2">No code generated yet</p>
                  <p className="text-sm">Enter a prompt below and click Generate to start</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* History Sidebar Toggle */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 w-full"
        >
          <History className="w-4 h-4" />
          Generation History ({generatedBlocks.length})
          {showHistory ? (
            <ChevronUp className="w-4 h-4 ml-auto" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-auto" />
          )}
        </button>
      </div>

      {/* History List */}
      {showHistory && generatedBlocks.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-200 overflow-y-auto max-h-40">
          {generatedBlocks.map((block) => (
            <div
              key={block.id}
              onClick={() => setSelectedBlockId(block.id)}
              className={`p-2 border-b border-gray-200 cursor-pointer transition-colors ${
                selectedBlockId === block.id
                  ? "bg-blue-100 border-l-2 border-l-blue-500"
                  : "hover:bg-gray-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{block.prompt}</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {block.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevert(block.id);
                  }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                  title="Revert"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {generatedBlocks.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="w-full p-2 text-xs text-red-600 hover:bg-red-50 text-center border-t border-gray-200 font-semibold"
            >
              Clear History
            </button>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Describe the code you want to generate..."
            disabled={isGenerating}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
