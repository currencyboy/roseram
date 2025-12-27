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
      temperature: 0.6,
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

export async function POST(request) {
  if (!X_API_KEY) {
    logger.error("X_API_KEY not configured");
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || prompt.trim().length === 0) {
      throw new ValidationError("Prompt is required");
    }

    if (prompt.length > 5000) {
      throw new ValidationError("Prompt is too long");
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPTS.PROMPT_ENHANCEMENT },
      {
        role: "user",
        content: `Original prompt: "${prompt}"\n\nProvide an enhanced version that includes more technical details, best practices, and specific requirements.`,
      },
    ];

    logger.info("Enhancing prompt", { originalLength: prompt.length });

    const enhancedPromptText = await callGrokApi(messages);

    const cleanedPrompt = enhancedPromptText
      .replace(/^Enhanced prompt:\s*/i, '')
      .replace(/^Here's an enhanced version:\s*/i, '')
      .trim();

    logger.info("Prompt enhancement completed", { enhancedLength: cleanedPrompt.length });

    return NextResponse.json({
      success: true,
      original_prompt: prompt,
      enhanced_prompt: cleanedPrompt,
      tokens_estimated: cleanedPrompt.length / 4,
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
        { success: false, error: "Failed to enhance prompt" },
        { status: 503 }
      );
    }

    logger.error("Error in prompt enhancement", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
