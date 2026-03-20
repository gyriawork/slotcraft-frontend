const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface Project {
  id: string;
  name: string;
  game_type: "slot" | "crash" | "table";
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
  step_data?: Record<string, unknown>;
  completed_steps?: number;
  current_step?: number;
  development_start?: string | null;
  development_end?: string | null;
  tech_release?: string | null;
  pre_release?: string | null;
  marketing_release?: string | null;
}

function getAnthropicKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("reelspec_settings");
    if (raw) { const s = JSON.parse(raw); return s.anthropicApiKey || null; }
  } catch { /* ignore */ }
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const extraHeaders: Record<string, string> = {};
  const apiKey = getAnthropicKey();
  if (apiKey) extraHeaders["x-anthropic-key"] = apiKey;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ConceptCard {
  name: string;
  usp: string;
  description: string;
  badge?: string;
  score?: number;
  reasoning?: string;
  market_context?: string;
}

export interface ConceptBrief {
  theme_input: string;
  creative_direction: string;
  audience: string[];
  mood: string[];
  references: string[];
}

export interface ThemeData {
  description: string;
  usp_detail: string;
  bonus_narrative: string;
}

export interface SaturationResult {
  theme_label: string;
  game_count: number;
  saturation_pct: number;
  top_competitors: Array<{ name: string; provider: string }>;
  hints: string[];
}

export interface HolisticSymbolReview {
  theme_fit: { score: number; feedback: string };
  distinctiveness: { score: number; feedback: string };
  missing_archetypes: string[];
  overall_score: number;
  suggestions: string[];
}

export interface LibraryGame {
  id: string;
  name: string;
  game_type: "slot" | "crash" | "table";
  source: "wizard" | "csv_import" | "manual" | "api_import" | "par_upload";
  parameters: Record<string, unknown>;
  ai_analysis: Record<string, unknown> | null;
  ai_analyzed_at: string | null;
  status: "live" | "development" | "archived" | "concept";
  release_date: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CsvImportRow {
  name: string;
  game_type: string;
  rtp?: number;
  volatility?: string;
  reels?: number;
  rows?: number;
  paylines?: number;
  max_win?: number;
  hit_frequency?: number;
  features?: string[];
  theme?: string;
  status?: string;
  release_date?: string;
}

export interface PortfolioAnalytics {
  total_games: number;
  avg_rtp: number | null;
  rtp_range: { min: number; max: number };
  volatility_distribution: Record<string, number>;
  theme_distribution: Record<string, number>;
  feature_popularity: Record<string, number>;
}

export const api = {
  projects: {
    list: () => request<Project[]>("/api/projects"),
    get: (id: string) => request<Project>(`/api/projects/${id}`),
    create: (data: { name: string; game_type: string; development_start?: string | null; development_end?: string | null; tech_release?: string | null; pre_release?: string | null; marketing_release?: string | null }) =>
      request<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Pick<Project, "name" | "status" | "step_data" | "development_start" | "development_end" | "tech_release" | "pre_release" | "marketing_release">>) =>
      request<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    archive: (id: string) =>
      request<{ ok: boolean }>(`/api/projects/${id}`, {
        method: "DELETE",
      }),
    duplicate: (id: string) =>
      request<Project>(`/api/projects/${id}/duplicate`, {
        method: "POST",
      }),
    history: (id: string) =>
      request<Array<{ id: string; action: string; changes: string; timestamp: string }>>(`/api/projects/${id}/history`),
  },
  ai: {
    generateConcepts: (brief: ConceptBrief, context?: { game_type?: string; variant?: string; features?: string[]; grid?: { reels: number; rows: number }; volatility?: string; target_rtp?: number }) =>
      request<{ concepts: ConceptCard[]; source: string }>("/api/ai/concepts", {
        method: "POST",
        body: JSON.stringify({ brief, ...context }),
      }),
    iterateTheme: (direction: string, current_theme: ThemeData, context?: { game_type?: string; features?: string[] }) =>
      request<{ theme: ThemeData; reasoning?: string[]; source: string }>("/api/ai/theme-iterate", {
        method: "POST",
        body: JSON.stringify({ direction, current_theme, ...context }),
      }),
    saturationCheck: (theme_keywords: string) =>
      request<{ saturation: SaturationResult; source: string }>("/api/ai/saturation-check", {
        method: "POST",
        body: JSON.stringify({ theme_keywords }),
      }),
    generateSoundDirection: (params: { theme: string; art_style: string; palette: string[] }) =>
      request<{
        sounds: { ambient: string; spin: string; win: string; bonus_trigger: string; cascade: string; max_win: string };
        source: string;
      }>("/api/ai/generate-sound-direction", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    review: (step: number, step_data: Record<string, unknown>, context?: Record<string, unknown>) =>
      request<{
        review: {
          score: number;
          verdict: "excellent" | "good" | "needs_work" | "critical";
          strengths: string[];
          issues: string[];
          suggestions: string[];
        };
        source: string;
      }>("/api/ai/review", {
        method: "POST",
        body: JSON.stringify({ step, step_data, context }),
      }),
    generateNames: (params: { theme: string; game_type?: string; mood?: string[]; concept_name?: string }) =>
      request<{
        names: Array<{ name: string; reasoning: string }>;
        source: string;
      }>("/api/ai/names", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    symbolReview: (params: { theme: string; symbols: Array<{ id: string; name: string; role: string }>; volatility?: string; holistic?: boolean }) =>
      request<{
        review: { score: number; feedback: string[] } | HolisticSymbolReview;
        source: string;
      }>("/api/ai/symbol-review", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    generateMarketingCopy: (context: {
      game_name: string;
      game_type?: string;
      theme_description?: string;
      features?: string[];
      rtp?: number;
      volatility?: string;
      max_win?: number;
      grid?: { reels: number; rows: number };
    }) =>
      request<{
        short_description: string;
        long_description: string;
        selling_points: string[];
      }>("/api/ai/marketing-copy", {
        method: "POST",
        body: JSON.stringify(context),
      }),
    generatePressRelease: (context: {
      game_name: string;
      game_type?: string;
      theme_description?: string;
      features?: string[];
      rtp?: number;
      volatility?: string;
      max_win?: number;
      selling_points?: string[];
    }) =>
      request<{ press_release: string }>("/api/ai/press-release", {
        method: "POST",
        body: JSON.stringify(context),
      }),
    generateSocialCopy: (context: {
      game_name: string;
      game_type?: string;
      theme_description?: string;
      features?: string[];
      rtp?: number;
      volatility?: string;
      max_win?: number;
    }) =>
      request<{
        twitter: string;
        linkedin: string;
        instagram: string;
        hashtags: string[];
        seo: {
          title: string;
          meta_description: string;
          keywords: string[];
        };
      }>("/api/ai/social-copy", {
        method: "POST",
        body: JSON.stringify(context),
      }),
    translate: (text: string, source_lang: string, target_lang: string) =>
      request<{ translated: string; source: string }>("/api/ai/translate", {
        method: "POST",
        body: JSON.stringify({ text, source_lang, target_lang }),
      }),
  },
  math: {
    generate: (params: {
      grid: { reels: number; rows: number };
      target_rtp: number;
      volatility: string;
      paylines: number;
      features: string[];
      symbols: Array<{ id: string; name: string; role: string }>;
      rtp_variants?: number[];
    }) =>
      request<{
        active_variant: string;
        rtp_variants: Record<string, {
          paytable: Array<{ symbol_id: string; label: string; x3: number; x4: number; x5: number }>;
          reel_strips: Record<string, Record<string, number>>;
          stops_per_reel: number;
          analytical_rtp: number;
        }>;
        rtp_budget: { base_wins: number; wild_substitution: number; free_spins: number; accumulator: number };
        target_rtp_tenths: number;
      }>("/api/math/generate", {
        method: "POST",
        body: JSON.stringify(params),
      }),
  },
  export: {
    generateGdd: (wizardData: Record<string, unknown>, audience: string, format: string) =>
      request<{ content: string; format: string; audience: string; sections_count: number }>("/api/export/gdd", {
        method: "POST",
        body: JSON.stringify({ wizard_data: wizardData, audience, format }),
      }),
  },
  simulation: {
    run: (config: unknown, spinCount: number, seed: number) =>
      request<{
        spins: number;
        total_wagered: number;
        total_won: number;
        sum_win_squared: number;
        winning_spins: number;
        bonus_triggers: number;
        max_win: number;
        distribution_buckets: number[];
        rtp: number;
        hit_frequency: number;
        bonus_frequency: number;
        volatility_sd: number;
        convergence?: Array<{ spin: number; rtp: number }>;
      }>("/api/simulation/run", {
        method: "POST",
        body: JSON.stringify({ config, spin_count: spinCount, seed }),
      }),
  },
  library: {
    list: (params?: { type?: string; search?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.type) qs.set("type", params.type);
      if (params?.search) qs.set("search", params.search);
      if (params?.status) qs.set("status", params.status);
      const query = qs.toString();
      return request<LibraryGame[]>(`/api/library/games${query ? `?${query}` : ""}`);
    },
    get: (id: string) => request<LibraryGame>(`/api/library/games/${id}`),
    create: (data: { name: string; game_type: string; parameters?: Record<string, unknown>; status?: string; release_date?: string }) =>
      request<LibraryGame>("/api/library/games", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; parameters: Record<string, unknown>; status: string; release_date: string }>) =>
      request<LibraryGame>(`/api/library/games/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<{ ok: boolean }>(`/api/library/games/${id}`, { method: "DELETE" }),
    import: (rows: CsvImportRow[]) =>
      request<{ imported: number; errors: Array<{ row: number; reason: string }>; total: number }>("/api/library/import", {
        method: "POST",
        body: JSON.stringify({ rows }),
      }),
    analytics: () =>
      request<PortfolioAnalytics>("/api/library/analytics"),
  },
  share: {
    create: (projectId: string, params: { permission: "view" | "comment"; expires_in_days?: number }) =>
      request<{ id: string; token: string; permission: string; created_at: string; expires_at: string | null }>(
        `/api/projects/${projectId}/share`,
        { method: "POST", body: JSON.stringify(params) }
      ),
    list: (projectId: string) =>
      request<Array<{ id: string; token: string; permission: string; created_at: string; expires_at: string | null }>>(
        `/api/projects/${projectId}/share`
      ),
    revoke: (projectId: string, token: string) =>
      request<{ ok: boolean }>(`/api/projects/${projectId}/share/${token}`, { method: "DELETE" }),
    resolve: (token: string) =>
      request<{ permission: string; project: Project }>(`/api/share/${token}`),
  },
  comments: {
    list: (projectId: string, step?: number) => {
      const qs = step !== undefined ? `?step=${step}` : "";
      return request<Array<{ id: string; step: number | null; author_name: string; body: string; resolved: boolean; created_at: string }>>(
        `/api/projects/${projectId}/comments${qs}`
      );
    },
    create: (projectId: string, data: { step?: number; author_name: string; body: string }) =>
      request<{ id: string; step: number | null; author_name: string; body: string; resolved: boolean; created_at: string }>(
        `/api/projects/${projectId}/comments`,
        { method: "POST", body: JSON.stringify(data) }
      ),
    resolve: (projectId: string, commentId: string, resolved: boolean) =>
      request<{ id: string; resolved: boolean }>(
        `/api/projects/${projectId}/comments/${commentId}`,
        { method: "PATCH", body: JSON.stringify({ resolved }) }
      ),
    delete: (projectId: string, commentId: string) =>
      request<{ ok: boolean }>(`/api/projects/${projectId}/comments/${commentId}`, { method: "DELETE" }),
  },
  dashboard: {
    get: () => request<{ projects: unknown[]; recentActivity: unknown[] }>("/api/dashboard"),
  },
};
