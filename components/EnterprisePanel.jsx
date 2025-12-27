"use client";

import { useState } from "react";
import { MCPIntegrations } from "./MCPIntegrations";

export function EnterprisePanel() {
  const [activeTab, setActiveTab] = useState(
    "organization"
  );
  const [teams, setTeams] = useState([
    {
      id: "1",
      name: "admin@roseram.com",
      role: "Owner",
      joinedAt: new Date(),
    },
  ]);
  const [billingLogs, setBillingLogs] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [newTeamMember, setNewTeamMember] = useState(false);

  const handleInviteTeamMember = () => {
    if (inviteEmail.trim()) {
      setNewTeamMember(true);
      setInviteEmail("");
      setTimeout(() => setNewTeamMember(false), 2000);
    }
  };

  const totalTokensUsed = billingLogs.reduce((sum, log) => sum + log.tokensUsed, 0);
  const totalCost = billingLogs.reduce((sum, log) => sum + log.cost, 0);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {(
          ["organization", "billing", "integrations"]
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium text-sm transition ${
              activeTab === tab
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {tab === "organization" && "👥 Organization"}
            {tab === "billing" && "💳 Billing"}
            {tab === "integrations" && "🔌 Integrations"}
          </button>
        ))}
      </div>

      {/* Organization Tab */}
      {activeTab === "organization" && (
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Organization</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">Organization:</span>
                <span className="ml-2 font-medium">Roseram Enterprise</span>
              </div>
              <div>
                <span className="text-gray-400">Plan:</span>
                <span className="ml-2 font-medium text-blue-400">Enterprise</span>
              </div>
              <div>
                <span className="text-gray-400">Members:</span>
                <span className="ml-2 font-medium">{teams.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h4 className="font-bold mb-4">Team Members</h4>
            <div className="space-y-3 mb-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex justify-between items-center bg-gray-700 p-3 rounded"
                >
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-xs text-gray-400">{team.role}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    Joined {team.joinedAt.toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Invite team member..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleInviteTeamMember}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition"
              >
                Invite
              </button>
            </div>
            {newTeamMember && (
              <p className="text-xs text-green-400 mt-2">
                ✓ Invitation sent to {inviteEmail}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <p className="text-sm text-gray-300">Total Tokens Used</p>
              <p className="text-3xl font-bold text-blue-300">
                {totalTokensUsed.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-900 border border-green-700 rounded-lg p-4">
              <p className="text-sm text-gray-300">Total Cost</p>
              <p className="text-3xl font-bold text-green-300">
                ${totalCost.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h4 className="font-bold mb-4">Billing History</h4>
            {billingLogs.length === 0 ? (
              <p className="text-gray-400 text-sm">No billing history yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {billingLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm border-b border-gray-700 pb-2"
                  >
                    <span className="text-gray-300">{log.action}</span>
                    <div className="text-right">
                      <p className="text-gray-400">{log.tokensUsed} tokens</p>
                      <p className="text-xs text-gray-500">
                        {log.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && <MCPIntegrations />}
    </div>
  );
}
