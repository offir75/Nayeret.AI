import { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { useSettings } from '@/lib/context/settings';
import type { VaultDoc, DocumentType } from '@/lib/types';
import { translations } from '@/lib/vault/translations';
import { updateDocument } from '@/lib/services/documents';
import {
  DOC_TYPES, DOC_TYPE_LABELS, EDITABLE_FIELDS, FIELD_META, initDrafts,
  getInsightFields, labelFromKey,
} from '@/lib/vault/fieldMeta';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonField() {
  return (
    <div className="animate-pulse space-y-1.5">
      <div className="h-2.5 w-20 bg-white/10 rounded" />
      <div className="h-9 w-full bg-white/10 rounded-lg" />
    </div>
  );
}

// ─── DocumentModal ────────────────────────────────────────────────────────────

interface Props {
  doc: VaultDoc;
  token: string;
  onClose: () => void;
  onUpdate: (updated: VaultDoc) => void;
}

export default function DocumentModal({ doc, token, onClose, onUpdate }: Props) {
  const { lang } = useSettings();
  const displayName = doc.original_filename ?? doc.file_name;
  const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
  const fileUrl = `/api/file?id=${doc.id}&t=${encodeURIComponent(token)}`;

  // ── Viewer state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const [viewerLoaded, setViewerLoaded] = useState(false);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [typeDraft, setTypeDraft] = useState<DocumentType>(doc.document_type);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => initDrafts(doc.raw_analysis, doc.insights));
  const [notesDraft, setNotesDraft] = useState(doc.user_notes ?? '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const isProcessing = !doc.raw_analysis;

  const isDirty = useMemo(() => {
    if (typeDraft !== doc.document_type) return true;
    if (notesDraft !== (doc.user_notes ?? '')) return true;
    const ra = doc.raw_analysis ?? {};
    return Object.entries(drafts).some(([key, val]) => val !== (ra[key] != null ? String(ra[key]) : ''));
  }, [drafts, notesDraft, typeDraft, doc]);

  // ── Keyboard close ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const rawPatch: Record<string, unknown> = {};
      for (const key of EDITABLE_FIELDS[typeDraft] ?? []) {
        rawPatch[key] = drafts[key] === '' ? null : drafts[key];
      }
      const updated = await updateDocument(doc.id, {
        user_notes: notesDraft,
        document_type: typeDraft,
        raw_analysis: rawPatch,
      }, token);
      onUpdate(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // ── Field renderer ──────────────────────────────────────────────────────────
  function renderField(key: string) {
    const meta = FIELD_META[key];

    const label = meta ? meta[lang] : labelFromKey(key);
    const val = drafts[key] ?? '';
    const ra = doc.raw_analysis ?? {};
    const original = ra[key] != null ? String(ra[key]) : '';
    const isModified = val !== original;
    const isAiExtracted = original !== '';

    const ringCls =
      isModified && val !== ''
        ? 'ring-1 ring-blue-400/50'
        : isAiExtracted
        ? 'ring-1 ring-zen-sage/40'
        : '';

    const inputBase = `w-full bg-zinc-800 text-white text-sm px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-zen-sage/60 transition-colors placeholder-white/20 ${ringCls}`;

    const input =
      meta?.type === 'currency' ? (
        <select
          value={val}
          onChange={e => setDrafts(prev => ({ ...prev, [key]: e.target.value }))}
          className={`${inputBase} cursor-pointer`}
        >
          <option value="">—</option>
          <option value="ILS">₪ ILS</option>
          <option value="USD">$ USD</option>
          <option value="EUR">€ EUR</option>
        </select>
      ) : (
        <input
          type={meta?.type === 'date' ? 'date' : meta?.type === 'number' ? 'number' : 'text'}
          value={val}
          onChange={e => setDrafts(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder={isAiExtracted ? original : '—'}
          step={meta?.type === 'number' ? 'any' : undefined}
          className={inputBase}
        />
      );

    return (
      <div key={key} className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-medium text-white/50 uppercase tracking-wide">{label}</label>
          {isModified && val !== '' && (
            <span className="text-[9px] text-blue-400 font-semibold uppercase tracking-wide">edited</span>
          )}
          {isAiExtracted && !isModified && (
            <span className="text-[9px] text-zen-sage/70 font-semibold uppercase tracking-wide">AI</span>
          )}
        </div>
        {input}
      </div>
    );
  }

  // ── Edit panel ──────────────────────────────────────────────────────────────
  const insightFields = getInsightFields(doc.insights ?? doc.raw_analysis);
  const currentFields = insightFields.length > 0 ? insightFields : (EDITABLE_FIELDS[typeDraft] ?? []);

  const editPanel = (
    <div className="flex flex-col h-full" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

        {/* Document Type */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-white/50 uppercase tracking-wide">
            {translations.documentType[lang]}
          </label>
          <select
            value={typeDraft}
            onChange={e => setTypeDraft(e.target.value as DocumentType)}
            className="w-full bg-zinc-800 text-white text-sm px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-zen-sage/60 transition-colors cursor-pointer"
          >
            {DOC_TYPES.map(t => (
              <option key={t} value={t}>{DOC_TYPE_LABELS[t][lang]}</option>
            ))}
          </select>
        </div>

        {/* Extracted / editable fields */}
        <div>
          <p className="text-[11px] font-medium text-white/50 uppercase tracking-wide mb-3">
            {translations.extractedFields[lang]}
          </p>
          {isProcessing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-white/40 mb-1">
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin flex-shrink-0" />
                {translations.processingOcr[lang]}
              </div>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonField key={i} />)}
            </div>
          ) : currentFields.length === 0 ? (
            <p className="text-sm text-white/30 italic">{translations.noFieldsExtracted[lang]}</p>
          ) : (
            <div className="space-y-4">
              {currentFields.map(key => renderField(key))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-white/50 uppercase tracking-wide">
            {translations.userNotes[lang]}
          </label>
          <textarea
            value={notesDraft}
            onChange={e => setNotesDraft(e.target.value)}
            rows={4}
            placeholder={translations.userNotesPlaceholder[lang]}
            className="w-full bg-zinc-800 text-white text-sm px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-zen-sage/60 resize-none placeholder-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Save footer */}
      <div className="px-4 py-4 border-t border-white/10 flex-shrink-0">
        <button
          onClick={handleSave}
          disabled={!isDirty || saveStatus === 'saving'}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            saveStatus === 'saved'
              ? 'bg-zen-sage text-white'
              : saveStatus === 'error'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : isDirty
              ? 'bg-zen-sage hover:bg-zen-sage/90 active:bg-zen-sage/80 text-white'
              : 'bg-zinc-800 text-white/25 cursor-not-allowed'
          }`}
        >
          {saveStatus === 'saving' && (
            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {saveStatus === 'saved' && <Check className="w-4 h-4" />}
          {saveStatus === 'error' && <AlertCircle className="w-4 h-4" />}
          {saveStatus === 'saving'
            ? translations.saving[lang]
            : saveStatus === 'saved'
            ? translations.savedConfirm[lang]
            : saveStatus === 'error'
            ? translations.saveError[lang]
            : translations.saveChanges[lang]}
        </button>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-white/10 flex-shrink-0 gap-3">
        <h2 className="text-sm font-semibold text-white min-w-0 flex-1 break-words line-clamp-2 leading-snug" title={displayName}>
          {displayName}
        </h2>

        {/* Mobile tab switcher */}
        <div className="flex sm:hidden bg-zinc-800 rounded-lg p-0.5 flex-shrink-0">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'view' ? 'bg-zinc-600 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {translations.tabView[lang]}
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'edit' ? 'bg-zinc-600 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {isDirty ? '● ' : ''}{translations.tabEdit[lang]}
          </button>
        </div>

        <button
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors flex-shrink-0"
          aria-label={translations.closeViewer[lang]}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Viewer panel */}
        <div className={`relative flex-col overflow-hidden flex-1 ${activeTab === 'edit' ? 'hidden sm:flex' : 'flex'}`}>
          {!viewerLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 pointer-events-none">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-sm text-white/70">{translations.viewerLoading[lang]}</p>
            </div>
          )}
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={displayName}
              className={`w-full h-full border-0 transition-opacity duration-300 ${viewerLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setViewerLoaded(true)}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <img
                src={fileUrl}
                alt={displayName}
                className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${viewerLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setViewerLoaded(true)}
                onError={() => setViewerLoaded(true)}
              />
            </div>
          )}
        </div>

        {/* Edit panel */}
        <div className={`bg-zinc-900 border-s border-white/10 overflow-hidden flex-col sm:w-80 lg:w-96 ${activeTab === 'view' ? 'hidden sm:flex' : 'flex w-full'}`}>
          {editPanel}
        </div>
      </div>
    </div>
  );
}
