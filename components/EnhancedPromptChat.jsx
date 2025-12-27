'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, MessageSquare, Zap, Copy, CheckCircle, AlertCircle } from 'lucide-react';

export function EnhancedPromptChat({
  onSendPrompt,
  loading = false,
  error = null,
  codebaseContext = '',
  projectStructure = '',
  techStack = [],
  onHistoryUpdate = null,
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    try {
      await onSendPrompt(inputValue, newMessages);

      // Add assistant response message after prompt processing
      const assistantMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: 'I\'ve analyzed your request and generated the necessary changes. Please review and apply them in the preview window.',
        timestamp: new Date(),
      };

      // Small delay to allow the pending changes to be set first
      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage]);
      }, 300);
    } catch (err) {
      console.error('Error sending prompt:', err);
    } finally {
      setIsLoading(false);
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
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">

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
              {message.fileChanges && message.fileChanges.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium mb-1">Files Updated:</p>
                  <div className="space-y-1">
                    {message.fileChanges.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-xs">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {file.path}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'assistant' && (
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
              <Loader className="w-4 h-4 animate-spin text-blue-600" />
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
      <div className="border-t border-gray-200 p-6 bg-white flex flex-col gap-4">
        <textarea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me to generate code, create components, modify files... (Ctrl+Enter to send)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-48 text-base"
          rows={2}
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
        >
          {isLoading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send
        </button>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear History
          </button>
        )}
      </div>
    </div>
  );
}
