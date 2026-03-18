"use client";

import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  Step7Data,
  Step8Data,
  Step9Data,
  StepValidity,
} from "@/lib/wizard-types";

interface Step0OverviewProps {
  step1: Step1Data | null;
  step2: Step2Data | null;
  step3: Step3Data | null;
  step4: Step4Data | null;
  step5: Step5Data | null;
  step6: Step6Data | null;
  step7: Step7Data | null;
  step8: Step8Data | null;
  step9: Step9Data | null;
  stepValidity: Record<number, StepValidity>;
  completedSteps: number[];
  onGoToStep: (step: number) => void;
}

export function Step0Overview({
  step1,
  step2,
  step3,
  step4,
  step5,
  step6,
  step7,
  step8,
  step9,
  stepValidity,
  completedSteps,
  onGoToStep,
}: Step0OverviewProps) {
  return (
    <div className="space-y-4">
      {/* Step 1 — Game Setup */}
      <StepSection
        num={1}
        title="Game Setup"
        validity={stepValidity[1]}
        done={completedSteps.includes(1)}
        onEdit={() => onGoToStep(1)}
      >
        {step1 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <Row label="Game type" value={step1.game_type} />
            <Row label="Variant" value={step1.variant?.replace(/_/g, " ")} />
            <Row label="Grid" value={step1.grid ? `${step1.grid.reels}x${step1.grid.rows}` : "—"} />
            <Row label="Win mechanic" value={step1.win_mechanic?.replace(/_/g, " ")} />
            <Row label="Paylines" value={String(step1.paylines ?? "—")} />
            <Row label="Bet range" value={step1.bet ? `${step1.bet.min}–${step1.bet.max} (default ${step1.bet.default})` : "—"} />
            <Row label="Markets" value={step1.markets?.length ? step1.markets.join(", ").toUpperCase() : "—"} />
          </div>
        ) : (
          <Empty />
        )}
      </StepSection>

      {/* Step 2 — Volatility */}
      <StepSection
        num={2}
        title="Volatility & Metrics"
        validity={stepValidity[2]}
        done={completedSteps.includes(2)}
        onEdit={() => onGoToStep(2)}
      >
        {step2 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <Row label="Target RTP" value={step2.target_rtp != null ? `${step2.target_rtp}%` : undefined} accent />
            <Row label="Volatility" value={step2.volatility} />
            <Row label="Hit frequency" value={step2.hit_frequency != null ? `${step2.hit_frequency}%` : undefined} />
            <Row label="Max win" value={step2.max_win != null ? `${step2.max_win}x` : undefined} />
            <Row label="Bonus frequency" value={step2.bonus_frequency != null ? `1 in ${step2.bonus_frequency}` : undefined} />
            <Row label="RTP variants" value={step2.rtp_variants?.length ? step2.rtp_variants.map((v) => `${v}%`).join(", ") : undefined} />
          </div>
        ) : (
          <Empty />
        )}
      </StepSection>

      {/* Step 3 — Features */}
      <StepSection
        num={3}
        title="Features"
        validity={stepValidity[3]}
        done={completedSteps.includes(3)}
        onEdit={() => onGoToStep(3)}
      >
        {step3 ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {(step3.features as unknown[]).map((f, i) => {
                const label = typeof f === "string" ? f : ((f as { type?: string; variant?: string }).variant ?? (f as { type?: string }).type ?? "Feature");
                return (
                  <span
                    key={i}
                    className="rounded-md border px-2.5 py-1 text-[12px]"
                    style={{ background: "var(--accent-soft)", borderColor: "var(--accent-border)", color: "var(--accent)" }}
                  >
                    {label.replace(/_/g, " ")}
                  </span>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2">
              <Row label="Complexity score" value={step3.complexity_score != null ? `${step3.complexity_score}/10` : undefined} />
              <Row label="Est. dev weeks" value={step3.estimated_dev_weeks != null ? String(step3.estimated_dev_weeks) : undefined} />
            </div>
          </div>
        ) : (
          <Empty />
        )}
      </StepSection>

      {/* Step 4 — Concept */}
      <StepSection
        num={4}
        title="Concept & Theme"
        validity={stepValidity[4]}
        done={completedSteps.includes(4)}
        onEdit={() => onGoToStep(4)}
      >
        {step4 ? (
          <div className="space-y-2">
            {step4.selected_concept && (
              <div className="rounded-md border p-2.5" style={{ background: "var(--bg3)", borderColor: "var(--border)" }}>
                <div className="text-[12px] font-medium" style={{ color: "var(--accent)" }}>
                  {step4.selected_concept.name}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text2)" }}>
                  {step4.selected_concept.usp}
                </div>
              </div>
            )}
            {step4.theme && (
              <div className="grid grid-cols-1 gap-y-1.5">
                <Row label="Theme" value={step4.theme.description} />
                <Row label="USP" value={step4.theme.usp_detail} />
              </div>
            )}
            {step4.symbols && step4.symbols.length > 0 && (
              <div>
                <div className="text-[11px] mb-1" style={{ color: "var(--text3)" }}>Symbols</div>
                <div className="flex flex-wrap gap-1">
                  {step4.symbols.map((sym) => (
                    <span
                      key={sym.id}
                      className="rounded border px-2 py-0.5 text-[11px]"
                      style={{
                        background: sym.role === "wild" || sym.role === "scatter" ? "var(--accent-soft)" : "var(--bg3)",
                        borderColor: "var(--border)",
                        color: sym.role === "wild" || sym.role === "scatter" ? "var(--accent)" : "var(--text2)",
                      }}
                    >
                      {sym.name} ({sym.role.replace(/_/g, " ")})
                    </span>
                  ))}
                </div>
              </div>
            )}
            {step4.naming?.selected && (
              <Row label="Game name" value={step4.naming.selected} />
            )}
          </div>
        ) : (
          <Empty />
        )}
      </StepSection>

      {/* Step 5 — Math Model */}
      <StepSection
        num={5}
        title="Math Model"
        validity={stepValidity[5]}
        done={completedSteps.includes(5)}
        onEdit={() => onGoToStep(5)}
      >
        {step5 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <Row label="Active variant" value={`${step5.active_variant}%`} />
            <Row label="Target RTP" value={`${(step5.target_rtp_tenths / 10).toFixed(1)}%`} accent />
            <Row label="RTP variants" value={Object.keys(step5.rtp_variants).join(", ")} />
            {step5.rtp_budget && (
              <>
                <Row label="Base wins" value={`${(step5.rtp_budget.base_wins / 10).toFixed(1)}%`} />
                <Row label="Wild substitution" value={`${(step5.rtp_budget.wild_substitution / 10).toFixed(1)}%`} />
                <Row label="Free spins" value={`${(step5.rtp_budget.free_spins / 10).toFixed(1)}%`} />
                <Row label="Accumulator" value={`${(step5.rtp_budget.accumulator / 10).toFixed(1)}%`} />
              </>
            )}
          </div>
        ) : (
          <Empty />
        )}
      </StepSection>

      {/* Step 6 — Simulation */}
      <StepSection
        num={6}
        title="Simulation Results"
        validity={stepValidity[6]}
        done={completedSteps.includes(6)}
        onEdit={() => onGoToStep(6)}
      >
        {step6 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <Row label="Simulated RTP" value={`${step6.rtp.toFixed(2)}%`} accent />
            <Row label="Hit frequency" value={`${step6.hit_frequency.toFixed(1)}%`} />
            <Row label="Max win" value={`${step6.max_win.toFixed(1)}x`} />
            <Row label="Volatility SD" value={step6.volatility_sd.toFixed(2)} />
            <Row label="Spins" value={step6.spins.toLocaleString()} />
            <Row label="Bonus triggers" value={step6.bonus_triggers.toLocaleString()} />
            <Row label="Pass" value={step6.pass ? "Yes" : "No"} accent={step6.pass} />
          </div>
        ) : (
          <Empty />
        )}
      </StepSection>

      {/* Step 7 — Prototype */}
      <StepSection
        num={7}
        title="Prototype"
        validity={stepValidity[7]}
        done={completedSteps.includes(7)}
        onEdit={() => onGoToStep(7)}
      >
        {step7 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <Row label="Visual mode" value={step7.visual_mode} />
            <Row label="UI skin" value={step7.ui_skin} />
            <Row label="View type" value={step7.view_type} />
            <Row label="Speed" value={step7.speed} />
            <Row label="Demo balance" value={step7.demo_balance === "unlimited" ? "Unlimited" : String(step7.demo_balance)} />
          </div>
        ) : (
          <Empty />
        )}
      </StepSection>

      {/* Step 8 — Rules & Translations */}
      <StepSection
        num={8}
        title="Rules & Translations"
        validity={stepValidity[8]}
        done={completedSteps.includes(8)}
        onEdit={() => onGoToStep(8)}
      >
        {step8 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <Row label="Source language" value={step8.template.source_lang.toUpperCase()} />
            <Row label="Languages" value={String(step8.languages.length + step8.custom_languages.length)} />
            <Row label="Translated" value={String(Object.values(step8.translations).filter((t) => t.status === "translated").length)} />
            <Row label="Variables" value={String(Object.keys(step8.variables).length)} />
            <Row label="Template" value={step8.template.content ? (step8.template.auto_generated ? "Auto-generated" : "Custom") : "Not set"} />
          </div>
        ) : (
          <Empty />
        )}
      </StepSection>

      {/* Step 9 — GDD Export */}
      <StepSection
        num={9}
        title="GDD Export"
        validity={stepValidity[9]}
        done={completedSteps.includes(9)}
        onEdit={() => onGoToStep(9)}
      >
        {step9 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <Row label="Audience" value={step9.selected_audience} />
            <Row label="Sections" value={`${step9.sections.filter((s) => s.ready).length}/${step9.sections.length} ready`} />
            <Row label="Exports" value={step9.exports?.length ? `${step9.exports.length} exported` : "None"} />
          </div>
        ) : (
          <Empty />
        )}
      </StepSection>
    </div>
  );
}

/* ── Sub-components ── */

function StepSection({
  num,
  title,
  validity,
  done,
  onEdit,
  children,
}: {
  num: number;
  title: string;
  validity?: StepValidity;
  done: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const statusColor = done
    ? validity === "stale"
      ? "var(--amber)"
      : "var(--green)"
    : "var(--text3)";

  return (
    <div
      className="rounded-lg border transition-colors"
      style={{
        background: "var(--bg2)",
        borderColor: done ? (validity === "stale" ? "rgba(240,176,64,.3)" : "rgba(52,199,89,.2)") : "var(--border)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[10px] font-semibold"
            style={{
              border: "0.5px solid",
              borderColor: statusColor,
              color: statusColor,
              background: done ? (validity === "stale" ? "rgba(240,176,64,.1)" : "var(--green-soft)") : "transparent",
            }}
          >
            {done ? (validity === "stale" ? "!" : "\u2713") : num}
          </span>
          <span className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
            Step {num} — {title}
          </span>
          {validity === "stale" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(240,176,64,.1)", color: "var(--amber)" }}>
              needs review
            </span>
          )}
        </div>
        <button
          onClick={onEdit}
          className="text-[11px] px-3 py-1 rounded-md border transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--accent)", background: "var(--bg3)" }}
        >
          {done ? "Edit" : "Start"}
        </button>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value?: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 text-[12px]">
      <span className="shrink-0" style={{ color: "var(--text3)", minWidth: 120 }}>{label}</span>
      <span style={{ color: accent ? "var(--accent)" : "var(--text)", fontWeight: accent ? 500 : 400 }}>
        {value || "—"}
      </span>
    </div>
  );
}

function Empty() {
  return (
    <div className="text-[12px] py-1" style={{ color: "var(--text3)", fontStyle: "italic" }}>
      Not configured yet
    </div>
  );
}
