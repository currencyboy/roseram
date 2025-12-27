import { NextResponse } from 'next/server';
import { getGrokClient } from '@/lib/grok-streaming';
import { semanticSearch } from '@/lib/semantic-file-search';
import { codeAnalyzer } from '@/lib/code-analyzer';
import { logger } from '@/lib/errors';

/**
 * POST /api/builder/smart-generate
 * 
 * Smart code generation endpoint that:
 * 1. Analyzes user request with semantic understanding
 * 2. Finds relevant files using semantic search
 * 3. Uses Grok to understand what changes are needed
 * 4. Applies changes intelligently
 * 5. Streams response for real-time feedback
 * 
 * Request body:
 * {
 *   "userPrompt": "Change title from Now Playing to Coming Soon",
 *   "fileList": ["path/to/file1.jsx", "path/to/file2.jsx"],
 *   "fileContents": { "path/to/file1.jsx": "..." },
 *   "codebaseContext": "Summary of codebase structure",
 *   "conversationHistory": [] // Previous messages for context
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      userPrompt,
      fileList = [],
      fileContents = {},
      codebaseContext = '',
      conversationHistory = [],
    } = body;

    if (!userPrompt?.trim()) {
      return NextResponse.json(
        { error: 'User prompt is required' },
        { status: 400 }
      );
    }

    logger.info('[SmartGenerate] Starting smart code generation', {
      promptLength: userPrompt.length,
      fileCount: fileList.length,
    });

    // Initialize Grok client
    const grok = getGrokClient();

    // Step 1: Find semantically relevant files
    const relevantFiles = semanticSearch.findRelevantFiles(
      userPrompt,
      fileList,
      fileContents,
      5 // Get top 5 most relevant files
    );

    logger.info('[SmartGenerate] Found relevant files', { relevantFiles });

    // Step 2: Analyze the codebase context
    const fileAnalyses = relevantFiles.map(filePath => ({
      path: filePath,
      analysis: codeAnalyzer.analyzeFile(filePath, fileContents[filePath] || ''),
    }));

    // Step 3: Analyze what type of change is needed
    const changeTypes = codeAnalyzer.analyzeChangeType(userPrompt, codebaseContext);

    logger.info('[SmartGenerate] Detected change types', { changeTypes });

    // Step 4: Build intelligent context for Grok
    const detailedContext = `
## User Request
${userPrompt}

## Change Types Detected
${changeTypes.join(', ')}

## Relevant Files in Codebase
${relevantFiles.map(file => {
  const content = fileContents[file] || '';
  const analysis = fileAnalyses.find(a => a.path === file)?.analysis;
  
  return `
### ${file}
Type: ${analysis?.type}
Lines: ${analysis?.lines}
Functions: ${analysis?.functions?.map(f => f.name).join(', ') || 'None'}
Strings found: ${analysis?.strings?.slice(0, 3).map(s => `"${s.text}"`).join(', ') || 'None'}

Content preview:
\`\`\`
${content.slice(0, 300)}...
\`\`\`
`;
}).join('\n')}

## Codebase Structure
${codebaseContext}
`;

    // Step 5: Create messages for Grok with full context
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: detailedContext,
      },
    ];

    logger.info('[SmartGenerate] Starting Grok stream', {
      messageCount: messages.length,
      contextLength: detailedContext.length,
    });

    // Step 6: Stream the response
    let fullResponse = '';
    let tokenCount = 0;
    const chunks = [];

    const streamPromise = grok.streamCodeGeneration(messages, {
      temperature: 0.3, // Deterministic for coding
      maxTokens: 4000,
      topP: 0.95,
      onToken: (token) => {
        fullResponse += token;
        chunks.push(token);
      },
      onDone: (content) => {
        logger.info('[SmartGenerate] Stream completed', {
          contentLength: content.length,
          tokensEstimated: Math.ceil(content.length / 4),
        });
      },
    });

    // Wait for stream to complete
    fullResponse = await streamPromise;

    // Step 7: Parse the response for file changes
    let parsedResponse;
    try {
      // Try to extract JSON from response
      const jsonMatch = fullResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
                       fullResponse.match(/({[\s\S]*})/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : fullResponse;
      parsedResponse = JSON.parse(jsonString);
    } catch {
      // If parsing fails, structure the response
      parsedResponse = {
        response: fullResponse,
        type: 'text',
        explanation: 'Generated response from Grok',
      };
    }

    // Step 8: Validate file operations
    if (parsedResponse.files && Array.isArray(parsedResponse.files)) {
      parsedResponse.files = parsedResponse.files.map(file => ({
        ...file,
        isValid: file.path && file.content && file.operation,
        contentLength: file.content?.length || 0,
      }));
    }

    // Step 9: Return structured response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      detection: {
        changeTypes,
        relevantFiles,
        fileCount: relevantFiles.length,
      },
      generation: parsedResponse,
      metadata: {
        grokModel: 'grok-4',
        stream: true,
        tokensUsed: Math.ceil(fullResponse.length / 4),
      },
    });

  } catch (error) {
    logger.error('[SmartGenerate] Error', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate code',
        details: error instanceof Error ? error.stack : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/builder/smart-generate
 * Health check and configuration
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'smart-code-generator',
    model: 'grok-4',
    features: [
      'streaming-generation',
      'semantic-file-search',
      'code-analysis',
      'real-time-inference',
    ],
    configured: !!process.env.X_API_KEY,
  });
}
