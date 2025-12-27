import { logger } from './errors';

const X_API_KEY = process.env.X_API_KEY || process.env.NEXT_PUBLIC_X_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-4'; // Latest Grok model for coding tasks

export class GrokStreamingClient {
  constructor(apiKey = X_API_KEY) {
    if (!apiKey) {
      throw new Error('Grok API key not configured. Set X_API_KEY environment variable.');
    }
    this.apiKey = apiKey;
    this.model = GROK_MODEL;
  }

  /**
   * Stream code generation with real-time token output
   * @param {Array} messages - Chat history with system/user/assistant messages
   * @param {Object} options - Configuration options
   * @returns {Promise<ReadableStream>} Stream of JSON responses
   */
  async streamCodeGeneration(messages, options = {}) {
    const {
      temperature = 0.3, // Lower temp for coding = more deterministic
      maxTokens = 4000,
      topP = 0.95,
      onToken = null, // Callback for each token
      onDone = null, // Callback when stream ends
    } = options;

    const systemPrompt = `You are an expert code generator and software architect with deep knowledge of modern web development frameworks (React, Vue, Next.js, etc).

CRITICAL CODING RULES:
1. Generate ONLY complete, production-ready code - NO placeholders, NO TODOs, NO comments like "{/* implementation */}"
2. Include ALL necessary imports, dependencies, and function implementations
3. Match the exact code style and patterns of the existing codebase
4. For file modifications, understand the context and make SURGICAL changes
5. For new files, ensure they integrate seamlessly with existing code
6. Always return valid JSON format for file changes (see output format below)
7. Be deterministic - same input should yield same output

REQUIRED OUTPUT FORMAT for code changes:
{
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "COMPLETE file content - every line needed",
      "operation": "create|modify|delete",
      "reason": "Brief explanation of why this file changed"
    }
  ],
  "explanation": "Overall changes made and why",
  "affectedFiles": ["list", "of", "file", "paths"]
}

For simple responses without code changes, return:
{
  "response": "Your message here",
  "type": "text|suggestion|question"
}`;

    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream: true,
    };

    try {
      const response = await fetch(GROK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Grok streaming error', { status: response.status, error });
        throw new Error(`Grok API error: ${response.status} - ${error}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (onDone) onDone(fullContent);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const token = data.choices?.[0]?.delta?.content || '';
              if (token) {
                fullContent += token;
                if (onToken) onToken(token);
              }
            } catch (e) {
              // Skip parsing errors for keep-alive messages
            }
          }
        }
      }

      return fullContent;
    } catch (error) {
      logger.error('Grok streaming failed', error);
      throw error;
    }
  }

  /**
   * Non-streaming API call for simple requests
   */
  async call(messages, options = {}) {
    const { temperature = 0.7, maxTokens = 2000 } = options;

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert code generation and analysis assistant.',
          },
          ...messages,
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Grok API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
    };
  }

  /**
   * Analyze codebase context to find relevant files for modification
   */
  async findRelevantFiles(userPrompt, fileList, codebaseContext) {
    const response = await this.call([
      {
        role: 'user',
        content: `Given this user request: "${userPrompt}"

Available files in the codebase:
${fileList.map(f => `- ${f}`).join('\n')}

Which files would need to be modified or created to fulfill this request? 
Only list file paths that are DIRECTLY relevant. Return as JSON array: ["file1.js", "file2.jsx"]`,
      },
    ]);

    try {
      const match = response.content.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Analyze code and suggest specific changes
   */
  async analyzeCodeForChanges(userPrompt, selectedFile, fileContent, codebaseContext) {
    const response = await this.call([
      {
        role: 'user',
        content: `User request: "${userPrompt}"

Current file: ${selectedFile}
\`\`\`
${fileContent}
\`\`\`

Codebase context (other relevant files):
${codebaseContext}

What specific changes should be made to this file to fulfill the request? Explain your analysis.`,
      },
    ]);

    return response.content;
  }
}

// Singleton instance for global use
let grokClientInstance = null;

export function getGrokClient() {
  if (!grokClientInstance) {
    grokClientInstance = new GrokStreamingClient();
  }
  return grokClientInstance;
}

export default GrokStreamingClient;
