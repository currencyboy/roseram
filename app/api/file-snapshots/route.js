import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { logger } from "@/lib/errors";

export async function POST(request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { action, projectId, filePath, content, language, commitMessage, changes } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      );
    }

    if (action === "save-snapshot") {
      if (!filePath || !content) {
        return NextResponse.json(
          { error: "Missing filePath or content" },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseServer
        .from("file_snapshots")
        .insert({
          project_id: projectId,
          file_path: filePath,
          content,
          language: language || "plaintext",
          commit_message: commitMessage || null,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        logger.error("Snapshot save error:", error);
        return NextResponse.json(
          { error: "Failed to save snapshot", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        snapshot: data?.[0],
      });
    }

    if (action === "save-changes") {
      if (!changes || !Array.isArray(changes)) {
        return NextResponse.json(
          { error: "Missing or invalid changes array" },
          { status: 400 }
        );
      }

      const snapshots = changes.map((change) => ({
        project_id: projectId,
        file_path: change.filePath,
        original_content: change.originalContent,
        modified_content: change.modifiedContent,
        commit_message: commitMessage || null,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabaseServer
        .from("file_snapshots")
        .insert(snapshots)
        .select();

      if (error) {
        logger.error("Batch snapshot save error:", error);
        return NextResponse.json(
          { error: "Failed to save changes", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        count: data?.length || 0,
        snapshots: data || [],
      });
    }

    if (action === "get-history") {
      if (!filePath) {
        return NextResponse.json(
          { error: "Missing filePath" },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseServer
        .from("file_snapshots")
        .select("*")
        .eq("project_id", projectId)
        .eq("file_path", filePath)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        logger.error("History fetch error:", error);
        return NextResponse.json(
          { error: "Failed to fetch history", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        history: data || [],
      });
    }

    if (action === "revert") {
      const { snapshotId } = body;
      if (!snapshotId) {
        return NextResponse.json(
          { error: "Missing snapshotId" },
          { status: 400 }
        );
      }

      const { data: snapshot, error: fetchError } = await supabaseServer
        .from("file_snapshots")
        .select("content, file_path")
        .eq("id", snapshotId)
        .single();

      if (fetchError || !snapshot) {
        return NextResponse.json(
          { error: "Snapshot not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        snapshot: {
          path: snapshot.file_path,
          content: snapshot.content,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("File snapshot API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "File snapshot operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
