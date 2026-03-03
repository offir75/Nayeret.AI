# Supabase Setup for LifeVault

This directory contains Supabase configuration and database migrations for the LifeVault Personal Document Management Center.

## Project Structure

- **migrations/**: SQL migration files for setting up the database schema
- **client.ts**: Supabase client initialization and TypeScript types

## Initial Setup

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Enter project details:
   - **Name**: LifeVault (or your preference)
   - **Database Password**: Generate a strong password
   - **Region**: Choose the region closest to your users
4. Wait for project initialization (usually 2-3 minutes)

### 2. Get Your Credentials

Once your project is ready:

1. Go to **Project Settings** → **API**
2. Copy:
   - `URL` → set as `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
   - `anon public` key → set as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
   - `service_role` key → set as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (KEEP SECRET)

### 3. Update Environment Variables

Edit `.env.local` and add your Supabase credentials:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Run Migrations

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Link your project
supabase link --project-ref your-project-ref

# Push migrations to your database
supabase db push
```

#### Option B: Using SQL Editor in Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `migrations/20260302120000_create_documents_table.sql`
5. Paste into the editor
6. Click **Run**

#### Option C: Using psql (Direct Database Connection)

```bash
# First, get your connection string from Supabase Project Settings → Database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" < migrations/20260302120000_create_documents_table.sql
```

## Database Schema

### `documents` Table

The main table for storing document metadata and AI-extracted insights.

| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID | Primary key, auto-generated |
| `file_name` | TEXT | Filename in `/uploads` folder |
| `document_type` | TEXT | 'bill', 'financial_report', 'receipt', or 'other' |
| `provider` | TEXT | Company/entity name (supports Hebrew) |
| `amount` | NUMERIC(12,2) | Currency amount with 2 decimal places |
| `currency` | TEXT | ISO 4217 code ('ILS', 'USD', 'EUR', etc.) |
| `due_date` | DATE | Payment due date (ISO format: YYYY-MM-DD) |
| `issue_date` | DATE | Document issue date (ISO format: YYYY-MM-DD) |
| `insights` | JSONB | Full Gemini API response (flexible structure for querying) |
| `created_at` | TIMESTAMP | Auto-set to current time |
| `updated_at` | TIMESTAMP | Auto-updated on any record modification |

### Indexes

- **document_type**: Fast filtering by document classification
- **provider**: Search by company name
- **created_at**: Sort documents by creation date
- **due_date**: Find upcoming bills
- **file_name**: Unique constraint ensures no duplicate uploads
- **insights (JSONB GIN)**: Fast full-text search in AI response data

## Usage in Next.js

### In API Routes (Server-side)

```typescript
// pages/api/save-document.ts
import { supabaseAdmin } from '@/supabase/client';

export default async function handler(req, res) {
  const { file_name, document_type, insights } = req.body;

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert([
      {
        file_name,
        document_type,
        provider: insights.detected_fields?.provider,
        amount: insights.detected_fields?.total_amount,
        currency: insights.detected_fields?.currency,
        due_date: insights.detected_fields?.due_date,
        issue_date: insights.detected_fields?.issue_date,
        insights,
      },
    ])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}
```

### In React Components (Client-side)

```typescript
// components/DocumentList.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import type { Document } from '@/supabase/client';

export default function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    async function loadDocuments() {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      setDocuments(data || []);
    }

    loadDocuments();
  }, []);

  return (
    <div>
      {documents.map((doc) => (
        <div key={doc.id}>
          <h3>{doc.file_name}</h3>
          <p>{doc.document_type}</p>
          <p>{doc.insights?.summary_hebrew}</p>
        </div>
      ))}
    </div>
  );
}
```

## Hebrew Support

All text columns (`file_name`, `provider`, `currency`, `document_type`) use UTF-8 encoding by default in PostgreSQL 12+. Hebrew text will be stored and retrieved correctly without any additional configuration.

## Row-Level Security (RLS)

The migration includes commented-out RLS policies. If using Supabase Auth, uncomment and customize them:

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
ON documents FOR SELECT
USING (auth.uid() = user_id);
```

(Note: Add a `user_id` UUID column linked to `auth.users(id)` if implementing per-user documents)

## Troubleshooting

### Migration Failed

1. Check **Supabase Dashboard** → **Database** → **Logs** for error details
2. Ensure your user role has sufficient permissions
3. Try running the migration again through the SQL Editor

### Can't Connect to Database

1. Verify credentials in `.env.local`
2. Check firewall and IP allowlist in Project Settings
3. Ensure database is running (pause/resume in Project Settings if needed)

### UTF-8 Issues

- PostgreSQL 12+ uses UTF-8 by default
- If issues persist, run: `ALTER DATABASE postgres SET client_encoding = UTF8;`

## Next Steps

1. Update `/pages/api/analyze.ts` to save documents to the database after Gemini analysis
2. Create a Dashboard component to query and display stored documents
3. Add search/filter functionality using JSONB queries on the `insights` column
