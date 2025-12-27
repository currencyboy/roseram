"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const ProjectCtx = createContext(null);

export function ProjectProvider({ children }) {
  const [projectId, setProjectId] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState(null);

  const createProject = useCallback(async (name, description, token, metadata = {}) => {
    if (!name || !token) {
      setProjectError("Project name and authentication token are required");
      return null;
    }

    setIsCreatingProject(true);
    setProjectError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || "",
          status: "active",
          ...metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const data = await response.json();
      const newProjectId = data.data?.id;

      if (newProjectId) {
        setProjectId(newProjectId);
        setProjectData(data.data);
        console.log("[ProjectContext] Project created successfully:", newProjectId);
        return newProjectId;
      } else {
        throw new Error("No project ID returned from server");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setProjectError(errorMsg);
      console.error("[ProjectContext] Project creation failed:", errorMsg);
      return null;
    } finally {
      setIsCreatingProject(false);
    }
  }, []);

  const fetchProject = useCallback(async (id, token) => {
    if (!id || !token) {
      return null;
    }

    try {
      const response = await fetch(`/api/projects?id=${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch project");
      }

      const data = await response.json();
      setProjectData(data.project);
      // Also set projectId from fetched project to keep them in sync
      if (data.project?.id) {
        setProjectId(data.project.id);
      }
      return data.project;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[ProjectContext] Project fetch failed:", errorMsg);
      return null;
    }
  }, []);

  const resetProject = useCallback(() => {
    setProjectId(null);
    setProjectData(null);
    setProjectError(null);
    console.log("[ProjectContext] Project reset");
  }, []);

  const value = {
    projectId,
    projectData,
    isCreatingProject,
    projectError,
    createProject,
    fetchProject,
    resetProject,
    setProjectId,
  };

  return (
    <ProjectCtx.Provider value={value}>
      {children}
    </ProjectCtx.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectCtx);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
}
