import { NextRequest, NextResponse } from "next/server";
import { logger, AuthenticationError } from "@/lib/errors";
import { supabaseServer } from "@/lib/supabase";
import { UserMetrics } from "@/lib/types";

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError("Missing authorization token");
  }

  const token = authHeader.slice(7);
  const response = await supabaseServer?.auth.getUser(token);

  if (!response) {
    throw new AuthenticationError("Invalid token");
  }

  const { data, error } = response;

  if (error || !data?.user) {
    throw new AuthenticationError("Invalid token");
  }

  return data.user;
}

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);

    logger.info("Fetching metrics for user", { userId: user.id });

    if (!supabaseServer) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Count projects
    const { count: projectCount } = await supabaseServer
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get project IDs for user
    const { data: projectIds } = await supabaseServer
      .from('projects')
      .select('id')
      .eq('user_id', user.id);

    const projectIdList = projectIds?.map(p => p.id) || [];

    // Count chat messages (approximates generations)
    let generationCount = 0;
    if (projectIdList.length > 0) {
      const { count } = await supabaseServer
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIdList);
      generationCount = count || 0;
    }

    // Count deployments
    let deploymentCount = 0;
    if (projectIdList.length > 0) {
      const { count } = await supabaseServer
        .from('deployments')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIdList);
      deploymentCount = count || 0;
    }

    // Sum tokens used
    let totalTokens = 0;
    if (projectIdList.length > 0) {
      const { data: tokenData } = await supabaseServer
        .from('chat_messages')
        .select('tokens_used')
        .in('project_id', projectIdList);
      totalTokens = tokenData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;
    }

    const metrics= {
      total_projects: projectCount || 0,
      total_generations,
      total_deployments,
      api_tokens_used,
      last_active: new Date().toISOString(),
    };

    return NextResponse.json({
      success,
      data,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    logger.error("Error fetching metrics", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
