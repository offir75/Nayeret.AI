/**
 * Seed document_types table from nayeret_document_taxonomy_full.json
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

interface TaxonomyDoc {
  taxonomy: string;
  classification: string;
  group: string;
  matching_description: string;
  extraction_schema: Record<string, ExtractionField>;
}

interface TaxonomyFile {
  schema_version: string;
  documents: TaxonomyDoc[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const PRIORITY_GROUPS = new Set([
  'Identification',
  'Bills',
  'Finance',
  'Travel',
  'Insurance',
  'Subscriptions',
]);

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

  // Read and parse taxonomy JSON
  const jsonPath = resolve(process.cwd(), 'nayeret_document_taxonomy_full.json');
  const { documents }: TaxonomyFile = JSON.parse(readFileSync(jsonPath, 'utf8'));

  const filtered = documents.filter(d => PRIORITY_GROUPS.has(d.group));
  console.log(`Found ${filtered.length} priority types (from ${documents.length} total)\n`);

  // Map to DB rows
  const rows = filtered.map(d => ({
    name:                d.taxonomy,
    doc_group:           d.classification,
    matching_description: d.matching_description,
    schema_definition:   { extraction_schema: d.extraction_schema },
    is_active:           true,
    is_tax_deductible:   false,
  }));

  // Upsert in batches
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
