import type { CsvImportRow } from "@/lib/api";

const NUMERIC_FIELDS = new Set(["rtp", "reels", "rows", "paylines", "max_win", "hit_frequency"]);

/** All expected database fields with display labels */
export const EXPECTED_FIELDS: Array<{ key: string; label: string; required: boolean }> = [
  { key: "name", label: "Name", required: true },
  { key: "game_type", label: "Game Type", required: true },
  { key: "rtp", label: "RTP", required: false },
  { key: "volatility", label: "Volatility", required: false },
  { key: "reels", label: "Reels", required: false },
  { key: "rows", label: "Rows", required: false },
  { key: "paylines", label: "Paylines", required: false },
  { key: "max_win", label: "Max Win", required: false },
  { key: "hit_frequency", label: "Hit Frequency", required: false },
  { key: "theme", label: "Theme", required: false },
  { key: "status", label: "Status", required: false },
  { key: "release_date", label: "Release Date", required: false },
];

const EXPECTED_KEYS = new Set(EXPECTED_FIELDS.map((f) => f.key));

/** Common aliases for auto-matching CSV headers to expected fields */
const ALIASES: Record<string, string> = {
  // name
  "game_name": "name",
  "game name": "name",
  "title": "name",
  "game": "name",
  "gamename": "name",
  // game_type
  "game_type": "game_type",
  "game type": "game_type",
  "gametype": "game_type",
  "type": "game_type",
  "category": "game_type",
  // rtp
  "rtp": "rtp",
  "return_to_player": "rtp",
  "return to player": "rtp",
  "payout": "rtp",
  // volatility
  "volatility": "volatility",
  "vol": "volatility",
  "variance": "volatility",
  // reels
  "reels": "reels",
  "reel_count": "reels",
  "reel count": "reels",
  // rows
  "rows": "rows",
  "row_count": "rows",
  "row count": "rows",
  // paylines
  "paylines": "paylines",
  "pay_lines": "paylines",
  "pay lines": "paylines",
  "lines": "paylines",
  "ways": "paylines",
  // max_win
  "max_win": "max_win",
  "max win": "max_win",
  "maxwin": "max_win",
  "max_multiplier": "max_win",
  "max multiplier": "max_win",
  // hit_frequency
  "hit_frequency": "hit_frequency",
  "hit frequency": "hit_frequency",
  "hitfrequency": "hit_frequency",
  "hit_freq": "hit_frequency",
  "hit freq": "hit_frequency",
  // theme
  "theme": "theme",
  "themes": "theme",
  // status
  "status": "status",
  "state": "status",
  // release_date
  "release_date": "release_date",
  "release date": "release_date",
  "releasedate": "release_date",
  "launch_date": "release_date",
  "launch date": "release_date",
  "date": "release_date",
};

export type FieldMapping = Record<string, string | null>; // csvHeader → expectedField | null (skip)

/**
 * Check whether CSV headers exactly match expected fields (case-insensitive).
 * Returns true if all headers map directly, false if mapping is needed.
 */
export function headersMatchExpected(headers: string[]): boolean {
  return headers.every((h) => EXPECTED_KEYS.has(h.trim().toLowerCase()));
}

/**
 * Auto-detect mappings from CSV headers to expected fields.
 * Returns a mapping object: csvHeader → expectedField | null.
 */
export function autoDetectMapping(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const lower = header.trim().toLowerCase();
    // Direct match
    if (EXPECTED_KEYS.has(lower) && !usedFields.has(lower)) {
      mapping[header] = lower;
      usedFields.add(lower);
      continue;
    }
    // Alias match
    const alias = ALIASES[lower];
    if (alias && !usedFields.has(alias)) {
      mapping[header] = alias;
      usedFields.add(alias);
      continue;
    }
    // No match — skip
    mapping[header] = null;
  }

  return mapping;
}

/**
 * Parse raw CSV lines (header + data rows) using a field mapping.
 * Remaps CSV columns to expected field names before building rows.
 */
export function parseCsvWithMapping(text: string, mapping: FieldMapping): CsvImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const originalHeaders = parseRow(lines[0]);
  const rows: CsvImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    if (values.every((v) => !v.trim())) continue;

    const obj: Record<string, unknown> = {};
    for (let j = 0; j < originalHeaders.length; j++) {
      const csvHeader = originalHeaders[j].trim();
      const mappedField = mapping[csvHeader];
      if (!mappedField) continue; // skipped column

      const val = (values[j] ?? "").trim();
      if (!val) continue;

      if (NUMERIC_FIELDS.has(mappedField)) {
        const num = parseFloat(val);
        if (!isNaN(num)) obj[mappedField] = num;
      } else {
        obj[mappedField] = val;
      }
    }

    rows.push(obj as unknown as CsvImportRow);
  }

  return rows;
}

/**
 * Extract raw headers from CSV text (first line).
 */
export function extractHeaders(text: string): string[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  return parseRow(lines[0]).map((h) => h.trim());
}

/**
 * Get sample values from the first data row for each header.
 */
export function extractSampleValues(text: string): string[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  return parseRow(lines[1]).map((v) => v.trim());
}

/**
 * Parse CSV text into structured import rows.
 * Handles: headers, numeric coercion, quoted fields, whitespace trimming.
 */
export function parseCsvText(text: string): CsvImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: CsvImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    if (values.every((v) => !v.trim())) continue; // skip blank rows

    const obj: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      const val = (values[j] ?? "").trim();
      if (!val) continue;

      if (NUMERIC_FIELDS.has(key)) {
        const num = parseFloat(val);
        if (!isNaN(num)) obj[key] = num;
      } else {
        obj[key] = val;
      }
    }

    rows.push(obj as unknown as CsvImportRow);
  }

  return rows;
}

/** Parse a single CSV row, respecting quoted fields */
function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Client-side validation for a single CSV row.
 * Returns error string or null if valid.
 */
export function validateCsvRow(row: Partial<CsvImportRow>): string | null {
  if (!row.name?.trim()) return "Missing name";
  if (!row.game_type || !["slot", "crash", "table"].includes(row.game_type)) {
    return "Invalid game_type (must be slot, crash, or table)";
  }
  if (row.rtp !== undefined && (row.rtp < 80 || row.rtp > 99.9)) {
    return "RTP must be between 80 and 99.9";
  }
  return null;
}
