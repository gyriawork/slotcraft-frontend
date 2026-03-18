"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavStore } from "@/lib/nav-store";
import { useWizardStore } from "@/lib/wizard-store";
import { WizardStepBar } from "./wizard-step-bar";
import { TOTAL_WIZARD_STEPS } from "@/lib/constants";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
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
        <Link href="/dashboard" className="flex items-center gap-2 mr-2 shrink-0">
          <div
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #7c6bf5, #c084fc)" }}
          >
            SW
          </div>
          <span className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            SLOT<span style={{ color: "var(--accent)" }}>WISE</span>
          </span>
        </Link>

        {/* Separator */}
        <div className="h-8 shrink-0" style={{ width: 0.5, background: "var(--border)" }} />

        {/* Project selector (only on wizard pages) */}
        {isWizardPage && (
          <>
            <div
              className="flex items-center gap-2 rounded-md px-3.5 py-[7px] shrink-0 text-[13px] cursor-pointer transition-all duration-100"
              style={{
                background: "var(--bg3)",
                border: "0.5px solid var(--border)",
              }}
            >
              <ProjectTypeIcon type={projectType} />
              <span className="font-medium max-w-[160px] truncate" style={{ color: "var(--text)" }}>
                {projectName}
              </span>
              <span className="text-[10px] ml-1" style={{ color: "var(--text3)" }}>
                {currentStep}/{TOTAL_WIZARD_STEPS}
              </span>
              <span className="text-[10px] ml-0.5" style={{ color: "var(--text3)" }}>&#9662;</span>
            </div>
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
