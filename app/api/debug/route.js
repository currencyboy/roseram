import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG, SYSTEM_PROMPTS } from "@/lib/constants";
import { logger, ExternalServiceError, ValidationError } from "@/lib/errors";

const X_API_KEY = process.env.X_API_KEY;

async function callGrokApi(messages) {
  const response = await fetch(API_CONFIG.GROK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${X_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: API_CONFIG.GROK_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: API_CONFIG.GROK_MAX_TOKENS,
    }),
    signal: AbortSignal.timeout(API_CONFIG.REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    throw new ExternalServiceError(
      'X.AI (Grok)',
      `API returned ${response.status}`
    );
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

function parseDebugResponse(response) {
  const suggestionMatch = response.match(/Suggestion:\s*([\s\S]*?)(?=Fixes:|Explanation:|$)/i);
  const fixesMatch = response.match(/Fixes?:?\s*([\s\S]*?)(?=Explanation:|$)/i);
  const explanationMatch = response.match(/Explanation:\s*([\s\S]*?)$/i);

  return {
    suggestion: suggestionMatch ? suggestionMatch[1].trim() : "Unable to extract suggestion",
    fixes: fixesMatch
      ? fixesMatch[1]
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[-*•]\s*/, '').trim())
          .filter(line => line.length > 0)
      : [],
    explanation: explanationMatch ? explanationMatch[1].trim() : "Unable to extract explanation",
  };
}

export async function POST(request) {
  if (!X_API_KEY) {
    logger.error("X_API_KEY not configured");
    return NextResponse.json(
      { success: false, error: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { error, code, context } = body;

    if (!error || error.trim().length === 0) {
      throw new ValidationError("Error message is required");
    }

    const codeContext = `HTML:\n${code?.html || ''}\n\nCSS:\n${code?.css || ''}\n\nJavaScript:\n${code?.javascript || ''}`;

    const userPrompt = `Error encountered: ${error}

${context ? `Context:\n${context}\n` : ''}

Code that caused the error:
${codeContext}

Please analyze the error and provide fixes.`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPTS.ERROR_DEBUGGING },
      { role: "user", content: userPrompt },
    ];

    logger.info("Starting error debugging", { errorLength: error.length });

    const aiResponse = await callGrokApi(messages);
    const parsedResponse = parseDebugResponse(aiResponse);

    logger.info("Error debugging completed");

    return NextResponse.json({
      success: true,
      ...parsedResponse,
      rawResponse: aiResponse,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    if (error instanceof ExternalServiceError) {
      logger.error("Grok API error", error);
      return NextResponse.json(
        { success: false, error: "Failed to analyze error" },
        { status: 503 }
      );
    }

    logger.error("Error in debug endpoint", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
