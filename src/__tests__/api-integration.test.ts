import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConceptBrief, ConceptCard, ThemeData } from "@/lib/api";

// Mock fetch for API tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
const { api } = await import("@/lib/api");

describe("API Integration", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("ai.generateConcepts", () => {
    const brief: ConceptBrief = {
      theme_input: "Aztec Gold",
      audience: ["eu_mainstream"],
      mood: ["epic", "mystical"],
      references: ["Book of Dead"],
      creative_direction: "",
    };

    it("sends correct request and parses response", async () => {
      const mockConcepts: ConceptCard[] = [
        { name: "Aztec Rising", usp: "Cascade depth", description: "Temple cascade", badge: "Best market fit", score: 8 },
        { name: "Aztec Legends", usp: "Story bonus", description: "Narrative", badge: "Alternative angle", score: 7 },
        { name: "Aztec Storm", usp: "Chaotic wilds", description: "High vol", badge: "Wildcard", score: 6 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ concepts: mockConcepts, source: "ai" }),
      });

      const result = await api.ai.generateConcepts(brief);

      expect(result.concepts).toHaveLength(3);
      expect(result.source).toBe("ai");
      expect(result.concepts[0].name).toBe("Aztec Rising");

      // Verify request
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/ai/concepts");
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body);
      expect(body.brief.theme_input).toBe("Aztec Gold");
    });

    it("passes optional context (game_type, variant, features)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ concepts: [], source: "ai" }),
      });

      await api.ai.generateConcepts(brief, {
        game_type: "slot",
        variant: "megaways",
        features: ["expanding_wild", "free_spins"],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.game_type).toBe("slot");
      expect(body.variant).toBe("megaways");
      expect(body.features).toEqual(["expanding_wild", "free_spins"]);
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "theme_input is required" }),
      });

      await expect(api.ai.generateConcepts({ theme_input: "", audience: [], mood: [], references: [], creative_direction: "" }))
        .rejects.toThrow("theme_input is required");
    });
  });

  describe("ai.iterateTheme", () => {
    const currentTheme: ThemeData = {
      description: "A vibrant jungle adventure",
      usp_detail: "Dynamic cascading reels",
      bonus_narrative: "Explore the temple",
    };

    it("sends direction and current theme", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          theme: {
            description: "A dark, foreboding jungle",
            usp_detail: "Shadow cascading reels",
            bonus_narrative: "Survive the cursed temple",
          },
          source: "ai",
        }),
      });

      const result = await api.ai.iterateTheme("Darker mood", currentTheme);

      expect(result.source).toBe("ai");
      expect(result.theme.description).toContain("dark");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.direction).toBe("Darker mood");
      expect(body.current_theme.description).toBe("A vibrant jungle adventure");
    });
  });

  describe("projects CRUD", () => {
    it("list projects", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: "1", name: "Test Game", game_type: "slot", status: "draft", created_at: "", updated_at: "" },
        ]),
      });

      const projects = await api.projects.list();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("Test Game");
    });

    it("create project", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "new-1", name: "New Game", game_type: "slot", status: "draft", created_at: "", updated_at: "" }),
      });

      const project = await api.projects.create({ name: "New Game", game_type: "slot" });
      expect(project.id).toBe("new-1");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.name).toBe("New Game");
      expect(body.game_type).toBe("slot");
    });

    it("update project step_data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "1", name: "Test", game_type: "slot", status: "draft", created_at: "", updated_at: "", step_data: { step1: {} } }),
      });

      await api.projects.update("1", { step_data: { step1: { game_type: "slot" } } });

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/projects/1");
      expect(init.method).toBe("PATCH");
    });

    it("archive project", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await api.projects.archive("1");

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/projects/1");
      expect(init.method).toBe("DELETE");
    });
  });
});
