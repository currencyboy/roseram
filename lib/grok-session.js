import { logger } from './errors';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-4';

export const GROK_SYSTEM_PROMPTS = {
  CODEBASE_AWARE: `You are an expert AI code assistant with deep knowledge of web development, frameworks, and best practices.

Your role:
1. ONLY provide assistance related to the user's current codebase
2. REFUSE requests that don't pertain to their project structure
3. Analyze the provided codebase context to understand:
   - Project structure and file organization
   - Technologies and frameworks used
   - Dependencies and versions
   - Existing code patterns and conventions

Rules:
- If a request cannot be completed with the current codebase, explain why clearly
- Suggest alternative approaches that work with existing technologies
- Maintain consistency with existing code style and patterns
- Always verify your suggestions against the actual codebase provided
- If unsure about codebase context, ask clarifying questions

Output format:
- Provide complete, production-ready code snippets
- Include file paths for new/modified files
- Explain changes in the context of the project
- Identify any new dependencies needed`,

  HIDDEN_ASSISTANT: `You are GROK, a hidden AI assistant operating silently behind the scenes.
- Never introduce yourself or acknowledge being an AI
- Respond directly to user requests without preamble
- Be concise and technical
- Focus on delivering working code solutions
- Reference the codebase naturally without over-explaining context`,
};

export async function callGrokAPIWithSession(
  messages,
  sessionId,
  userXApiKey = null,
  model = GROK_MODEL,
  maxTokens = 4000,
  topP = 0.9
) {
  // Use session-specific key or fallback to environment key
  const apiKey = userXApiKey || process.env.X_API_KEY;

  if (!apiKey) {
    throw new Error('No X.AI API key available. Please provide a valid API key.');
  }

  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        top_p: topP,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('Grok API error', { status: response.status, error: errorData });

      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your X.AI credentials.');
      }

      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('No response from Grok API');
    }

    return data.choices[0].message;
  } catch (error) {
    logger.error('Grok session call failed', { error, sessionId });
    throw error;
  }
}

export async function generateWithCodebaseContext(
  sessionId,
  prompt,
  codebaseContext,
  conversationHistory = [],
  userXApiKey = null
) {
  const messages = [
    {
      role: 'system',
      content: GROK_SYSTEM_PROMPTS.CODEBASE_AWARE,
    },
    {
      role: 'system',
      content: `Codebase context:\n${codebaseContext}`,
    },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await callGrokAPIWithSession(
    messages,
    sessionId,
    userXApiKey
  );

  return response.content;
}

export async function analyzeCodebaseWithGrok(
  sessionId,
  codebaseContent,
  userXApiKey = null
) {
  const messages = [
    {
      role: 'system',
      content: GROK_SYSTEM_PROMPTS.CODEBASE_AWARE,
    },
    {
      role: 'user',
      content: `Analyze this codebase and provide:
1. Project structure overview
2. Key technologies/frameworks detected
3. Dependencies (npm packages)
4. Code patterns and conventions
5. Potential improvements or issues

Codebase:\n${codebaseContent}`,
    },
  ];

  const response = await callGrokAPIWithSession(
    messages,
    sessionId,
    userXApiKey
  );

  return response.content;
}

export async function generateCodeChanges(
  sessionId,
  prompt,
  codebaseContext,
  userXApiKey = null
) {
  const messages = [
    {
      role: 'system',
      content: GROK_SYSTEM_PROMPTS.HIDDEN_ASSISTANT,
    },
    {
      role: 'system',
      content: `Current codebase context:\n${codebaseContext}

Generate code changes in this format:
FILE: path/to/file.ext
\`\`\`language
code content
\`\`\`

---FILE: another/file.ext
\`\`\`language
code content
\`\`\``,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await callGrokAPIWithSession(
    messages,
    sessionId,
    userXApiKey
  );

  return parseCodeChanges(response.content);
}

function parseCodeChanges(response) {
  const files = [];
  const fileBlocks = response.split(/^---?FILE:/m);

  for (const block of fileBlocks) {
    if (!block.trim()) continue;

    const lines = block.trim().split('\n');
    const filePath = lines[0].trim();

    if (!filePath) continue;

    // Extract code between backticks
    const codeMatch = block.match(/```(?:.*?\n)?([\s\S]*?)```/);
    if (!codeMatch) continue;

    files.push({
      path: filePath,
      content: codeMatch[1].trim(),
      language: detectLanguage(filePath),
    });
  }

  return files;
}

function detectLanguage(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const langMap = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    py: 'python',
    java: 'java',
    rb: 'ruby',
  };
  return langMap[ext] || ext;
}
