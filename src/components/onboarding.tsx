"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { SAMPLE_PROJECT_NAME, sampleStepData } from "@/lib/sample-project";

interface Props {
  onDismiss: () => void;
}

const FEATURES = [
  {
    icon: "🎰",
    title: "8-Step Design Wizard",
    desc: "From concept to production-ready GDD in a guided flow",
  },
  {
    icon: "🧮",
    title: "Math Model Generator",
    desc: "Paytables, reel strips, and RTP budget — no spreadsheets needed",
  },
  {
    icon: "📊",
    title: "Monte Carlo Simulation",
    desc: "Verify your math with millions of simulated spins",
  },
  {
    icon: "🎮",
    title: "HTML5 Prototype",
    desc: "Playable demo for stakeholder presentations",
  },
];

export function Onboarding({ onDismiss }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateSample() {
    setCreating(true);
    setError(null);
    try {
      const project = await api.projects.create({
        name: SAMPLE_PROJECT_NAME,
        game_type: "slot",
      });
      await api.projects.update(project.id, {
        step_data: sampleStepData as unknown as Record<string, unknown>,
      });
      router.push(`/games/${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create sample project");
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Welcome header */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
          🎰
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome to SlotCraft</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Design casino games from concept to production. Get started by exploring a sample
          project or creating your own from scratch.
        </p>
      </div>

      {/* Feature highlights */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-4"
          >
            <span className="text-2xl">{f.icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-0.5 text-xs text-gray-500">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Sample project */}
        <button
          onClick={handleCreateSample}
          disabled={creating}
          className="group rounded-lg border-2 border-blue-200 bg-blue-50/50 p-6 text-left transition-all hover:border-blue-400 hover:shadow-md disabled:opacity-60"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 text-lg group-hover:bg-blue-200 transition-colors">
            {creating ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            ) : (
              "⚡"
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900">
            {creating ? "Creating..." : "Explore Sample Project"}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Pre-built &ldquo;Aztec Thunder&rdquo; slot with all 8 steps completed.
            See how a finished game design looks.
          </p>
          <span className="mt-3 inline-block text-xs font-medium text-blue-600">
            Recommended for first-time users
          </span>
        </button>

        {/* Blank project */}
        <button
          onClick={() => router.push("/games/new")}
          disabled={creating}
          className="group rounded-lg border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-gray-400 hover:shadow-md disabled:opacity-60"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500 text-lg group-hover:bg-gray-200 transition-colors">
            +
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Start From Scratch</h3>
          <p className="mt-1 text-xs text-gray-500">
            Create a new game design with the guided wizard.
            Perfect if you already know what you want to build.
          </p>
          <span className="mt-3 inline-block text-xs font-medium text-gray-400">
            For experienced designers
          </span>
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Skip link */}
      <div className="mt-6 text-center">
        <button
          onClick={onDismiss}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip — go straight to dashboard
        </button>
      </div>
    </div>
  );
}
