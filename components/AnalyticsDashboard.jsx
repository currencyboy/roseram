"use client";

import { useEffect, useState } from "react";
import { UserMetrics } from "@/lib/types";

export function AnalyticsDashboard({ session }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session?.access_token) {
      fetchMetrics();
      // Refresh metrics every 5 minutes
      const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/metrics", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch metrics");

      const data = await response.json();
      setMetrics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !metrics) {
    return <div className="p-4 text-center text-gray-600">Loading analytics...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-800 rounded">{error}</div>;
  }

  if (!metrics) {
    return null;
  }

  const stats = [
    {
      label: "Total Projects",
      value: metrics.total_projects,
      color: "bg-blue-100 text-blue-800",
    },
    {
      label: "Code Generations",
      value: metrics.total_generations,
      color: "bg-green-100 text-green-800",
    },
    {
      label: "Deployments",
      value: metrics.total_deployments,
      color: "bg-purple-100 text-purple-800",
    },
    {
      label: "API Tokens Used",
      value: metrics.api_tokens_used,
      color: "bg-orange-100 text-orange-800",
    },
  ];

  const lastActive = new Date(metrics.last_active);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - lastActive.getTime()) / 60000);
  let timeAgo = "just now";

  if (diffMinutes > 1) timeAgo = `${diffMinutes} minutes ago`;
  if (diffMinutes > 60) timeAgo = `${Math.floor(diffMinutes / 60)} hours ago`;
  if (diffMinutes > 1440) timeAgo = `${Math.floor(diffMinutes / 1440)} days ago`;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Analytics</h3>
        <button
          onClick={fetchMetrics}
          className="text-sm px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`p-4 rounded ${stat.color}`}
          >
            <p className="text-sm font-medium opacity-75">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Activity Info */}
      <div className="p-4 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-700">
          Last active <span className="font-medium">{timeAgo}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {lastActive.toLocaleString()}
        </p>
      </div>

      {/* Usage Info */}
      <div className="p-4 bg-blue-50 rounded border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Usage Insights</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Average generations per project:{" "}
            {metrics.total_projects > 0
              ? (metrics.total_generations / metrics.total_projects).toFixed(1)
              : "0"}
          </li>
          <li>
            • Deployment success rate:{" "}
            {metrics.total_generations > 0
              ? Math.round(
                  (metrics.total_deployments / metrics.total_generations) * 100
                )
              : 0}
            %
          </li>
          <li>
            • Estimated API cost: ${(metrics.api_tokens_used * 0.0001).toFixed(2)}
          </li>
        </ul>
      </div>
    </div>
  );
}
