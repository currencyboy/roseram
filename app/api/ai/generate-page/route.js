import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { generateCode, generatePageLayout } from '@/lib/grok-ai';
import { logger, ValidationError, ExternalServiceError } from '@/lib/errors';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    let user = null;

    if (supabaseServer) {
      const { data: { user: currentUser } } = await supabaseServer.auth.getUser();
      user = currentUser;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      siteId,
      prompt,
      pageType = 'custom',
      generateLayout = false,
      conversationHistory = [],
    } = body;

    if (!prompt) {
      throw new ValidationError('Prompt is required');
    }

    if (prompt.length > 10000) {
      throw new ValidationError('Prompt is too long (max 10000 characters)');
    }

    logger.info('Generating page with Grok', {
      siteId,
      userId: user.id,
      pageType,
      promptLength: prompt.length,
    });

    const contextMessages = conversationHistory.map((msg) => ({
      role: msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' ? msg.role : 'user',
      content: msg.content,
    }));

    let generatedContent;

    if (generateLayout) {
      const layoutPrompt = `Create a ${pageType} page layout for: ${prompt}`;
      generatedContent = await generatePageLayout(layoutPrompt, contextMessages);
    } else {
      const codePrompt = `Create a responsive ${pageType} page with this requirement: ${prompt}`;
      generatedContent = await generateCode(codePrompt, contextMessages);
    }

    return NextResponse.json({
      success: true,
      content: generatedContent.html || generatedContent.content || generatedContent,
      pageType,
      tokens_used: generatedContent.tokens_used || 0,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof ExternalServiceError) {
      logger.error('External service error', error);
      return NextResponse.json(
        { success: false, error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Unexpected error in page generation', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate page content' },
      { status: 500 }
    );
  }
}
