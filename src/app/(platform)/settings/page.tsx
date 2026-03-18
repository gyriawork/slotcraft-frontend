"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "team">("profile");

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg)" }}>
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Settings</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text3)" }}>Manage your account and team</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1" style={{ borderBottom: "1px solid var(--border)" }}>
        {([
          ["profile", "Profile"],
          ["notifications", "Notifications"],
          ["team", "Team"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderBottom: activeTab === key ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === key ? "var(--accent)" : "var(--text4)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Account Information</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium" style={{ color: "var(--text4)" }}>Display Name</label>
                <input
                  type="text"
                  defaultValue="Game Designer"
                  className="mt-1 w-full max-w-md rounded-md px-3 py-2 text-sm"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium" style={{ color: "var(--text4)" }}>Email</label>
                <input
                  type="email"
                  defaultValue="designer@studio.com"
                  className="mt-1 w-full max-w-md rounded-md px-3 py-2 text-sm"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium" style={{ color: "var(--text4)" }}>Studio Name</label>
                <input
                  type="text"
                  defaultValue=""
                  placeholder="e.g., Thunderstrike Games"
                  className="mt-1 w-full max-w-md rounded-md px-3 py-2 text-sm"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
            </div>
            <button className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: "var(--accent)" }}>
              Save Changes
            </button>
          </div>

          <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>AI Configuration</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--text4)" }}>
              Configure AI-powered concept generation in Step 4
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium" style={{ color: "var(--text4)" }}>Anthropic API Key</label>
              <input
                type="password"
                defaultValue=""
                placeholder="sk-ant-..."
                className="mt-1 w-full max-w-md rounded-md px-3 py-2 text-sm font-mono"
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
              <p className="mt-1 text-xs" style={{ color: "var(--text4)" }}>
                Without an API key, AI features use deterministic fallback concepts.
              </p>
            </div>
          </div>

          <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Default Preferences</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: "var(--text2)" }}>Default Game Type</p>
                  <p className="text-xs" style={{ color: "var(--text4)" }}>Pre-select when creating new games</p>
                </div>
                <select className="rounded-md px-3 py-1.5 text-sm" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                  <option value="slot">Slot</option>
                  <option value="crash">Crash</option>
                  <option value="table">Table</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: "var(--text2)" }}>Default Target RTP</p>
                  <p className="text-xs" style={{ color: "var(--text4)" }}>Starting RTP for new projects</p>
                </div>
                <select className="rounded-md px-3 py-1.5 text-sm" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                  <option value="96">96.0%</option>
                  <option value="95">95.0%</option>
                  <option value="94">94.0%</option>
                  <option value="97">97.0%</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Notification Preferences</h3>
            <div className="mt-4 space-y-4">
              {[
                { label: "Simulation completed", desc: "Notify when a Monte Carlo simulation finishes" },
                { label: "AI review ready", desc: "Notify when AI analysis completes on a step" },
                { label: "Team activity", desc: "Notify when a team member edits a shared project" },
                { label: "Export ready", desc: "Notify when a GDD export is ready for download" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: "var(--text2)" }}>{item.label}</p>
                    <p className="text-xs" style={{ color: "var(--text4)" }}>{item.desc}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-purple-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Team Members</h3>
              <button className="rounded-md px-3 py-1.5 text-xs font-medium text-white" style={{ background: "var(--accent)" }}>
                Invite Member
              </button>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium" style={{ background: "rgba(124,107,245,0.15)", color: "var(--accent)" }}>
                    GD
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Game Designer</p>
                    <p className="text-xs" style={{ color: "var(--text4)" }}>designer@studio.com</p>
                  </div>
                </div>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "rgba(124,107,245,0.15)", color: "var(--accent)" }}>
                  Owner
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
