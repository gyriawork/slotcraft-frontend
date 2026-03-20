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
  baseCurrency: string;
  notifications: {
    simulation: boolean;
    aiReview: boolean;
    teamActivity: boolean;
    exportReady: boolean;
  };
}

const STORAGE_KEY = "reelspec_settings";

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
    baseCurrency: "EUR",
    notifications: {
      simulation: true,
      aiReview: true,
      teamActivity: true,
      exportReady: true,
    },
  };
}

/* ── Custom Feature type ── */
interface CustomFeature {
  id: string;
  type: "wild" | "bonus" | "enhancer" | "gamble" | "custom";
  variant: string;
  label: string;
  description: string;
  complexity: number;
}

const FEATURES_STORAGE_KEY = "reelspec_features";

function loadCustomFeatures(): CustomFeature[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FEATURES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<"personal" | "app">("personal");
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "team" | "features" | "ai" | "brands" | "currency">("profile");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string; role: string }>>([]);
  const [customFeatures, setCustomFeatures] = useState<CustomFeature[]>([]);
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [newFeature, setNewFeature] = useState<Omit<CustomFeature, "id">>({ type: "custom", variant: "", label: "", description: "", complexity: 2 });
  const [brands, setBrands] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: "", description: "" });

  useEffect(() => {
    setSettings(loadSettings());
    setCustomFeatures(loadCustomFeatures());
    try {
      const raw = localStorage.getItem("reelspec_team");
      if (raw) setTeamMembers(JSON.parse(raw));
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem("reelspec_brands");
      if (raw) setBrands(JSON.parse(raw));
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
    localStorage.setItem("reelspec_team", JSON.stringify(updated));
    setInviteEmail("");
    setShowInvite(false);
  }, [inviteEmail, teamMembers]);

  const handleRemoveMember = useCallback((email: string) => {
    const updated = teamMembers.filter((m) => m.email !== email);
    setTeamMembers(updated);
    localStorage.setItem("reelspec_team", JSON.stringify(updated));
  }, [teamMembers]);

  const handleAddFeature = useCallback(() => {
    if (!newFeature.label.trim() || !newFeature.variant.trim()) return;
    const feature: CustomFeature = {
      ...newFeature,
      id: `custom-${Date.now()}`,
      variant: newFeature.variant.toLowerCase().replace(/\s+/g, "_"),
    };
    const updated = [...customFeatures, feature];
    setCustomFeatures(updated);
    localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(updated));
    setNewFeature({ type: "custom", variant: "", label: "", description: "", complexity: 2 });
    setShowAddFeature(false);
  }, [newFeature, customFeatures]);

  const handleRemoveFeature = useCallback((id: string) => {
    const updated = customFeatures.filter((f) => f.id !== id);
    setCustomFeatures(updated);
    localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(updated));
  }, [customFeatures]);

  const handleUpdateFeature = useCallback((id: string, field: keyof CustomFeature, value: string | number) => {
    const updated = customFeatures.map((f) => f.id === id ? { ...f, [field]: value } : f);
    setCustomFeatures(updated);
    localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(updated));
  }, [customFeatures]);

  const handleAddBrand = useCallback(() => {
    if (!newBrand.name.trim()) return;
    const brand = { id: `brand-${Date.now()}`, name: newBrand.name.trim(), description: newBrand.description.trim() };
    const updated = [...brands, brand];
    setBrands(updated);
    localStorage.setItem("reelspec_brands", JSON.stringify(updated));
    setNewBrand({ name: "", description: "" });
    setShowAddBrand(false);
  }, [newBrand, brands]);

  const handleRemoveBrand = useCallback((id: string) => {
    const updated = brands.filter((b) => b.id !== id);
    setBrands(updated);
    localStorage.setItem("reelspec_brands", JSON.stringify(updated));
  }, [brands]);

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg)" }}>
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Settings</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text3)" }}>Manage your account and team</p>
      </div>

      {/* Section switcher */}
      <div className="mb-4 flex gap-2">
        {([["personal", "Personal"], ["app", "App Settings"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setActiveSection(key);
              setActiveTab(key === "personal" ? "profile" : "features");
            }}
            className="rounded-lg px-4 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: activeSection === key ? "var(--accent-soft)" : "transparent",
              border: `1px solid ${activeSection === key ? "var(--accent-border)" : "var(--border)"}`,
              color: activeSection === key ? "var(--accent)" : "var(--text3)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabs within section */}
      <div className="mb-6 flex gap-1" style={{ borderBottom: "1px solid var(--border)" }}>
        {activeSection === "personal" && ([
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
        {activeSection === "app" && ([
          ["features", "Features"],
          ["brands", "Brands"],
          ["currency", "Currency"],
          ["ai", "AI Configuration"],
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

        </div>
      )}

      {/* Brands tab (App Settings) */}
      {activeTab === "brands" && (
        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Brands</h3>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text4)" }}>
                  Brands available when creating projects. Shown in Projects and Game Library tables.
                </p>
              </div>
              <button
                onClick={() => setShowAddBrand(true)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                style={{ background: "var(--accent)" }}
              >
                + Add Brand
              </button>
            </div>

            {showAddBrand && (
              <div className="mb-4 rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--accent-border)" }}>
                <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text)" }}>New Brand</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text4)" }}>Brand Name</label>
                    <input
                      value={newBrand.name}
                      onChange={(e) => setNewBrand((b) => ({ ...b, name: e.target.value }))}
                      placeholder="Brand name"
                      className="w-full max-w-md rounded-md px-3 py-1.5 text-sm"
                      style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text4)" }}>Description (optional)</label>
                    <input
                      value={newBrand.description}
                      onChange={(e) => setNewBrand((b) => ({ ...b, description: e.target.value }))}
                      placeholder="Short description (optional)"
                      className="w-full max-w-md rounded-md px-3 py-1.5 text-sm"
                      style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3 justify-end">
                  <button onClick={() => setShowAddBrand(false)} className="rounded-md px-3 py-1.5 text-xs" style={{ color: "var(--text3)" }}>Cancel</button>
                  <button
                    onClick={handleAddBrand}
                    disabled={!newBrand.name.trim()}
                    className="rounded-md px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    style={{ background: "var(--accent)" }}
                  >
                    Add Brand
                  </button>
                </div>
              </div>
            )}

            {brands.length === 0 && !showAddBrand && (
              <div className="text-center py-8" style={{ color: "var(--text4)" }}>
                <p className="text-sm">No brands yet</p>
                <p className="text-xs mt-1">Add brands here to select them when creating projects.</p>
              </div>
            )}

            {brands.length > 0 && (
              <div className="space-y-2">
                {brands.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg p-3 group" style={{ border: "1px solid var(--border)" }}>
                    <div>
                      <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{b.name}</span>
                      {b.description && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>{b.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveBrand(b.id)}
                      className="opacity-0 group-hover:opacity-100 rounded px-2 py-1 text-[10px] transition-opacity"
                      style={{ color: "var(--red)" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text4)" }}>
              {brands.length} brand{brands.length !== 1 ? "s" : ""} configured.
            </div>
          </div>
        </div>
      )}

      {/* Currency tab (App Settings) */}
      {activeTab === "currency" && (
        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Base Currency</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--text4)" }}>
              Default currency used for min/max bet display and product sheets.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text4)" }}>Currency</label>
              <select
                value={settings.baseCurrency}
                onChange={(e) => updateField("baseCurrency", e.target.value)}
                className="w-full max-w-xs rounded-md px-3 py-2 text-sm"
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
              >
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — US Dollar</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="SEK">SEK — Swedish Krona</option>
                <option value="BRL">BRL — Brazilian Real</option>
                <option value="CAD">CAD — Canadian Dollar</option>
              </select>
              <p className="mt-2 text-xs" style={{ color: "var(--text4)" }}>
                This currency symbol will appear in Step 1 bet configuration, Step 8 rules template, and product sheet exports.
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

      {/* AI Configuration tab (App Settings) */}
      {activeTab === "ai" && (
        <div className="space-y-6">
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

      {/* Features Library tab */}
      {activeTab === "features" && (
        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Features Library</h3>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text4)" }}>
                  Custom features added here will appear in Step 3 (Features) when creating games.
                </p>
              </div>
              <button
                onClick={() => setShowAddFeature(true)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                style={{ background: "var(--accent)" }}
              >
                + Add Feature
              </button>
            </div>

            {showAddFeature && (
              <div className="mb-4 rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--accent-border)" }}>
                <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text)" }}>New Feature</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text4)" }}>Label</label>
                    <input
                      value={newFeature.label}
                      onChange={(e) => setNewFeature((f) => ({ ...f, label: e.target.value }))}
                      placeholder="e.g., Symbol Swap"
                      className="w-full rounded-md px-3 py-1.5 text-sm"
                      style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text4)" }}>Variant ID</label>
                    <input
                      value={newFeature.variant}
                      onChange={(e) => setNewFeature((f) => ({ ...f, variant: e.target.value }))}
                      placeholder="e.g., symbol_swap"
                      className="w-full rounded-md px-3 py-1.5 text-sm"
                      style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text4)" }}>Category</label>
                    <select
                      value={newFeature.type}
                      onChange={(e) => setNewFeature((f) => ({ ...f, type: e.target.value as CustomFeature["type"] }))}
                      className="w-full rounded-md px-3 py-1.5 text-sm"
                      style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
                    >
                      <option value="wild">Wild</option>
                      <option value="bonus">Bonus Round</option>
                      <option value="enhancer">Enhancer</option>
                      <option value="gamble">Gamble</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--text4)" }}>Complexity (1-5)</label>
                    <select
                      value={newFeature.complexity}
                      onChange={(e) => setNewFeature((f) => ({ ...f, complexity: Number(e.target.value) }))}
                      className="w-full rounded-md px-3 py-1.5 text-sm"
                      style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
                    >
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs mb-1" style={{ color: "var(--text4)" }}>Description</label>
                  <textarea
                    value={newFeature.description}
                    onChange={(e) => setNewFeature((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe what this feature does..."
                    rows={2}
                    className="w-full rounded-md px-3 py-1.5 text-sm resize-none"
                    style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
                  />
                </div>
                <div className="flex gap-2 mt-3 justify-end">
                  <button onClick={() => setShowAddFeature(false)} className="rounded-md px-3 py-1.5 text-xs" style={{ color: "var(--text3)" }}>Cancel</button>
                  <button
                    onClick={handleAddFeature}
                    disabled={!newFeature.label.trim() || !newFeature.variant.trim()}
                    className="rounded-md px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    style={{ background: "var(--accent)" }}
                  >
                    Add Feature
                  </button>
                </div>
              </div>
            )}

            {/* Features list */}
            {customFeatures.length === 0 && !showAddFeature && (
              <div className="text-center py-8" style={{ color: "var(--text4)" }}>
                <p className="text-sm">No custom features yet</p>
                <p className="text-xs mt-1">Add features here and they will appear in Step 3 of the wizard.</p>
              </div>
            )}

            {customFeatures.length > 0 && (
              <div className="space-y-2">
                {customFeatures.map((f) => (
                  <div key={f.id} className="rounded-lg p-3 group" style={{ border: "1px solid var(--border)" }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{f.label}</span>
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "rgba(124,107,245,0.12)", color: "var(--accent)" }}>
                            {f.type}
                          </span>
                          <span className="text-[10px]" style={{ color: "var(--text4)" }}>
                            complexity: {f.complexity}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>{f.description || "No description"}</p>
                        <p className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--text4)" }}>variant: {f.variant}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRemoveFeature(f.id)}
                          className="rounded px-2 py-1 text-[10px] transition-colors"
                          style={{ color: "var(--red)" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text4)" }}>
              {customFeatures.length} custom feature{customFeatures.length !== 1 ? "s" : ""} in library. Built-in features (Wilds, Bonus Rounds, Enhancers, Gamble) are always available.
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
