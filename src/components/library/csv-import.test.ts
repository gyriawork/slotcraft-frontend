import { describe, it, expect } from "vitest";
import { parseCsvText, validateCsvRow } from "./csv-import-utils";

describe("CSV Import Utils", () => {
  describe("parseCsvText", () => {
    it("parses a simple CSV with headers", () => {
      const csv = `name,game_type,rtp,volatility
Fire Dragon,slot,96.0,high
Crash Pilot,crash,97.0,medium`;
      const rows = parseCsvText(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe("Fire Dragon");
      expect(rows[0].game_type).toBe("slot");
      expect(rows[0].rtp).toBe(96.0);
      expect(rows[0].volatility).toBe("high");
    });

    it("handles extra whitespace", () => {
      const csv = `name , game_type , rtp
  Padded Game , slot , 95.5 `;
      const rows = parseCsvText(csv);
      expect(rows[0].name).toBe("Padded Game");
      expect(rows[0].rtp).toBe(95.5);
    });

    it("handles empty lines", () => {
      const csv = `name,game_type,rtp

Fire Dragon,slot,96.0

`;
      const rows = parseCsvText(csv);
      expect(rows).toHaveLength(1);
    });

    it("parses numeric fields correctly", () => {
      const csv = `name,game_type,rtp,reels,rows,paylines,max_win,hit_frequency
Test,slot,96.5,5,3,25,5000,28.5`;
      const rows = parseCsvText(csv);
      expect(rows[0].reels).toBe(5);
      expect(rows[0].rows).toBe(3);
      expect(rows[0].paylines).toBe(25);
      expect(rows[0].max_win).toBe(5000);
      expect(rows[0].hit_frequency).toBe(28.5);
    });

    it("handles quoted values with commas", () => {
      const csv = `name,game_type,theme
"Fire, Ice & Dragons",slot,fantasy`;
      const rows = parseCsvText(csv);
      expect(rows[0].name).toBe("Fire, Ice & Dragons");
    });
  });

  describe("validateCsvRow", () => {
    it("returns null for valid row", () => {
      expect(validateCsvRow({ name: "Test", game_type: "slot", rtp: 96 })).toBeNull();
    });

    it("rejects empty name", () => {
      expect(validateCsvRow({ name: "", game_type: "slot" })).toContain("name");
    });

    it("rejects invalid game_type", () => {
      expect(validateCsvRow({ name: "Test", game_type: "poker" })).toContain("game_type");
    });

    it("rejects RTP out of range", () => {
      expect(validateCsvRow({ name: "Test", game_type: "slot", rtp: 105 })).toContain("RTP");
    });

    it("accepts row without optional fields", () => {
      expect(validateCsvRow({ name: "Test", game_type: "crash" })).toBeNull();
    });
  });
});
