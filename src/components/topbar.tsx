"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, type Project } from "@/lib/api";
import { useNavStore } from "@/lib/nav-store";
import { useWizardStore } from "@/lib/wizard-store";
import { WizardStepBar } from "./wizard-step-bar";
import { TOTAL_WIZARD_STEPS } from "@/lib/constants";

const NAV_LINKS = [
  { href: "/games", label: "Projects" },
  { href: "/library", label: "Game library" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/marketing", label: "Marketing" },
  { href: "/settings", label: "Settings" },
];

function UserAvatar() {
  const [ClerkButton, setClerkButton] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (key && !key.includes("REPLACE_ME")) {
      import("@clerk/nextjs").then((mod) => {
        setClerkButton(() => mod.UserButton);
      }).catch(() => {});
    }
  }, []);

  if (ClerkButton) return <ClerkButton />;
  return (
    <div
      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white cursor-pointer"
      style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
    >
      U
    </div>
  );
}

function ProjectTypeIcon({ type }: { type: string | null }) {
  const letter = type === "crash" ? "C" : type === "table" ? "T" : "S";
  const bg =
    type === "crash"
      ? "linear-gradient(135deg, #f59e0b, #ef4444)"
      : type === "table"
      ? "linear-gradient(135deg, #10b981, #3b82f6)"
      : "linear-gradient(135deg, #7c6bf5, #a78bfa)";

  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white"
      style={{ background: bg }}
    >
      {letter}
    </div>
  );
}

function ProjectSelectorDropdown({ currentName, currentType, currentStep }: {
  currentName: string | null;
  currentType: string | null;
  currentStep: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentProjectId = pathname.match(/\/games\/([^/]+)/)?.[1] ?? null;

  const handleOpen = useCallback(async () => {
    if (!open && !loaded) {
      try {
        const list = await api.projects.list();
        setProjects(list);
        setLoaded(true);
      } catch { /* ignore */ }
    }
    setOpen((prev) => !prev);
  }, [open, loaded]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-md px-3.5 py-[7px] text-[13px] cursor-pointer transition-all duration-100"
        style={{ background: "var(--bg3)", border: "0.5px solid var(--border)" }}
      >
        <ProjectTypeIcon type={currentType} />
        <span className="font-medium max-w-[160px] truncate" style={{ color: "var(--text)" }}>
          {currentName}
        </span>
        <span className="text-[10px] ml-1" style={{ color: "var(--text3)" }}>
          {currentStep}/{TOTAL_WIZARD_STEPS}
        </span>
        <span className="text-[10px] ml-0.5" style={{ color: "var(--text3)" }}>&#9662;</span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-[280px] rounded-lg border py-1 shadow-xl z-50 max-h-[320px] overflow-y-auto"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {projects.length === 0 && (
            <div className="px-3 py-4 text-center text-[11px]" style={{ color: "var(--text4)" }}>Loading...</div>
          )}
          {projects.map((p) => {
            const isActive = p.id === currentProjectId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setOpen(false);
                  if (!isActive) router.push(`/games/${p.id}`);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors"
                style={{
                  background: isActive ? "var(--accent-soft)" : "transparent",
                }}
              >
                <ProjectTypeIcon type={p.game_type} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate" style={{ color: isActive ? "var(--accent)" : "var(--text)" }}>
                    {p.name}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text4)" }}>
                    Step {p.current_step ?? 1}/{TOTAL_WIZARD_STEPS} · {p.game_type}
                  </div>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />}
              </button>
            );
          })}
          <div className="border-t mt-1 pt-1" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => { setOpen(false); router.push("/games/new"); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium transition-colors"
              style={{ color: "var(--accent)" }}
            >
              + New project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const {
    projectName, projectType, saving,
    onSave, onShare, onComments, onHistory,
  } = useNavStore();

  const { currentStep, completedSteps, setCurrentStep } = useWizardStore();

  const isWizardPage = !!projectName;

  return (
    <>
      {/* Main topbar — 64px */}
      <header
        className="flex h-16 shrink-0 items-center px-6 gap-4 border-b"
        style={{ background: "var(--bg2)", borderColor: "var(--border)", zIndex: 100 }}
      >
        {/* Logo */}
        <Link href="/games" className="mr-2 shrink-0">
          <span className="text-[22px] font-black tracking-tight" style={{ color: "var(--text)" }}>
            REEL<span style={{ color: "var(--accent)" }}>SPEC</span>
          </span>
        </Link>

        {/* Separator */}
        <div className="h-8 shrink-0" style={{ width: 0.5, background: "var(--border)" }} />

        {/* Project selector (only on wizard pages) */}
        {isWizardPage && (
          <>
            <ProjectSelectorDropdown
              currentName={projectName}
              currentType={projectType}
              currentStep={currentStep}
            />
            <div className="h-8 shrink-0" style={{ width: 0.5, background: "var(--border)" }} />
          </>
        )}

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 shrink-0">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/games"
                ? pathname === "/games" || (pathname.startsWith("/games/") && !isWizardPage)
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3.5 py-2 text-[13px] whitespace-nowrap transition-all duration-100"
                style={{
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text2)",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {isWizardPage && (
            <>
              {saving && (
                <span className="text-[10px] mr-1" style={{ color: "var(--text3)" }}>Saving...</span>
              )}
              <TopbarButton onClick={onShare ?? undefined}>Share</TopbarButton>
              <TopbarButton onClick={onComments ?? undefined}>Comments</TopbarButton>
              <TopbarButton onClick={onHistory ?? undefined}>History</TopbarButton>
              <TopbarButton onClick={onSave ?? undefined} primary disabled={saving}>Save</TopbarButton>
            </>
          )}
          <UserAvatar />
        </div>
      </header>

      {/* Wizard step bar — 44px, only on wizard pages */}
      {isWizardPage && (
        <WizardStepBar
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={setCurrentStep}
        />
      )}
    </>
  );
}

export function TopbarButton({
  children,
  onClick,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-[7px] rounded-md text-[12px] font-medium cursor-pointer transition-all duration-100 disabled:opacity-40 whitespace-nowrap"
      style={{
        background: primary ? "var(--accent-soft)" : "transparent",
        border: "0.5px solid",
        borderColor: primary ? "var(--accent-border)" : "var(--border)",
        color: primary ? "var(--accent)" : "var(--text2)",
      }}
    >
      {children}
    </button>
  );
}
