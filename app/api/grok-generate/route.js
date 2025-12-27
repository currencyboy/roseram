import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG } from "@/lib/constants";

export async function POST(request) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_X_API_KEY || process.env.X_API_KEY;
    if (!apiKey) {
      console.error("Grok API key not configured");
      return NextResponse.json(
        { error: "Grok API key not configured", details: "Set X_API_KEY environment variable" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { prompt, context } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let systemMessage = "You are an expert code generator. Generate clean, well-structured code that follows best practices. Only return the code without explanations or markdown formatting.";
    
    if (context?.language) {
      systemMessage += ` The code should be in ${context.language}.`;
    }
    
    if (context?.filePath) {
      systemMessage += ` This is for file: ${context.filePath}.`;
    }
    
    if (context?.existingCode) {
      systemMessage += ` Here is the existing code to build upon:\n\n${context.existingCode}`;
    }

    const messages = [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: API_CONFIG.GROK_MODEL || "grok-4",
        messages,
        temperature: 0.3,
        max_tokens: API_CONFIG.GROK_MAX_TOKENS || 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Grok] API Error:", response.status, errorData);
      return NextResponse.json(
        { error: "Grok API error", details: errorData.error?.message || `Status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const generatedCode = data.choices[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      code: generatedCode,
      tokens_used: data.usage?.total_tokens || 1,
    });
  } catch (error) {
    console.error("[Grok] Request error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Code generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
