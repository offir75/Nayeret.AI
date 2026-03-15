/**
 * Shared parsing / normalization utilities.
 * Import these instead of re-implementing inline per-file.
 */

export const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  '$': 'USD',
  '₪': 'ILS',
  '€': 'EUR',
  '£': 'GBP',
};

/**
 * Parse a Gemini JSON response that should have `he` and `en` keys.
 * Falls back to { he: '', en: raw } when parsing fails.
 */
export function parseBilingualJson(raw: string): { he: string; en: string } {
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { he?: string; en?: string };
    if (typeof parsed.he === 'string' && typeof parsed.en === 'string') {
      return { he: parsed.he, en: parsed.en };
    }
    console.error('[parseBilingualJson] Unexpected shape, raw:', raw);
    return { he: '', en: raw };
  } catch (err) {
    console.error('[parseBilingualJson] JSON.parse failed:', err instanceof Error ? err.message : String(err), '| raw:', raw.slice(0, 200));
    return { he: '', en: raw };
  }
}

/**
 * Attempt to parse a JSON string; return null on failure (with logging).
 */
export function safeJsonParse<T = unknown>(raw: string, label = 'safeJsonParse'): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[${label}] JSON.parse failed:`, err instanceof Error ? err.message : String(err), '| raw:', raw.slice(0, 200));
    return null;
  }
}
