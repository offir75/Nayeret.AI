/**
 * Seed document_types table from nayeret_document_taxonomy_v2_israel_us_global.json
 * Includes semantic_signals and ui_category for accurate Phase 1 scoring.
 *
 * Prerequisites (run once in Supabase Dashboard → SQL Editor):
 *   supabase/migrations/20260306010000_add_doc_group.sql
 *
 * Usage:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/seed-taxonomy.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local without requiring dotenv ──────────────────────────────────
function loadEnv(filePath: string): void {
  try {
    const lines = readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env.local may not exist in CI — rely on actual env vars
  }
}
loadEnv(resolve(process.cwd(), '.env.local'));

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtractionField {
  description: string;
  data_type: 'string' | 'date' | 'currency_amount';
  required?: boolean;
}

interface SemanticSignals {
  keywords_he?: string[];
  keywords_en?: string[];
  layout_hints?: string[];
  vendor_examples?: string[];
  ocr_patterns?: string[];
}

interface TaxonomyDoc {
  taxonomy: string;
  classification: string;
  group: string;
  ui_category?: string;
  matching_description: string;
  semantic_signals?: SemanticSignals;
  extraction_schema: Record<string, ExtractionField>;
}

interface TaxonomyFile {
  schema_version: string;
  documents: TaxonomyDoc[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 20;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // Read and parse taxonomy JSON (v2 — includes semantic_signals and ui_category)
  const jsonPath = resolve(process.cwd(), 'nayeret_document_taxonomy_v2_israel_us_global.json');
  const { documents }: TaxonomyFile = JSON.parse(readFileSync(jsonPath, 'utf8'));

  console.log(`Seeding all ${documents.length} types from v2 taxonomy\n`);

  // Map to DB rows — include semantic_signals and ui_category for Phase 1 scoring
  const rows = documents.map(d => ({
    name:                 d.taxonomy,
    doc_group:            d.classification,
    matching_description: d.matching_description,
    schema_definition:    { extraction_schema: d.extraction_schema },
    semantic_signals:     d.semantic_signals ?? null,
    ui_category:          d.ui_category ?? null,
    is_active:            true,
    is_tax_deductible:    false,
  }));

  // Upsert in batches — updates existing rows with semantic_signals if they were seeded without
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('document_types')
      .upsert(batch, { onConflict: 'name' });

    if (error) {
      console.error(`✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
      process.exit(1);
    }

    done += batch.length;
    console.log(`  ✓ ${done} / ${rows.length} upserted`);
  }

  console.log('\nDone. document_types table is up to date.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
