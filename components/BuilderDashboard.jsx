"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CanvasPanel } from "@/components/CanvasPanel";
import { CodePanel } from "@/components/CodePanel";
import { TopToolbar } from "@/components/TopToolbar";
import { HistoryPanel } from "@/components/HistoryPanel";
import { SettingsModal } from "@/components/SettingsModal";

export default function BuilderDashboard() {
  const { session } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState({
    html: '<div style="padding: 40px; text-align: center;"><h1>Welcome to Roseram Builder</h1><p>Enter a prompt above to generate code</p></div>',
    css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f5f5f5;
  color: #333;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #000;
}

p {
  font-size: 1.1rem;
  color: #666;
}`,
    javascript: "console.log('Welcome to Roseram Builder');",
  });

  const [history, setHistory] = useState([]);
  const [generationLogs, setGenerationLogs] = useState([]);
  const [totalTokensUsed, setTotalTokensUsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [codeTab, setCodeTab] = useState("html");
  const streamRef = useRef(null);

  // Save code to history
  const saveToHistory = (prompt, tokensUsed) => {
    const snapshot= {
      id: Date.now().toString(),
      timestamp: new Date(),
      html: code.html,
      css: code.css,
      javascript: code.javascript,
      prompt,
      tokensUsed,
    };
    setHistory([snapshot, ...history.slice(0, 19)]);
  };

  // Generate code with real-time streaming
  const handleGenerate = async (prompt) => {
    if (!prompt.trim()) return;

    setGenerating(true);
    setError(null);
    streamRef.current = new AbortController();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: streamRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to generate code");
      }

      const data = await response.json();

      if (data.code) {
        setCode({
          html: data.code.html || code.html,
          css: data.code.css || code.css,
          javascript: data.code.javascript || code.javascript,
        });

        const tokensUsed = Math.ceil((data.code.html.length + data.code.css.length + data.code.javascript.length) / 4);
        const totalTokens = totalTokensUsed + tokensUsed;
        setTotalTokensUsed(totalTokens);

        saveToHistory(prompt, tokensUsed);

        setGenerationLogs([
          {
            timestamp: new Date(),
            prompt,
            tokensUsed,
            status: "success",
          },
          ...generationLogs,
        ]);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        const errorMessage = err.message;
        setError(errorMessage);
        setGenerationLogs([
          {
            timestamp: new Date(),
            prompt,
            tokensUsed,
            status: "error",
            error,
          },
          ...generationLogs,
        ]);
      }
    } finally {
      setGenerating(false);
    }
  };

  // Revert to previous snapshot
  const revertToSnapshot = (snapshot) => {
    setCode({
      html: snapshot.html,
      css: snapshot.css,
      javascript: snapshot.javascript,
    });
    setShowHistory(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden" style={{ backgroundColor: '#111827', color: '#ffffff' }}>
      {/* Top Toolbar */}
      <TopToolbar
        onGenerate={handleGenerate}
        loading={generating}
        error={error}
        totalTokens={totalTokensUsed}
        onShowHistory={() => setShowHistory(!showHistory)}
        onShowSettings={() => setShowSettings(!showSettings)}
        onLogout={handleLogout}
        email={session?.user?.email}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left Panel - Canvas */}
        <CanvasPanel html={code.html} css={code.css} javascript={code.javascript} />

        {/* Right Panel - Code Editor */}
        <CodePanel
          code={code}
          onCodeChange={setCode}
          activeTab={codeTab}
          onTabChange={setCodeTab}
        />
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <HistoryPanel
          history={history}
          logs={generationLogs}
          onRevert={revertToSnapshot}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
