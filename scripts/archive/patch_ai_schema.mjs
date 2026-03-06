import { readFileSync, writeFileSync } from 'fs';

// ── patch lib/services/ai.ts ─────────────────────────────────────────────────

const aiSrc = readFileSync('lib/services/ai.ts', 'utf8').replace(/\r\n/g, '\n');

// 1. Replace DocumentTypeRow interface
const oldInterface = `export interface DocumentTypeRow {
  name: string;
  matching_description: string | null;
  schema_definition: { fields?: string[] } & Record<string, unknown>;
}`;

const newInterface = `export interface ExtractionField {
  description: string;
  data_type: 'string' | 'date' | 'currency_amount';
  required?: boolean;
}

export interface DocumentTypeRow {
  name: string;
  matching_description: string | null;
  schema_definition: {
    fields?: string[];
    extraction_schema?: Record<string, ExtractionField>;
  } & Record<string, unknown>;
}`;

if (!aiSrc.includes(oldInterface)) {
  console.error('MISS: DocumentTypeRow interface not found');
  process.exit(1);
}

// 2. Replace extractStructured function
const oldExtractStructured = `/**
 * Phase 2 — extract structured fields defined by the matched type's schema_definition.
 * Uses Gemini's native JSON response schema when possible; falls back to prompt-based.
 */
export async function extractStructured(
  text: string,
  fields: string[],
): Promise<Record<string, unknown>> {
  if (fields.length === 0) return {};

  // Build a dynamic response schema: all fields are nullable strings
  const schemaProperties = Object.fromEntries(
    fields.map(f => [f, { type: SchemaType.STRING, nullable: true }])
  );

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (model as any).generateContent({
      contents: [{
        role: 'user',
        parts: [{ text:
          \`Extract the following fields from the document. \` +
          \`Use null for any field not found. \` +
          \`Dates must be YYYY-MM-DD. Amounts must be plain numbers (no currency symbols).\\n\\n\` +
          \`Fields to extract: \${fields.join(', ')}\\n\\n\` +
          \`Document:\\n\${text.slice(0, 6000)}\`,
        }],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: schemaProperties,
        },
      },
    });
    return JSON.parse(result.response.text()) as Record<string, unknown>;
  } catch (err) {
    console.warn('[extractStructured] Structured output failed, using prompt fallback:', String(err));
    const raw = await callGemini(
      \`Extract these fields as a JSON object: \${fields.join(', ')}\\n\` +
      \`Use null for missing fields. Dates in YYYY-MM-DD. Amounts as numbers.\\n\\n\` +
      \`Document:\\n\${text.slice(0, 6000)}\`,
      true
    );
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  }
}`;

const newExtractStructured = `/** Map extraction_schema data_type to Gemini SchemaType */
function toGeminiType(dataType: string): SchemaType {
  if (dataType === 'currency_amount') return SchemaType.NUMBER;
  return SchemaType.STRING; // 'string', 'date', and anything else
}

/** Enrich description with format hints */
function fieldHint(field: ExtractionField): string {
  let desc = field.description || '';
  if (field.data_type === 'date') desc += ' (format: YYYY-MM-DD)';
  if (field.data_type === 'currency_amount') desc += ' (plain number, no currency symbol or commas)';
  return desc;
}

/**
 * Phase 2 — extract structured fields using the full extraction_schema from the DB taxonomy.
 * Accepts the rich schema object (with descriptions and data_types) for precise Gemini mapping.
 * Falls back gracefully to a flat field-name list for legacy rows.
 */
export async function extractStructured(
  text: string,
  schema: Record<string, ExtractionField> | string[],
): Promise<Record<string, unknown>> {
  // Normalise: convert legacy string[] to minimal ExtractionField objects
  const normalised: Record<string, ExtractionField> = Array.isArray(schema)
    ? Object.fromEntries(schema.map(f => [f, { description: f, data_type: 'string' as const }]))
    : schema;

  const entries = Object.entries(normalised);
  if (entries.length === 0) return {};

  // Build Gemini response schema with per-field types + descriptions
  const schemaProperties = Object.fromEntries(
    entries.map(([key, field]) => [key, {
      type: toGeminiType(field.data_type),
      description: fieldHint(field),
      nullable: true,
    }])
  );

  // Build a human-readable field list for the prompt
  const fieldList = entries
    .map(([key, field]) => \`- \${key}: \${fieldHint(field)}\`)
    .join('\\n');

  const instruction =
    'Extract the following fields from the document text.\\n' +
    'Important: if the document is in Hebrew, return Hebrew text for string fields ' +
    '(e.g. issuer names, full names, locations).\\n' +
    'Use null for any field not present in the document.\\n' +
    'Dates must be in YYYY-MM-DD format. Amounts must be plain numbers (no symbols or commas).\\n\\n' +
    \`Fields:\\n\${fieldList}\\n\\nDocument:\\n\${text.slice(0, 6000)}\`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (model as any).generateContent({
      contents: [{ role: 'user', parts: [{ text: instruction }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: { type: SchemaType.OBJECT, properties: schemaProperties },
      },
    });
    return JSON.parse(result.response.text()) as Record<string, unknown>;
  } catch (err) {
    console.warn('[extractStructured] Structured output failed, using prompt fallback:', String(err));
    const raw = await callGemini(
      \`Extract the following fields as a JSON object. \` +
      \`Return Hebrew text for string fields if the document is in Hebrew. \` +
      \`Use null for missing fields. Dates in YYYY-MM-DD. Amounts as numbers.\\n\\n\` +
      \`Fields:\\n\${fieldList}\\n\\nDocument:\\n\${text.slice(0, 6000)}\`,
      true
    );
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  }
}`;

if (!aiSrc.includes(oldExtractStructured)) {
  console.error('MISS: extractStructured function not found');
  process.exit(1);
}

const aiOut = aiSrc
  .replace(oldInterface, newInterface)
  .replace(oldExtractStructured, newExtractStructured);

writeFileSync('lib/services/ai.ts', aiOut, 'utf8');
console.log('patched: lib/services/ai.ts');

// ── patch pages/api/analyze.ts ───────────────────────────────────────────────

const analyzeSrc = readFileSync('pages/api/analyze.ts', 'utf8').replace(/\r\n/g, '\n');

const oldPhase2 = `  // 6. PHASE 2 — Structured extraction
  let insights: Record<string, unknown> = {};
  const schemaFields: string[] = matchedRow?.schema_definition?.fields ?? [];
  if (schemaFields.length > 0) {
    insights = await extractStructured(text, schemaFields);
  }`;

const newPhase2 = `  // 6. PHASE 2 — Structured extraction (prefer rich extraction_schema, fall back to fields[])
  let insights: Record<string, unknown> = {};
  const extractionSchema = matchedRow?.schema_definition?.extraction_schema ?? null;
  const legacyFields: string[] = matchedRow?.schema_definition?.fields ?? [];
  if (extractionSchema && Object.keys(extractionSchema).length > 0) {
    insights = await extractStructured(text, extractionSchema);
  } else if (legacyFields.length > 0) {
    insights = await extractStructured(text, legacyFields);
  }`;

if (!analyzeSrc.includes(oldPhase2)) {
  console.error('MISS: Phase 2 block not found in analyze.ts');
  process.exit(1);
}

const analyzeOut = analyzeSrc.replace(oldPhase2, newPhase2);
writeFileSync('pages/api/analyze.ts', analyzeOut, 'utf8');
console.log('patched: pages/api/analyze.ts');
