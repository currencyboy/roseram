"use client";

import { useState, useEffect } from "react";
import { Project } from "@/lib/types";

export function ProjectManager({ onProjectSelect, session }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (session?.access_token) {
      fetchProjects();
    }
  }, [session]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch projects");

      const data = await response.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description,
          generated_code: {
            html: "",
            css: "",
            javascript: "",
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to create project");

      const data = await response.json();
      setProjects([data.data, ...projects]);
      setNewProject({ name: "", description: "" });
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete project");

      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading projects...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Projects</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-2 bg-black text-white text-sm rounded hover:bg-gray-800"
        >
          {showCreateForm ? "Cancel" : "New Project"}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateProject} className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Project name"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              rows={3}
            />
            <button
              type="submit"
              className="w-full px-3 py-2 bg-black text-white text-sm rounded hover:bg-gray-800"
            >
              Create Project
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-800 rounded text-sm">{error}</div>
      )}

      <div className="space-y-2">
        {projects.length === 0 ? (
          <p className="text-gray-600 text-sm">No projects yet. Create one to get started.</p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center"
              onClick={() => onProjectSelect(project)}
            >
              <div>
                <h4 className="font-medium">{project.name}</h4>
                <p className="text-sm text-gray-600">{project.description}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project.id);
                }}
                className="px-2 py-1 text-red-600 hover:bg-red-50 text-sm rounded"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
