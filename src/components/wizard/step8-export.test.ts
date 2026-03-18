import { describe, it, expect } from "vitest";
import type { GddSection } from "@/lib/wizard-types";
import {
  exportFileName,
  sectionsToMarkdown,
  sectionsToJson,
  safeFileName,
} from "@/lib/gdd-export";

const SAMPLE_SECTIONS: GddSection[] = [
  {
    id: "overview",
    title: "1. Game Overview",
    source_step: 4,
    ready: true,
    content: "**Dragon Blaze** — Epic fire-themed slot\n\nType: slot | Grid: 5x3",
    notes: "",
  },
  {
    id: "config",
    title: "2. Configuration",
    source_step: 1,
    ready: true,
    content: "Grid: 5x3 | Win Mechanic: fixed_paylines | Paylines: 20",
    notes: "",
  },
  {
    id: "theme",
    title: "3. Theme & Visual",
    source_step: 4,
    ready: false,
    content: "Complete Step 4 to generate theme.",
    notes: "",
  },
];

describe("exportFileName", () => {
  it("sanitizes special characters in game name", () => {
    const name = exportFileName("Dragon's Blaze!", "full", "md");
    expect(name).toMatch(/^Dragon_s_Blaze_/);
    expect(name).not.toMatch(/[!']/);
  });

  it("uses audience label in filename", () => {
    const name = exportFileName("TestGame", "math", "json");
    expect(name).toContain("Math_Pack");
  });

  it("includes date", () => {
    const name = exportFileName("TestGame", "full", "md");
    const today = new Date().toISOString().slice(0, 10);
    expect(name).toContain(today);
  });

  it("collapses multiple underscores", () => {
    const name = exportFileName("Game  With   Spaces", "full", "md");
    expect(name).not.toContain("__");
  });

  it("uses correct extension", () => {
    expect(exportFileName("G", "full", "md")).toMatch(/\.md$/);
    expect(exportFileName("G", "full", "json")).toMatch(/\.json$/);
    expect(exportFileName("G", "full", "pdf")).toMatch(/\.pdf$/);
  });
});

describe("safeFileName", () => {
  it("strips special characters", () => {
    expect(safeFileName("Dragon's Blaze!")).toBe("Dragon_s_Blaze_");
  });

  it("collapses multiple underscores", () => {
    expect(safeFileName("Game  With   Spaces")).toBe("Game_With_Spaces");
  });

  it("handles simple names", () => {
    expect(safeFileName("TestGame")).toBe("TestGame");
  });
});

describe("sectionsToMarkdown", () => {
  it("includes game name in title", () => {
    const md = sectionsToMarkdown("Dragon Blaze", "full", SAMPLE_SECTIONS, {});
    expect(md).toContain("# Dragon Blaze — Game Design Document");
  });

  it("includes audience label", () => {
    const md = sectionsToMarkdown("Dragon Blaze", "math", SAMPLE_SECTIONS, {});
    expect(md).toContain("**Audience:** Math Pack");
  });

  it("includes table of contents with anchors", () => {
    const md = sectionsToMarkdown("G", "full", SAMPLE_SECTIONS, {});
    expect(md).toContain("- [1. Game Overview](#overview)");
    expect(md).toContain("- [2. Configuration](#config)");
  });

  it("marks unready sections", () => {
    const md = sectionsToMarkdown("G", "full", SAMPLE_SECTIONS, {});
    expect(md).toContain("*Source: Step 4 — Needs input*");
  });

  it("includes custom notes as blockquotes", () => {
    const md = sectionsToMarkdown("G", "full", SAMPLE_SECTIONS, {
      overview: "Check with PM about naming",
    });
    expect(md).toContain("> **Author notes:** Check with PM about naming");
  });

  it("omits notes blockquote when no note", () => {
    const md = sectionsToMarkdown("G", "full", SAMPLE_SECTIONS, {});
    expect(md).not.toContain("Author notes");
  });

  it("separates sections with horizontal rules", () => {
    const md = sectionsToMarkdown("G", "full", SAMPLE_SECTIONS, {});
    expect(md.match(/^---$/gm)?.length).toBe(3);
  });
});

describe("sectionsToJson", () => {
  it("produces valid JSON", () => {
    const json = sectionsToJson("Dragon Blaze", "full", SAMPLE_SECTIONS, {});
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("has correct document metadata", () => {
    const result = JSON.parse(sectionsToJson("Dragon Blaze", "full", SAMPLE_SECTIONS, {}));
    expect(result.document.title).toBe("Dragon Blaze — Game Design Document");
    expect(result.document.audience).toBe("full");
    expect(result.document.audience_label).toBe("Full GDD");
    expect(result.document.sections_count).toBe(3);
  });

  it("includes all sections with correct fields", () => {
    const result = JSON.parse(sectionsToJson("G", "full", SAMPLE_SECTIONS, {}));
    expect(result.sections).toHaveLength(3);
    expect(result.sections[0].id).toBe("overview");
    expect(result.sections[0].ready).toBe(true);
    expect(result.sections[2].ready).toBe(false);
  });

  it("includes custom notes", () => {
    const result = JSON.parse(sectionsToJson("G", "full", SAMPLE_SECTIONS, {
      config: "Verified by GLI",
    }));
    expect(result.sections[1].notes).toBe("Verified by GLI");
    expect(result.sections[0].notes).toBeNull();
  });

  it("filters by audience sections_count", () => {
    const result = JSON.parse(sectionsToJson("G", "math", [SAMPLE_SECTIONS[0]], {}));
    expect(result.document.sections_count).toBe(1);
  });

  it("includes math model data when step5 provided", () => {
    const step5 = {
      active_variant: "96.0",
      target_rtp_tenths: 960,
      rtp_budget: { base_wins: 538, wild_substitution: 180, free_spins: 200, accumulator: 42 },
      rtp_variants: { "96.0": { paytable: [], reel_strips: {}, stops_per_reel: 60, analytical_rtp: 96.0 } },
    };
    const result = JSON.parse(sectionsToJson("G", "full", SAMPLE_SECTIONS, {}, step5));
    expect(result.data.math_model).not.toBeNull();
    expect(result.data.math_model.active_variant).toBe("96.0");
    expect(result.data.math_model.target_rtp_tenths).toBe(960);
  });
});
