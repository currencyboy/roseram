import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG, SYSTEM_PROMPTS } from "@/lib/constants";
import { logger, ExternalServiceError, ValidationError } from "@/lib/errors";
import { checkBalanceFromRequest } from "@/lib/api-balance-middleware";

const X_API_KEY = process.env.X_API_KEY;

async function extractHTML(text) {
  const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
  const html = htmlMatch ? htmlMatch[1].trim() : `<div style="padding: 20px; font-family: system-ui;"><h2>Generated Content</h2><p>${text.substring(0, 200)}</p></div>`;
  
  const explanation = text.split('\n')[0] || "Code generated successfully";
  
  return { html, explanation };
}

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
      temperature: 0.7,
      max_tokens: API_CONFIG.GROK_MAX_TOKENS,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ExternalServiceError(
      'X.AI (Grok)',
      `API returned ${response.status}`,
      { details: error }
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

  // Check user balance before processing
  const balanceCheck = await checkBalanceFromRequest(request);
  if (!balanceCheck.allowed) {
    return NextResponse.json(balanceCheck.error, { status: balanceCheck.status });
  }

  try {
    const body = await request.json();
    const { prompt, context = "" } = body;

    if (!prompt || prompt.trim().length === 0) {
      throw new ValidationError("Prompt cannot be empty");
    }

    const systemPrompt = `You are an expert web developer. Generate clean, modern HTML code based on user requests.
Always wrap HTML in triple backticks with 'html' language tag.
Include inline CSS in <style> tags.
Keep code simple and functional.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${context}\n\nCreate: ${prompt}` },
    ];

    logger.info("Generating code with Grok API");

    const aiResponse = await callGrokApi(messages);
    const { html, explanation } = await extractHTML(aiResponse);

    return NextResponse.json({
      success: true,
      html,
      explanation,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    if (error instanceof ExternalServiceError) {
      logger.error("Grok API error", error);
      return NextResponse.json(
        { success: false, error: "Failed to generate code" },
        { status: 500 }
      );
    }

    logger.error("Generation error", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate code" },
      { status: 500 }
    );
  }
}
