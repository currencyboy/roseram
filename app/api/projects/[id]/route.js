import { NextRequest, NextResponse } from "next/server";
import { projects, chat, deployments } from "@/lib/db";
import { logger, AuthenticationError, NotFoundError } from "@/lib/errors";
import { supabaseServer } from "@/lib/supabase";

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

export async function GET(
  request,
  { params }
) {
  try {
    const user = await getUserFromRequest(request);
    const { id: projectId } = await params;

    logger.info("Fetching project", { projectId, userId: user.id });

    const project = await projects.getById(projectId, user.id);
    if (!project) {
      throw new NotFoundError("Project");
    }

    const messages = await chat.getHistory(projectId, 50);
    const deploymentRecords = await deployments.getByProject(projectId, 20);

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        chat_history: messages,
        deployments: deploymentRecords,
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    logger.error("Error fetching project", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request,
  { params }
) {
  try {
    const user = await getUserFromRequest(request);
    const { id: projectId } = await params;
    const body = await request.json();

    logger.info("Updating project", { projectId, userId: user.id });

    const updatedProject = await projects.update(projectId, user.id, {
      ...body,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: updatedProject,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    logger.error("Error updating project", error);
    return NextResponse.json(
      { success: false, error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request,
  { params }
) {
  try {
    const user = await getUserFromRequest(request);
    const { id: projectId } = await params;

    logger.info("Deleting project", { projectId, userId: user.id });

    await projects.delete(projectId, user.id);

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    logger.error("Error deleting project", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
