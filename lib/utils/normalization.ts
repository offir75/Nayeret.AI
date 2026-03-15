/**
 * Pure data-normalization helpers shared by the analysis pipeline.
 * All functions are side-effect-free and safe to import on both client and server.
 */

import { UI_CATEGORIES } from '@/nayeret_ai_schema_registry';
import type { UICategory } from '@/nayeret_ai_schema_registry';
import { REMINDER_OFFSETS_DAYS } from '@/lib/config/pipeline';

// ─── Scalar coercions ─────────────────────────────────────────────────────────

export function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function toScalarString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const fromEpoch = new Date(value);
    if (!Number.isNaN(fromEpoch.getTime())) return fromEpoch.toISOString().slice(0, 10);
  }

  const raw = toScalarString(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const year  = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day   = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Currency normalization ───────────────────────────────────────────────────

export function normalizeCurrency(value: unknown): string | null {
  const curr = toScalarString(value);
  if (!curr) return null;
  const upper = curr.toUpperCase().trim().replace(/\./g, '');
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  if (['$', 'US$', 'DOLLAR', 'DOLLARS', 'USD$'].includes(upper)) return 'USD';
  if (['€', 'EURO', 'EUROS'].includes(upper)) return 'EUR';
  if (['₪', 'NIS', 'SHEKEL', 'SHEKELS', 'NEW SHEKEL', 'NEW SHEKELS'].includes(upper)) return 'ILS';
  if (['£', 'POUND', 'POUNDS', 'STERLING', 'GB£'].includes(upper)) return 'GBP';
  return null;
}

// ─── UI category inference ────────────────────────────────────────────────────

export function inferUiCategory(typeName: string): UICategory {
  if (/hotel|resort|flight|travel|reservation|ticket|cruise|train|bus|ferry|boarding|rental|vacation/i.test(typeName))
    return 'Trips & Tickets';
  if (/insurance|policy|claim/i.test(typeName)) return 'Insurance & Contracts';
  if (/passport|national.id|driver.licen|identity/i.test(typeName)) return 'Identity';
  if (/receipt|purchase|order|retail|supermarket|restaurant|pharmacy/i.test(typeName))
    return 'Bills & Receipts';
  if (/bill|invoice|utility|telecom|cable|electricity|water|gas|toll|fine|penalty/i.test(typeName))
    return 'Bills & Receipts';
  return 'Money';
}

export function normalizeUiCategory(value: unknown, fallback: UICategory): UICategory {
  if (typeof value !== 'string') return fallback;
  return (UI_CATEGORIES as readonly string[]).includes(value) ? (value as UICategory) : fallback;
}

// ─── Lifecycle date computation ───────────────────────────────────────────────

export function computeLifecycleDates(sourceDateIso: string | null): {
  hasEventDate: boolean;
  eventDate: string | null;
  nextReminderDate: string | null;
} {
  if (!sourceDateIso) return { hasEventDate: false, eventDate: null, nextReminderDate: null };

  const eventDate = new Date(`${sourceDateIso}T00:00:00Z`);
  if (Number.isNaN(eventDate.getTime())) {
    return { hasEventDate: false, eventDate: null, nextReminderDate: null };
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const reminderCandidates = REMINDER_OFFSETS_DAYS
    .map((days) => {
      const r = new Date(eventDate);
      r.setUTCDate(r.getUTCDate() - days);
      return r;
    })
    .filter((r) => r.getTime() >= todayUtc.getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    hasEventDate: true,
    eventDate: sourceDateIso,
    nextReminderDate: reminderCandidates[0]?.toISOString().slice(0, 10) ?? null,
  };
}
