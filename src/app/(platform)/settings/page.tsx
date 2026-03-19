"use client";

import { useCallback, useEffect, useState } from "react";

interface Settings {
  displayName: string;
  email: string;
  studioName: string;
  teamName: string;
  apiKey: string;
  defaultGameType: string;
  defaultRtp: string;
  notifications: {
    simulation: boolean;
    aiReview: boolean;
    teamActivity: boolean;
    exportReady: boolean;
  };
}

const STORAGE_KEY = "slotcraft_settings";

function loadSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings();
}

function defaultSettings(): Settings {
  return {
    displayName: "Game Designer",
    email: "designer@studio.com",
    studioName: "",
    teamName: "",
    apiKey: "",
    defaultGameType: "slot",
    defaultRtp: "96",
    notifications: {
      simulation: true,
      aiReview: true,
      teamActivity: true,
      exportReady: true,
    },
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "team">("profile");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string; role: string }>>([]);

  useEffect(() => {
    setSettings(loadSettings());
    try {
      const raw = localStorage.getItem("slotcraft_team");
      if (raw) setTeamMembers(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const updateField = useCallback((key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleNotification = useCallback((key: keyof Settings["notifications"]) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));
  }, []);

  const handleInvite = useCallback(() => {
    if (!inviteEmail.trim()) return;
    const member = { name: inviteEmail.split("@")[0], email: inviteEmail.trim(), role: "Member" };
    const updated = [...teamMembers, member];
    setTeamMembers(updated);
    localStorage.setItem("slotcraft_team", JSON.stringify(updated));
    setInviteEmail("");
    setShowInvite(false);
  }, [inviteEmail, teamMembers]);

  const handleRemoveMember = useCallback((email: string) => {
    const updated = teamMembers.filter((m) => m.email !== email);
    setTeamMembers(updated);
    localStorage.setItem("slotcraft_team", JSON.stringify(updated));
  }, [teamMembers]);

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
                  value={settings.displayName}
                  onChange={(e) => updateField("displayName", e.target.value)}
                  className="mt-1 w-full max-w-md rounded-md px-3 py-2 text-sm"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium" style={{ color: "var(--text4)" }}>Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="mt-1 w-full max-w-md rounded-md px-3 py-2 text-sm"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium" style={{ color: "var(--text4)" }}>Studio Name</label>
                <input
                  type="text"
                  value={settings.studioName}
                  onChange={(e) => updateField("studioName", e.target.value)}
                  placeholder="e.g., Thunderstrike Games"
                  className="mt-1 w-full max-w-md rounded-md px-3 py-2 text-sm"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium" style={{ color: "var(--text4)" }}>Team Name</label>
                <input
                  type="text"
                  value={settings.teamName}
                  onChange={(e) => updateField("teamName", e.target.value)}
                  placeholder="e.g., Alpha"
                  className="mt-1 w-full max-w-md rounded-md px-3 py-2 text-sm"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
                <p className="mt-1 text-xs" style={{ color: "var(--text4)" }}>
                  Used as Team in Projects and Game Library entries you create.
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ background: saved ? "var(--green)" : "var(--accent)" }}
            >
              {saved ? "Saved!" : "Save Changes"}
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
                value={settings.apiKey}
                onChange={(e) => updateField("apiKey", e.target.value)}
                placeholder="sk-ant-..."
                className="mt-1 w-full max-w-md rounded-md px-3 py-2 text-sm font-mono"
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
              <p className="mt-1 text-xs" style={{ color: "var(--text4)" }}>
                Without an API key, AI features use deterministic fallback concepts.
              </p>
            </div>
            <button
              onClick={handleSave}
              className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ background: saved ? "var(--green)" : "var(--accent)" }}
            >
              {saved ? "Saved!" : "Save Changes"}
            </button>
          </div>

        </div>
      )}

      {/* Notifications tab */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Notification Preferences</h3>
            <div className="mt-4 space-y-4">
              {([
                { key: "simulation" as const, label: "Simulation completed", desc: "Notify when a Monte Carlo simulation finishes" },
                { key: "aiReview" as const, label: "AI review ready", desc: "Notify when AI analysis completes on a step" },
                { key: "teamActivity" as const, label: "Team activity", desc: "Notify when a team member edits a shared project" },
                { key: "exportReady" as const, label: "Export ready", desc: "Notify when a GDD export is ready for download" },
              ]).map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: "var(--text2)" }}>{item.label}</p>
                    <p className="text-xs" style={{ color: "var(--text4)" }}>{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications[item.key]}
                    onChange={() => toggleNotification(item.key)}
                    className="h-4 w-4 rounded accent-purple-500"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSave}
              className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ background: saved ? "var(--green)" : "var(--accent)" }}
            >
              {saved ? "Saved!" : "Save Preferences"}
            </button>
          </div>
        </div>
      )}

      {/* Team tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Team Members</h3>
              <button
                onClick={() => setShowInvite(true)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                style={{ background: "var(--accent)" }}
              >
                Invite Member
              </button>
            </div>

            {showInvite && (
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  placeholder="email@example.com"
                  className="flex-1 rounded-md px-3 py-1.5 text-sm"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                  autoFocus
                />
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  style={{ background: "var(--accent)" }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowInvite(false); setInviteEmail(""); }}
                  className="rounded-md px-3 py-1.5 text-xs"
                  style={{ color: "var(--text3)" }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {/* Owner */}
              <div className="flex items-center justify-between rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium" style={{ background: "rgba(124,107,245,0.15)", color: "var(--accent)" }}>
                    {settings.displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{settings.displayName}</p>
                    <p className="text-xs" style={{ color: "var(--text4)" }}>{settings.email}</p>
                  </div>
                </div>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "rgba(124,107,245,0.15)", color: "var(--accent)" }}>
                  Owner
                </span>
              </div>

              {/* Team members */}
              {teamMembers.map((member) => (
                <div key={member.email} className="flex items-center justify-between rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium" style={{ background: "rgba(61,214,140,0.15)", color: "var(--green)" }}>
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{member.name}</p>
                      <p className="text-xs" style={{ color: "var(--text4)" }}>{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "rgba(61,214,140,0.15)", color: "var(--green)" }}>
                      {member.role}
                    </span>
                    <button
                      onClick={() => handleRemoveMember(member.email)}
                      className="text-xs transition-colors hover:opacity-80"
                      style={{ color: "var(--red)" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
