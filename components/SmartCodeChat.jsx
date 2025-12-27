'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader, MessageSquare, Zap, Copy, CheckCircle, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { useBranchSync } from '@/lib/branch-sync-context';

export function SmartCodeChat({
  onGenerateCode,
  onClose = null,
  loading = false,
  error = null,
  codebaseContext = '',
  fileList = [],
  fileContents = {},
  conversationHistory = [],
  onHistoryUpdate = null,
  onDetectionResults = null,
}) {
  const { currentBranch } = useBranchSync();
  const [messages, setMessages] = useState(conversationHistory);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    if (onHistoryUpdate) {
      onHistoryUpdate(messages);
    }
  }, [messages, onHistoryUpdate]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setStreamingContent('');
    setAnalysisResults(null);

    try {
      // Call the smart generate endpoint
      const response = await fetch('/api/builder/smart-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: inputValue,
          fileList,
          fileContents,
          codebaseContext,
          conversationHistory: newMessages.filter(m => m.role !== 'user' || m !== userMessage),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Generation failed (${response.status})`);
      }

      const data = await response.json();

      // Store detection results
      setAnalysisResults(data.detection);
      if (onDetectionResults) {
        onDetectionResults(data.detection);
      }

      // Add assistant message with generation details
      const assistantMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.generation.response || data.generation.explanation || 'Code generated successfully',
        timestamp: new Date(),
        generation: data.generation,
        detection: data.detection,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Call the callback with generated files
      if (onGenerateCode && data.generation.files) {
        onGenerateCode(data.generation.files);
      }

    } catch (err) {
      console.error('[SmartCodeChat] Error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Code generation failed'}`,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSendMessage();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear conversation history? This action cannot be undone.')) {
      setMessages([]);
      setAnalysisResults(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with Back Button */}
      {onClose && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-gray-600 hover:text-gray-900"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3">
              <Sparkles className="w-12 h-12 text-blue-500 mx-auto opacity-50" />
              <p className="text-gray-500 font-medium">Smart Code Generation</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Describe what you want to change in your code. I'll analyze your codebase and make the changes automatically.
              </p>
            </div>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Detection Results */}
              {message.detection && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  <p className="text-xs font-semibold text-blue-600">Analysis Results:</p>
                  {message.detection.changeTypes && message.detection.changeTypes.length > 0 && (
                    <p className="text-xs">
                      <strong>Changes detected:</strong> {message.detection.changeTypes.join(', ')}
                    </p>
                  )}
                  {message.detection.relevantFiles && message.detection.relevantFiles.length > 0 && (
                    <div className="text-xs">
                      <strong>Files to modify:</strong>
                      <ul className="mt-1 space-y-1">
                        {message.detection.relevantFiles.map((file, i) => (
                          <li key={i} className="text-blue-600 font-mono text-xs ml-2">
                            • {file}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* File Changes */}
              {message.generation?.files && message.generation.files.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium mb-2">Files Modified:</p>
                  <div className="space-y-1">
                    {message.generation.files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-xs">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <code className="bg-gray-100 px-2 py-1 rounded text-gray-700 flex-1">
                          {file.path}
                        </code>
                        {file.operation && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {file.operation}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'assistant' && !message.isError && (
              <button
                onClick={() => copyToClipboard(message.content)}
                className="ml-2 p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                title="Copy message"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg rounded-bl-none px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Analyzing code and generating changes...</p>
              </div>
              {streamingContent && (
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  {streamingContent.slice(0, 100)}
                  {streamingContent.length > 100 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white flex flex-col">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to change in your code. I'll analyze your codebase and make the changes automatically."
          className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none flex-1 text-xs placeholder:text-xs"
          disabled={isLoading}
        />

        {/* Analysis Info */}
        {analysisResults && (
          <div className="text-xs text-gray-600 bg-blue-50 p-2 border-t border-gray-200">
            <p className="font-semibold text-blue-700 mb-1">Last Analysis:</p>
            <p>Files analyzed: {analysisResults.fileCount}, Changes detected: {analysisResults.changeTypes?.length || 0}</p>
          </div>
        )}

        <button
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium border-0 border-t border-gray-200"
        >
          {isLoading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isLoading ? 'Generating...' : 'Generate Code'}
        </button>

        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors p-3 border-t border-gray-200"
          >
            Clear History
          </button>
        )}
      </div>
    </div>
  );
}
