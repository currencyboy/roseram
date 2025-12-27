"use client";

import { useState, useEffect } from "react";

export function ProjectsPanel() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // In a real app, this would call an API endpoint
      // For now, we'll show a placeholder
      setProjects([
        {
          id: "1",
          name: "Sample Landing Page",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      // In a real app, this would call an API endpoint
      const project= {
        id: Date.now().toString(),
        name,
        created_at: new Date().toISOString(),
      };
      setProjects([...projects, project]);
      setNewProjectName("");
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded border border-gray-200 p-6">Loading projects...</div>;
  }

  return (
    <div className="bg-white rounded border border-gray-200 p-6">
      <h2 className="text-xl font-bold mb-6">Your Projects</h2>

      <form onSubmit={createProject} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="New project name"
          className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none"
          disabled={creating}
        />
        <button
          type="submit"
          disabled={creating || !newProjectName.trim()}
          className="px-4 py-2 bg-black text-white disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </form>

      {projects.length === 0 ? (
        <p className="text-gray-500 text-sm">No projects yet. Create one to get started!</p>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border border-gray-200 rounded p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div>
                <h3 className="font-medium text-gray-900">{project.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
              <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                Open
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
