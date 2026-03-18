"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

const PLAN_TIERS = [
  {
    key: "free" as const,
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "1 active project",
      "1M browser simulation spins/mo",
      "10 AI review calls/mo",
      "Markdown export",
      "10 games in library",
    ],
  },
  {
    key: "pro" as const,
    name: "Pro",
    price: "$299",
    annualPrice: "$249",
    period: "/month",
    features: [
      "Unlimited projects",
      "Unlimited browser simulations",
      "100M server simulation spins/mo",
      "500 AI review calls/mo",
      "All export formats (PDF, Notion, Jira, Confluence)",
      "3 team seats (+ $49/seat)",
      "500 games in library",
      "Priority support",
    ],
  },
  {
    key: "enterprise" as const,
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Everything in Pro",
      "SSO / SAML",
      "1B+ simulation spins",
      "Unlimited seats & library",
      "Custom integrations",
      "On-premise deployment",
      "SLA & dedicated support",
    ],
  },
];

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  warning: boolean;
  formatValue?: (n: number) => string;
}

function UsageMeter({ label, used, limit, warning, formatValue }: UsageMeterProps) {
  const fmt = formatValue || ((n: number) => n.toLocaleString());
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barColor = warning ? "bg-amber-500" : pct >= 100 ? "bg-red-500" : "bg-blue-500";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">
          {fmt(used)} / {isUnlimited ? "Unlimited" : fmt(limit)}
        </span>
      </div>
      {!isUnlimited && (
        <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
          <div
            className={`h-2 rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
      {isUnlimited && (
        <div className="mt-1 h-2 w-full rounded-full bg-green-100">
          <div className="h-2 w-full rounded-full bg-green-300" />
        </div>
      )}
    </div>
  );
}

// Placeholder userId — in production this comes from Clerk auth
const USER_ID = "current-user";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "billing" | "team">("profile");
  const [subscription, setSubscription] = useState<{
    plan: string;
    status: string;
    seats_included: number;
    seats_used: number;
    trial_ends_at?: string | null;
    current_period_end?: string | null;
  } | null>(null);
  const [usage, setUsage] = useState<Record<string, number> | null>(null);
  const [warnings, setWarnings] = useState<Record<string, boolean>>({});
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [annual, setAnnual] = useState(false);

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, limitsData] = await Promise.all([
        api.billing.getSubscription(USER_ID),
        api.billing.getLimits(USER_ID),
      ]);
      setSubscription(sub);
      setUsage(limitsData.usage);
      setWarnings(limitsData.warnings);
      const numLimits: Record<string, number> = {};
      for (const [k, v] of Object.entries(limitsData.limits)) {
        if (typeof v === "number") numLimits[k] = v;
      }
      setLimits(numLimits);
    } catch {
      // API not available — use defaults
      setSubscription({ plan: "free", status: "active", seats_included: 1, seats_used: 1 });
      setUsage({ browser_sim_spins: 0, server_sim_spins: 0, ai_review_calls: 0, export_count: 0 });
      setLimits({ browser_sim_spins: 1_000_000, server_sim_spins: 0, ai_review_calls: 10, projects: 1, library_games: 10, seats: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "billing") {
      loadBillingData();
    }
  }, [activeTab, loadBillingData]);

  const handleUpgrade = async (plan: string) => {
    setUpgrading(true);
    try {
      const { url } = await api.billing.createCheckout(USER_ID, plan, annual);
      window.location.href = url;
    } catch {
      // Stripe not configured — show message
      alert("Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { url } = await api.billing.createPortal(USER_ID);
      window.location.href = url;
    } catch {
      alert("Unable to open billing portal.");
    }
  };

  const currentPlan = subscription?.plan || "free";

  const formatSpins = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg)" }}>
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">Manage your account and subscription</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {([
          ["profile", "Profile"],
          ["billing", "Billing"],
          ["team", "Team"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900">Account Information</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500">Display Name</label>
                <input
                  type="text"
                  defaultValue="Game Designer"
                  className="mt-1 w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Email</label>
                <input
                  type="email"
                  defaultValue="designer@studio.com"
                  className="mt-1 w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Studio Name</label>
                <input
                  type="text"
                  defaultValue=""
                  placeholder="e.g., Thunderstrike Games"
                  className="mt-1 w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
            <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Save Changes
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900">AI Configuration</h3>
            <p className="mt-1 text-xs text-gray-400">
              Configure AI-powered concept generation in Step 4
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500">Anthropic API Key</label>
                <input
                  type="password"
                  defaultValue=""
                  placeholder="sk-ant-..."
                  className="mt-1 w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Without an API key, AI features use deterministic fallback concepts.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900">Default Preferences</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">Default Game Type</p>
                  <p className="text-xs text-gray-400">Pre-select when creating new games</p>
                </div>
                <select className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
                  <option value="slot">Slot</option>
                  <option value="crash">Crash</option>
                  <option value="table">Table</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">Default Target RTP</p>
                  <p className="text-xs text-gray-400">Starting RTP for new projects</p>
                </div>
                <select className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
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

      {/* Billing tab */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Current plan banner */}
          <div className={`rounded-lg border p-4 ${
            currentPlan === "pro" ? "border-indigo-200 bg-indigo-50" : "border-blue-200 bg-blue-50"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-semibold ${
                  currentPlan === "pro" ? "text-indigo-900" : "text-blue-900"
                }`}>
                  Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                </p>
                {subscription?.trial_ends_at && (
                  <p className="text-xs text-amber-700">
                    Trial ends {new Date(subscription.trial_ends_at).toLocaleDateString()}
                  </p>
                )}
                {subscription?.current_period_end && currentPlan !== "free" && (
                  <p className="text-xs text-gray-600">
                    Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  subscription?.status === "active" ? "bg-green-100 text-green-700" :
                  subscription?.status === "trialing" ? "bg-amber-100 text-amber-700" :
                  subscription?.status === "past_due" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {subscription?.status === "active" ? "Active" :
                   subscription?.status === "trialing" ? "Trial" :
                   subscription?.status === "past_due" ? "Past Due" :
                   subscription?.status || "Active"}
                </span>
                {currentPlan !== "free" && (
                  <button
                    onClick={handleManageBilling}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Manage Billing
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Usage meters */}
          {usage && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900">Monthly Usage</h3>
              <div className="mt-4 space-y-4">
                <UsageMeter
                  label="Browser Simulations"
                  used={usage.browser_sim_spins || 0}
                  limit={limits.browser_sim_spins ?? 1_000_000}
                  warning={warnings.browser_sim_spins || false}
                  formatValue={formatSpins}
                />
                <UsageMeter
                  label="Server Simulations"
                  used={usage.server_sim_spins || 0}
                  limit={limits.server_sim_spins ?? 0}
                  warning={warnings.server_sim_spins || false}
                  formatValue={formatSpins}
                />
                <UsageMeter
                  label="AI Review Calls"
                  used={usage.ai_review_calls || 0}
                  limit={limits.ai_review_calls ?? 10}
                  warning={warnings.ai_review_calls || false}
                />
                <UsageMeter
                  label="Exports"
                  used={usage.export_count || 0}
                  limit={-1}
                  warning={false}
                />
              </div>
              {Object.values(warnings).some(Boolean) && (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs text-amber-800">
                    You are approaching your usage limits. Consider upgrading to Pro for higher limits.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Annual toggle */}
          {currentPlan === "free" && (
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm ${!annual ? "font-semibold text-gray-900" : "text-gray-500"}`}>Monthly</span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  annual ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  annual ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
              <span className={`text-sm ${annual ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                Annual <span className="text-xs text-green-600">(save 17%)</span>
              </span>
            </div>
          )}

          {/* Plan cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {PLAN_TIERS.map((plan) => {
              const isCurrent = plan.key === currentPlan;
              return (
                <div
                  key={plan.name}
                  className={`rounded-lg border p-5 ${
                    isCurrent
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {plan.key === "pro" && annual ? plan.annualPrice : plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-gray-500">{plan.period}</span>
                    )}
                  </div>
                  {plan.key === "pro" && annual && (
                    <p className="mt-0.5 text-xs text-green-600">Billed annually ($2,988/yr)</p>
                  )}
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="mt-0.5 text-green-500">&#10003;</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      if (plan.key === "enterprise") {
                        window.location.href = "mailto:sales@slotcraft.io?subject=Enterprise%20Inquiry";
                      } else if (!isCurrent && plan.key === "pro") {
                        handleUpgrade("pro");
                      }
                    }}
                    disabled={isCurrent || upgrading}
                    className={`mt-4 w-full rounded-md px-4 py-2 text-sm font-medium ${
                      isCurrent
                        ? "border border-gray-300 bg-white text-gray-500 cursor-default"
                        : plan.key === "enterprise"
                          ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    }`}
                  >
                    {isCurrent ? "Current Plan" : plan.key === "enterprise" ? "Contact Sales" : upgrading ? "Redirecting..." : "Upgrade"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Downgrade info */}
          {currentPlan !== "free" && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">
                If you cancel, your projects become read-only and data is retained for 90 days.
                You can resubscribe anytime to restore full access.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Team tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Team Members</h3>
              <button
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                disabled={currentPlan === "free"}
              >
                Invite Member
              </button>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between rounded-md border border-gray-100 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                    GD
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Game Designer</p>
                    <p className="text-xs text-gray-500">designer@studio.com</p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Owner
                </span>
              </div>
            </div>
            {currentPlan === "free" ? (
              <p className="mt-4 text-xs text-gray-400">
                Team collaboration is available on Pro and Enterprise plans.
              </p>
            ) : (
              <p className="mt-4 text-xs text-gray-400">
                {subscription?.seats_used || 1} of {subscription?.seats_included || 1} seats used.
                {currentPlan === "pro" && " Additional seats $49/month each."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
