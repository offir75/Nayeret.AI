export type Lang = 'he' | 'en';
export type Currency = 'ILS' | 'USD';
export type DocumentType = 'bill' | 'financial_report' | 'receipt' | 'claim' | 'insurance' | 'identification' | 'other';
export type SortCol = 'name' | 'category' | 'amount' | 'due_date' | 'uploaded';

export interface VaultDoc {
  id: string;
  file_name: string;
  document_type: string;
  ui_category: string | null;
  summary_he: string | null;
  summary_en: string | null;
  raw_analysis: Record<string, unknown> | null;
  insights: Record<string, unknown> | null;
  thumbnail_url: string | null;
  created_at: string;
  user_notes: string | null;
  original_filename: string | null;
}

export interface UpdateDocumentPayload {
  id: string;
  user_notes?: string;
  document_type?: string;
  raw_analysis?: Record<string, unknown>;
  summary_he?: string;
  summary_en?: string;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

export interface DuplicateDocInfo {
  id: string;
  file_name: string;
  document_type: string;
  thumbnail_url: string | null;
}

export interface SemanticMatchInfo {
  id: string;
  file_name: string;
  original_filename: string | null;
  document_type: string;
}

export interface UploadApiResponse {
  isDuplicate: boolean;
  existingDoc?: DuplicateDocInfo;
  success?: boolean;
}

export interface AppSettings {
  lang: Lang;
  privacyMode: boolean;
  alertDays: number;
  currency: Currency;
}

export interface UploadJob {
  id: string;
  originalFile: File;
  resolvedName: string;
  status: 'queued' | 'analyzing' | 'done' | 'error' | 'cancelled';
  errorMsg?: string;
}

export interface AnalyzeApiResponse {
  success: boolean;
  filename: string;
  summary_he: string | null;
  summary_en: string | null;
  document_group: string;
  document_type: DocumentType;
  raw_metadata: Record<string, unknown> | null;
  supabaseId: string | null;
  is_media?: boolean;
  semanticMatch?: SemanticMatchInfo | null;
  new_type_created?: boolean;
}

export interface DocumentsApiResponse {
  documents: VaultDoc[];
}
