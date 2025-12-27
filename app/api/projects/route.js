import { NextRequest, NextResponse } from "next/server";
import { projects } from "@/lib/db";
import { logger, ValidationError, AuthenticationError } from "@/lib/errors";
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

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    // Fetch single project by ID
    if (projectId) {
      logger.info("Fetching single project", { userId: user.id, projectId });

      const { data: project, error } = await supabaseServer
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (error || !project) {
        throw new ValidationError('Project not found');
      }

      return NextResponse.json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          repository_url: project.repository_url,
          working_branch: project.working_branch,
          status: project.status,
        },
      });
    }

    // List projects
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    logger.info("Fetching projects for user", { userId: user.id });

    const userProjects = await projects.listByUser(user.id, limit, offset);

    return NextResponse.json({
      success: true,
      data: userProjects,
      count: userProjects.length,
    });
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

    logger.error("Error fetching projects", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    const body = await request.json();
    const { name, description, repository_url, working_branch, netlify_url } = body;

    if (!name || name.trim().length < 3) {
      throw new ValidationError("Project name must be at least 3 characters");
    }

    if (name.length > 100) {
      throw new ValidationError("Project name is too long");
    }

    logger.info("Creating project for user", { userId: user.id, projectName: name });

    // Parse repository URL to extract owner and name
    let repositoryOwner = null;
    let repositoryName = null;
    if (repository_url) {
      const urlPattern = /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i;
      const match = repository_url.match(urlPattern);
      if (match) {
        repositoryOwner = match[1];
        repositoryName = match[2];
      }
    }

    const newProject = await projects.create(user.id, {
      name: name.trim(),
      description: description?.trim() || '',
      status: 'active',
      repository_url: repository_url || null,
      repository_owner: repositoryOwner,
      repository_name: repositoryName,
      working_branch: working_branch || 'main',
      settings: netlify_url ? { netlify_url } : {},
    });

    return NextResponse.json(
      {
        success: true,
        data: newProject,
      },
      { status: 201 }
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

    logger.error("Error creating project", error);
    return NextResponse.json(
      { success: false, error: "Failed to create project" },
      { status: 500 }
    );
  }
}
