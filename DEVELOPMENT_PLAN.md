# LifeVault – Development Plan

## Current State

- Next.js + Tailwind CSS project
- `pages/api/upload.ts` — saves PDFs to `uploads/`
- `pages/api/analyze.ts` — parses PDF, calls Gemini, stores in Supabase
- `pages/index.tsx` — basic dashboard with upload button
- `uploads/` folder exists with sample files
- `.env.local` exists (Gemini + Supabase keys)
- **Known issues in `analyze.ts`:** `callGemini` is called but never defined; dead code below the first `return` (lines 150–229); `pdf-parse` is imported incorrectly

---

## Phase 1 – Fix Broken Analyze API

**Goal:** Get `analyze.ts` working end-to-end before adding new features.

1. Fix the `pdf-parse` import (use `const pdfParse = require('pdf-parse')` and call it correctly)
2. Define the `callGemini(prompt, jsonMode?)` helper using the Gemini SDK (`@google/generative-ai`)
3. Remove the duplicate/dead code block after the first `return res.status(200)` (lines 150–229)
4. Add the `GEMINI_API_KEY` read from `process.env` at the top of the file
5. Smoke-test: upload one of the sample PDFs and confirm a Supabase row is created

---

## Phase 2 – Bilingual Summarization (Hebrew + English)

**Goal:** Generate both a Hebrew summary and an English summary for every document.

### 2a. Update the Gemini Summarization Prompt

Replace the single Hebrew-only prompt with two parallel calls:

- **Hebrew summary:** "Summarize the document in exactly 2 sentences in Hebrew."
- **English summary:** "Summarize the document in exactly 2 sentences in English."

Or use one prompt that returns a JSON object `{ "he": "...", "en": "..." }` to save an API call.

### 2b. Update the Supabase `documents` Table Schema

Add a new column:

```sql
ALTER TABLE documents ADD COLUMN summary_en TEXT;
-- rename existing summary column to summary_he (optional but clearer)
ALTER TABLE documents RENAME COLUMN summary TO summary_he;
```

### 2c. Update the Supabase Insert in `analyze.ts`

```ts
.insert([{
  file_name: filename,
  summary_he: summaries.he,
  summary_en: summaries.en,
  document_group,
  raw_analysis: raw_metadata,
}])
```

### 2d. Update the API Response

Return both summaries:

```json
{
  "success": true,
  "filename": "...",
  "summary_he": "...",
  "summary_en": "...",
  "document_group": "...",
  "raw_metadata": { ... }
}
```

---

## Phase 3 – Dashboard UI Improvements

**Goal:** Display analysis results cleanly, with proper bilingual support.

1. Replace the `BillDetail` interface with a richer `DocumentResult` interface:
   ```ts
   interface DocumentResult {
     filename: string;
     summary_he: string;
     summary_en: string;
     document_group: string;
     raw_metadata: Record<string, any>;
     supabaseId: string | null;
   }
   ```

2. Add a language toggle (EN / HE) on the card to switch which summary is shown

3. Apply `dir="rtl"` and `text-right` when displaying the Hebrew summary

4. Show `document_group` as a badge/tag (color-coded per category)

5. Display key `raw_metadata` fields in a readable table instead of a raw `<pre>` block

6. Show a loading spinner during upload + analysis

---

## Phase 4 – Supabase Document Library

**Goal:** Persist and display all previously uploaded documents across sessions.

1. On page load, fetch all rows from `documents` table via Supabase client
2. Display them in the dashboard list (same card format as Phase 3)
3. Add basic search/filter by `document_group` or filename
4. Add a delete button that removes a row from Supabase and the local `uploads/` file

---

## Phase 5 – Polish & Error Handling

1. Validate file type on the client (PDF only) and show a clear error for other formats
2. Add a file size limit warning (e.g., > 20 MB)
3. Handle Gemini API errors gracefully — if AI fails, still save the file and show a "summary unavailable" state
4. Add RTL layout support globally for Hebrew content using Tailwind's `rtl:` variant
5. Add a `tsconfig.json` path alias check — ensure `@/supabase/client` resolves correctly

---

## File Checklist

| File | Action |
|------|--------|
| `pages/api/analyze.ts` | Rewrite (fix imports, add `callGemini`, bilingual prompts) |
| `pages/api/upload.ts` | No changes needed |
| `pages/index.tsx` | Update UI (Phase 3) |
| `supabase/client.ts` | Verify `supabaseAdmin` export exists |
| `.env.local` | Verify `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are set |
| `DEVELOPMENT_PLAN.md` | This file |

---

## Dependencies to Verify

```bash
npm list pdf-parse @google/generative-ai @supabase/supabase-js
```

Install any missing:

```bash
npm install pdf-parse @google/generative-ai @supabase/supabase-js
npm install --save-dev @types/pdf-parse
```
