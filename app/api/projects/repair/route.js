import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { logger, ValidationError, AuthenticationError } from "@/lib/errors";

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

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      throw new ValidationError("Project ID is required");
    }

    logger.info("Repairing project for user", { userId: user.id, projectId });

    // Fetch the existing project
    const { data: existingProject, error: fetchError } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingProject) {
      throw new ValidationError('Project not found');
    }

    // Update project status if needed
    const { data: updatedProject, error: updateError } = await supabaseServer
      .from('projects')
      .update({
        status: 'active',
        settings: {
          ...existingProject.settings,
          repaired_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select('id, user_id, name, description, status, repository_url, repository_owner, repository_name, working_branch, created_at, updated_at')
      .single();

    if (updateError) {
      logger.error("Failed to repair project", { error: updateError });
      throw updateError;
    }

    logger.info("Project repaired successfully", {
      projectId: updatedProject.id,
      projectName: updatedProject.name,
      userId: user.id
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Project repaired and ready for deployment',
        project: {
          id: updatedProject.id,
          name: updatedProject.name,
          description: updatedProject.description,
          repository_url: updatedProject.repository_url,
          repository_owner: updatedProject.repository_owner,
          repository_name: updatedProject.repository_name,
          working_branch: updatedProject.working_branch,
          status: updatedProject.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    logger.error("Error repairing project", error);
    return NextResponse.json(
      { success: false, error: "Failed to repair project. Please try again." },
      { status: 500 }
    );
  }
}
