import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  Step7Data,
  GddAudience,
  GddFormat,
  GddSection,
} from "./wizard-types";

export const AUDIENCE_LABELS: Record<GddAudience, { label: string; desc: string }> = {
  full: { label: "Full GDD", desc: "All sections — PM / Game Designer" },
  math: { label: "Math Pack", desc: "Sections 7-9 — GLI / BMM Certification" },
  art: { label: "Art Brief", desc: "Sections 3, 10 — Art Director" },
  dev: { label: "Dev Spec", desc: "Sections 2, 5-6, 8, 11 — Developers" },
  executive: { label: "Executive Summary", desc: "1-page overview — Directors" },
};

export const AUDIENCE_SECTIONS: Record<GddAudience, number[]> = {
  full: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  math: [7, 8, 9],
  art: [3, 10],
  dev: [2, 5, 6, 8, 11],
  executive: [1],
};

export const FORMAT_LABELS: Record<GddFormat, { label: string; icon: string }> = {
  pdf: { label: "PDF", icon: "📄" },
  notion: { label: "Notion Page", icon: "📝" },
  jira: { label: "Jira Tickets", icon: "🎫" },
  confluence: { label: "Confluence", icon: "📘" },
  markdown: { label: "Markdown", icon: "📋" },
  json: { label: "JSON", icon: "{ }" },
};

export const INTEGRATION_FORMATS = new Set<GddFormat>(["notion", "jira", "confluence"]);

export function buildSections(
  step1: Step1Data | null,
  step2: Step2Data | null,
  step3: Step3Data | null,
  step4: Step4Data | null,
  step5: Step5Data | null,
  step6: Step6Data | null,
  step7: Step7Data | null,
): GddSection[] {
  const s = (
    id: string,
    title: string,
    sourceStep: number,
    ready: boolean,
    content: string,
  ): GddSection => ({
    id,
    title,
    source_step: sourceStep,
    ready,
    content,
    notes: "",
  });

  const gameName = step4?.naming?.selected || step1?.variant || "Untitled Game";

  return [
    s("overview", "1. Game Overview", 4, !!step4?.selected_concept, step4
      ? `**${gameName}** — ${step4.selected_concept?.usp || "No concept selected"}\n\nType: ${step1?.game_type || "slot"} | Variant: ${step1?.variant || "—"} | Grid: ${step1?.grid ? `${step1.grid.reels}x${step1.grid.rows}` : "—"}`
      : "Complete Step 4 to generate game overview."),

    s("config", "2. Configuration", 1, !!step1, step1
      ? `Grid: ${step1.grid?.reels ?? "—"}x${step1.grid?.rows ?? "—"} | Win Mechanic: ${step1.win_mechanic ?? "—"} | Paylines: ${step1.paylines ?? "—"}\nBet Range: ${step1.bet?.min ?? "—"}–${step1.bet?.max ?? "—"} (default ${step1.bet?.default ?? "—"})\nMarkets: ${step1.markets?.join(", ").toUpperCase() ?? "—"}`
      : "Complete Step 1 to generate configuration."),

    s("theme", "3. Theme & Visual", 4, !!step4?.theme, step4?.theme
      ? `**Theme:** ${step4.theme.description}\n**USP:** ${step4.theme.usp_detail}\n**Bonus Narrative:** ${step4.theme.bonus_narrative}`
      : "Complete Step 4 to generate theme."),

    s("symbols", "4. Symbols & Paytable", 5, !!(step4?.symbols && step5), (() => {
      if (!step4?.symbols?.length) return "Complete Steps 4-5 to generate symbols & paytable.";
      const symbolList = step4.symbols.map(sym => `${sym.name} (${sym.role})`).join(", ");
      const variantKey = step5?.active_variant;
      const variant = variantKey ? step5?.rtp_variants?.[variantKey] : null;
      const paytableInfo = variant
        ? `\nPaytable rows: ${variant.paytable.length} | Stops per reel: ${variant.stops_per_reel}`
        : "";
      return `Symbols: ${symbolList}${paytableInfo}`;
    })()),

    s("features", "5. Features & Mechanics", 3, !!step3?.features?.length, step3?.features?.length
      ? step3.features.map(f => `- ${f.variant} (${f.type})`).join("\n")
      : "Complete Step 3 to generate features."),

    s("bonus", "6. Bonus Specification", 3, !!(step3?.features?.some(f => f.type === "bonus")), (() => {
      if (!step3?.features?.length) return "Complete Step 3 to generate bonus spec.";
      const bonuses = step3.features.filter(f => f.type === "bonus");
      if (!bonuses.length) return "No bonus features configured.";
      return bonuses.map(b => `**${b.variant}:** ${JSON.stringify(b.config)}`).join("\n");
    })()),

    s("math", "7. Math Model & RTP", 5, !!step5, (() => {
      if (!step5) return "Complete Step 5 to generate math model.";
      const budget = step5.rtp_budget;
      const total = (budget.base_wins + budget.wild_substitution + budget.free_spins + budget.accumulator) / 10;
      return `Target RTP: ${step5.target_rtp_tenths / 10}%\nBudget: Base ${budget.base_wins / 10}% + Wild ${budget.wild_substitution / 10}% + FS ${budget.free_spins / 10}% + Acc ${budget.accumulator / 10}% = ${total}%\nVariants: ${Object.keys(step5.rtp_variants).join(", ")}`;
    })()),

    s("reels", "8. Reel Strips", 5, !!step5, (() => {
      if (!step5) return "Complete Step 5 to generate reel strips.";
      const variantKey = step5.active_variant;
      const variant = step5.rtp_variants[variantKey];
      if (!variant) return "No active variant.";
      const reelCount = Object.keys(variant.reel_strips).length;
      return `Reel count: ${reelCount} | Stops per reel: ${variant.stops_per_reel}\nAnalytical RTP: ${variant.analytical_rtp}%`;
    })()),

    s("simulation", "9. Simulation Results", 6, !!step6, step6
      ? `Simulated RTP: ${step6.rtp.toFixed(2)}% (${step6.pass ? "PASS" : "FAIL"})\nSpins: ${step6.spins.toLocaleString()} | Hit Freq: ${step6.hit_frequency.toFixed(1)}%\nMax Win: ${step6.max_win.toFixed(0)}x | Volatility SD: ${step6.volatility_sd.toFixed(2)}\nBonus Triggers: ${step6.bonus_triggers.toLocaleString()}`
      : "Run Step 6 simulation to generate results."),

    s("art_sound", "10. Art & Sound Spec", 4, !!step4?.art_direction, step4?.art_direction
      ? `Style: ${step4.art_direction.style}\nPalette: ${step4.art_direction.palette.join(", ")}\nSound: Ambient (${step4.art_direction.sound.ambient}), Spin (${step4.art_direction.sound.spin}), Win (${step4.art_direction.sound.win})`
      : "Complete Step 4 to generate art & sound spec."),

    s("ui_flow", "11. UI Flow", 7, !!step7,
      step7
        ? `Visual Mode: ${step7.visual_mode} | Skin: ${step7.ui_skin} | View: ${step7.view_type}\nSpeed: ${step7.speed} | Demo Balance: ${step7.demo_balance}`
        : "Complete Step 7 to generate UI flow."),

    s("compliance", "12. Compliance", 1, !!step1?.markets?.length, step1?.markets?.length
      ? `Markets: ${step1.markets.map(m => m.toUpperCase()).join(", ")}\n${step1.market_constraints ? Object.entries(step1.market_constraints)
          .map(([k, v]) => `${k.toUpperCase()}: ${[v.autoplay_disabled && "No Autoplay", v.bonus_buy_disabled && "No Bonus Buy", v.max_bet_cap && `Max Bet €${v.max_bet_cap}`, v.min_spin_time_ms && `Min Spin ${v.min_spin_time_ms}ms`].filter(Boolean).join(", ")}`)
          .join("\n") : ""}`
      : "Complete Step 1 to generate compliance section."),
  ];
}

export function downloadFile(content: string | Blob, filename: string, mimeType?: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Format a filename per PITFALLS L2: {GameName}_{ExportType}_{Date}.{ext} */
export function exportFileName(gameName: string, audience: GddAudience, ext: string): string {
  const safe = gameName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const date = new Date().toISOString().slice(0, 10);
  const audienceLabel = AUDIENCE_LABELS[audience].label.replace(/\s/g, "_");
  return `${safe}_${audienceLabel}_${date}.${ext}`;
}

/** Safe filename for data attachments */
export function safeFileName(gameName: string): string {
  return gameName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
}

/** Convert sections to formatted Markdown */
export function sectionsToMarkdown(
  gameName: string,
  audience: GddAudience,
  sections: GddSection[],
  customNotes: Record<string, string>,
): string {
  const lines: string[] = [];
  lines.push(`# ${gameName} — Game Design Document`);
  lines.push(`**Audience:** ${AUDIENCE_LABELS[audience].label}`);
  lines.push(`**Generated:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");

  lines.push("## Table of Contents");
  for (const s of sections) {
    lines.push(`- [${s.title}](#${s.id})`);
  }
  lines.push("");

  for (const s of sections) {
    lines.push(`## ${s.title}`);
    lines.push(`*Source: Step ${s.source_step} — ${s.ready ? "Auto-generated" : "Needs input"}*`);
    lines.push("");
    lines.push(s.content);
    lines.push("");
    const note = customNotes[s.id];
    if (note) {
      lines.push(`> **Author notes:** ${note}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/** Convert sections to structured JSON */
export function sectionsToJson(
  gameName: string,
  audience: GddAudience,
  sections: GddSection[],
  customNotes: Record<string, string>,
  step5?: Step5Data | null,
  step6?: Step6Data | null,
): string {
  return JSON.stringify({
    document: {
      title: `${gameName} — Game Design Document`,
      audience,
      audience_label: AUDIENCE_LABELS[audience].label,
      generated_at: new Date().toISOString(),
      sections_count: sections.length,
    },
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      source_step: s.source_step,
      ready: s.ready,
      content: s.content,
      notes: customNotes[s.id] || null,
    })),
    data: {
      math_model: step5 ? {
        active_variant: step5.active_variant,
        target_rtp_tenths: step5.target_rtp_tenths,
        rtp_budget: step5.rtp_budget,
        variants: step5.rtp_variants,
      } : null,
      simulation: step6 ?? null,
    },
  }, null, 2);
}
