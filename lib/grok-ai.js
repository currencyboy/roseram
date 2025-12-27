import { logger, ExternalServiceError, ValidationError } from './errors';

const X_API_KEY = process.env.X_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = process.env.NEXT_PUBLIC_AI_MODEL || 'grok-4';

export const GROK_SYSTEM_PROMPTS = {
  CODE_GENERATION: `You are an expert web developer. Generate production-ready HTML, CSS, and JavaScript code based on user prompts.
  
  Format your response with code blocks:
  \`\`\`html
  <!-- HTML code here -->
  \`\`\`
  
  \`\`\`css
  /* CSS code here */
  \`\`\`
  
  \`\`\`javascript
  // JavaScript code here
  \`\`\`
  
  Include metadata in your response:
  Framework: React/Vue/Vanilla (specify which you used)
  Dependencies: List any required npm packages
  
  Always generate clean, accessible, and responsive code.`,

  CONTENT_GENERATION: `You are an expert content strategist and copywriter. Generate high-quality, engaging content for websites.
  
  Create well-structured content with:
  - Compelling titles and descriptions
  - Clear, benefit-focused copy
  - Logical flow and organization
  - Call-to-action suggestions
  - SEO-friendly recommendations
  
  Format your response with the structure:
  {
    "title": "Page Title",
    "description": "Meta description",
    "sections": [
      {
        "heading": "Section Heading",
        "content": "Section content",
        "type": "hero|benefits|features|testimonials|cta"
      }
    ]
  }`,

  DESIGN_SUGGESTION: `You are an expert UI/UX designer. Provide design recommendations for web pages.
  
  Consider:
  - Color schemes and typography
  - Layout and spacing
  - Component suggestions
  - Accessibility best practices
  - Mobile responsiveness
  - Modern design trends
  
  Provide detailed recommendations in a structured format.`,

  PAGE_LAYOUT: `You are an expert in web page builder. Generate a complete page structure with components and styling.
  
  Create a JSON representation of page blocks that includes:
  - Block type (hero, features, pricing, testimonials, etc.)
  - Component structure
  - Styling configuration
  - Content templates
  
  Format JSON that can be used by a page builder system.`,

  OPTIMIZATION: `You are a web performance and optimization expert. Analyze and suggest improvements for web content.
  
  Provide recommendations for:
  - Performance optimization
  - SEO improvements
  - Accessibility enhancements
  - User experience improvements
  - Conversion rate optimization
  
  Be specific and actionable in your suggestions.`,
};

export async function callGrokAPI(messages, model = GROK_MODEL, maxTokens = 2000, topP = 0.9) {
  if (!X_API_KEY) {
    throw new ExternalServiceError(
      'Grok API',
      'X_API_KEY is not configured',
      { statusCode: 500 }
    );
  }

  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${X_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        top_p: topP,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Grok API error', { status: response.status, error });
      throw new ExternalServiceError(
        'Grok API',
        `API returned status ${response.status}`,
        { statusCode: response.status, details: error }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const tokensUsed = data?.usage?.total_tokens || 0;

    if (!content) {
      throw new ExternalServiceError(
        'Grok API',
        'No content returned from API',
        { statusCode: 500 }
      );
    }

    return {
      success: true,
      content,
      tokens_used: tokensUsed,
      model,
    };
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }

    logger.error('Grok API call failed', error);
    throw new ExternalServiceError(
      'Grok API',
      'Failed to call Grok API',
      { statusCode: 500, details: String(error) }
    );
  }
}

export function extractCodeBlocks(text) {
  const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
  const cssMatch = text.match(/```css\n([\s\S]*?)```/);
  const jsMatch = text.match(/```(?:javascript|js)\n([\s\S]*?)```/);
  const frameworkMatch = text.match(/Framework:\s*([^\n]+)/i);
  const depsMatch = text.match(/Dependencies:\s*([^\n]+)/i);

  const dependencies = depsMatch
    ? depsMatch[1]
        .split(',')
        .map(d => d.trim())
        .filter(Boolean)
    : [];

  return {
    html: htmlMatch ? htmlMatch[1].trim() : '<div class="generated-content"></div>',
    css: cssMatch
      ? cssMatch[1].trim()
      : 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto; }',
    javascript: jsMatch ? jsMatch[1].trim() : 'console.log("Ready");',
    framework: frameworkMatch ? frameworkMatch[1].trim() : null,
    dependencies: dependencies.length > 0 ? dependencies : null,
  };
}

export function parseJSONContent(text) {
  const jsonMatch = text.match(/```json\n([\s\S]*?)```/) || 
                   text.match(/({[\s\S]*})/);
  
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      logger.warn('Failed to parse JSON content', e);
    }
  }

  return { content: text };
}

export async function generateCode(prompt, context = []) {
  if (!prompt || prompt.trim().length === 0) {
    throw new ValidationError('Prompt cannot be empty');
  }

  if (prompt.length > 10000) {
    throw new ValidationError('Prompt is too long (max 10000 characters)');
  }

  const messages = [
    {
      role: 'system',
      content: GROK_SYSTEM_PROMPTS.CODE_GENERATION,
    },
    ...context,
    { role: 'user', content: prompt },
  ];

  logger.info('Generating code with Grok', { promptLength: prompt.length });

  const response = await callGrokAPI(messages);
  const code = extractCodeBlocks(response.content);

  return {
    ...code,
    tokens_used: response.tokens_used,
  };
}

export async function generateContent(prompt, context = []) {
  if (!prompt || prompt.trim().length === 0) {
    throw new ValidationError('Prompt cannot be empty');
  }

  const messages = [
    {
      role: 'system',
      content: GROK_SYSTEM_PROMPTS.CONTENT_GENERATION,
    },
    ...context,
    { role: 'user', content: prompt },
  ];

  logger.info('Generating content with Grok', { promptLength: prompt.length });

  const response = await callGrokAPI(messages);
  const content = parseJSONContent(response.content);

  return {
    ...content,
    tokens_used: response.tokens_used,
  };
}

export async function generatePageLayout(prompt, context = []) {
  if (!prompt || prompt.trim().length === 0) {
    throw new ValidationError('Prompt cannot be empty');
  }

  const messages = [
    {
      role: 'system',
      content: GROK_SYSTEM_PROMPTS.PAGE_LAYOUT,
    },
    ...context,
    { role: 'user', content: prompt },
  ];

  logger.info('Generating page layout with Grok', { promptLength: prompt.length });

  const response = await callGrokAPI(messages);
  
  try {
    const layout = parseJSONContent(response.content);
    return {
      ...layout,
      tokens_used: response.tokens_used,
    };
  } catch (e) {
    logger.error('Failed to parse page layout', e);
    return {
      blocks: [],
      tokens_used: response.tokens_used,
    };
  }
}

export async function suggestDesign(pageDescription, context = []) {
  const messages = [
    {
      role: 'system',
      content: GROK_SYSTEM_PROMPTS.DESIGN_SUGGESTION,
    },
    ...context,
    { role: 'user', content: pageDescription },
  ];

  logger.info('Generating design suggestions with Grok');

  const response = await callGrokAPI(messages);

  return {
    ...response,
    content: response.content,
    tokens_used: response.tokens_used,
  };
}

export async function optimizeContent(content, context = []) {
  const messages = [
    {
      role: 'system',
      content: GROK_SYSTEM_PROMPTS.OPTIMIZATION,
    },
    ...context,
    {
      role: 'user',
      content: `Please analyze and provide optimization suggestions for this content:\n\n${content}`,
    },
  ];

  logger.info('Analyzing content with Grok');

  const response = await callGrokAPI(messages);

  return {
    ...response,
    content: response.content,
    tokens_used: response.tokens_used,
  };
}
