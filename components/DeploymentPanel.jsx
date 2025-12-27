"use client";

import { useState } from "react";

export function DeploymentPanel({
  html,
  css,
  javascript,
  onDeploy,
}) {
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [netlifyToken, setNetlifyToken] = useState("");
  const [netlifySiteId, setNetlifySiteId] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState(null);

  const handleGithubPush = async () => {
    if (!githubUrl || !githubToken) {
      alert("Please enter GitHub URL and token");
      return;
    }

    setDeploying(true);
    setDeployStatus("Pushing to GitHub...");

    try {
      const response = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          token,
          fileName: "index.html",
          fileContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>${html}<script>${javascript}</script></body>
</html>`,
          message: "Generated with Roseram Builder",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDeployStatus(
          `✓ Pushed! Commit: ${data.commit?.substring(0, 7)}`
        );
      } else {
        setDeployStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setDeployStatus("Failed to push to GitHub");
    } finally {
      setDeploying(false);
    }
  };

  const handleNetlifyDeploy = async () => {
    if (!netlifyToken || !netlifySiteId) {
      alert("Please enter Netlify token and site ID");
      return;
    }

    setDeploying(true);
    setDeployStatus("Deploying to Netlify...");

    try {
      const response = await fetch("/api/netlify/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          token,
          html,
          css,
          javascript,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDeployStatus(`✓ Deployed! URL: ${data.url}`);
      } else {
        setDeployStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setDeployStatus("Failed to deploy to Netlify");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg">
      <h3 className="font-semibold text-lg">Deploy Your Code</h3>

      <div className="space-y-3 border-b pb-4">
        <h4 className="font-medium text-sm text-gray-700">GitHub Integration</h4>
        <input
          type="text"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/username/repo"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          disabled={deploying}
        />
        <input
          type="password"
          value={githubToken}
          onChange={(e) => setGithubToken(e.target.value)}
          placeholder="GitHub Personal Access Token"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          disabled={deploying}
        />
        <button
          onClick={handleGithubPush}
          disabled={deploying}
          className="w-full px-3 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-900 disabled:opacity-50"
        >
          Push to GitHub
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-sm text-gray-700">Netlify Integration</h4>
        <input
          type="text"
          value={netlifySiteId}
          onChange={(e) => setNetlifySiteId(e.target.value)}
          placeholder="Netlify Site ID"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          disabled={deploying}
        />
        <input
          type="password"
          value={netlifyToken}
          onChange={(e) => setNetlifyToken(e.target.value)}
          placeholder="Netlify Access Token"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          disabled={deploying}
        />
        <button
          onClick={handleNetlifyDeploy}
          disabled={deploying}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Deploy to Netlify
        </button>
      </div>

      {deployStatus && (
        <div
          className={`p-3 rounded text-sm ${
            deployStatus.startsWith("✓")
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {deployStatus}
        </div>
      )}
    </div>
  );
}
