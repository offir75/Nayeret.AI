import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Drawer } from 'vaul';
import { X, Trash2, Share2, CheckCircle2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/lib/context/settings';
import type { VaultDoc, DocumentType } from '@/lib/types';
import { typeConfig } from './CategoryBadge';
import { EDITABLE_FIELDS, FIELD_META, DOC_TYPES, DOC_TYPE_LABELS, initDrafts } from '@/lib/vault/fieldMeta';
import { deleteDocument, updateDocument } from '@/lib/services/documents';
import { convertAmount, fmtMoney } from '@/lib/vault/helpers';

interface Props {
  doc: VaultDoc | null;
  token: string;
  open: boolean;
  onClose: () => void;
  onUpdate: (updated: VaultDoc) => void;
  onDelete: (id: string) => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function DocumentDrawer({ doc, token, open, onClose, onUpdate, onDelete }: Props) {
  const { lang, currency } = useSettings();

  const [drafts, setDrafts]             = useState<Record<string, string>>({});
  const [draftType, setDraftType]       = useState<DocumentType>('other');
  const [draftNotes, setDraftNotes]     = useState('');
  const [saveState, setSaveState]       = useState<SaveState>('idle');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  // Reset local state whenever a new doc is opened
  useEffect(() => {
    if (!doc) return;
    setDrafts(initDrafts(doc.raw_analysis));
    setDraftType(doc.document_type);
    setDraftNotes(doc.user_notes ?? '');
    setSaveState('idle');
    setDeleteConfirm(false);
  }, [doc?.id]);

  if (!doc) return null;

  const { emoji } = typeConfig(doc.document_type, lang);
  const displayName = doc.original_filename ?? doc.file_name;
  const summary = lang === 'he' ? doc.summary_he : doc.summary_en;
  const fields = EDITABLE_FIELDS[draftType] ?? [];

  // Derive a display amount from current drafts for the share message
  const amountKey = fields.find(k => ['total_amount', 'total_balance', 'premium_amount'].includes(k));
  const rawAmt = amountKey ? Number(drafts[amountKey] ?? '') : NaN;
  const displayAmt = !isNaN(rawAmt) && rawAmt > 0
    ? fmtMoney(convertAmount(rawAmt, String(drafts['currency'] || 'ILS'), currency), currency === 'ILS' ? '₪' : '$')
    : null;

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (saveState === 'saving') return;
    setSaveState('saving');
    try {
      // Merge drafts back into raw_analysis
      const newRaw = { ...(doc.raw_analysis ?? {}) };
      fields.forEach(k => { if (drafts[k] !== '') newRaw[k] = drafts[k]; });
      if (draftType !== doc.document_type) newRaw['document_type'] = draftType;

      const updated = await updateDocument(
        doc.id,
        { document_type: draftType, raw_analysis: newRaw, user_notes: draftNotes },
        token,
      );
      onUpdate(updated);
      setSaveState('saved');
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(20);
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2500);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await deleteDocument(doc.id, token);
      onDelete(doc.id);
      onClose();
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  // ── Share ───────────────────────────────────────────────────────────────────

  const handleShare = () => {
    const parts = [displayName, summary ?? '', displayAmt ? displayAmt : ''].filter(Boolean);
    window.open(`https://wa.me/?text=${encodeURIComponent(parts.join('\n'))}`, '_blank');
  };

  // ── Field input renderer ────────────────────────────────────────────────────

  const renderField = (key: string) => {
    const meta = FIELD_META[key];
    if (!meta) return null;
    const label = lang === 'he' ? meta.he : meta.en;
    const isDate = meta.type === 'date';
    const isNumber = meta.type === 'number' || meta.type === 'currency';

    return (
      <div key={key} className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <input
          type={isDate ? 'date' : isNumber ? 'number' : 'text'}
          dir={isDate || isNumber ? 'ltr' : 'auto'}
          value={drafts[key] ?? ''}
          onChange={e => setDrafts(prev => ({ ...prev, [key]: e.target.value }))}
          className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-[#7a8c6e]/40 placeholder:text-muted-foreground/50"
        />
      </div>
    );
  };

  // ── Save button label ───────────────────────────────────────────────────────

  const saveLabel = () => {
    if (saveState === 'saving') return lang === 'he' ? 'שומר...' : 'Saving...';
    if (saveState === 'saved')  return lang === 'he' ? 'נשמר!' : 'Saved!';
    if (saveState === 'error')  return lang === 'he' ? 'שגיאה' : 'Error';
    return lang === 'he' ? 'שמור שינויים' : 'Save Changes';
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={v => { if (!v) { onClose(); setDeleteConfirm(false); } }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-[#2c2825]/30 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[92vh] max-w-2xl flex-col rounded-t-3xl bg-card outline-none"
          dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 pt-1">
            <h2 className="text-base font-bold text-foreground">
              {lang === 'he' ? 'פרטי מסמך' : 'Document Details'}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            {/* Doc identity */}
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
              <span className="text-2xl">{emoji}</span>
              <p
                className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground"
                dir="ltr"
                style={{ textAlign: lang === 'he' ? 'right' : 'left' }}
              >
                {displayName}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Editable fields for this doc type */}
              {fields.map(renderField)}

              {/* Category pills */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {lang === 'he' ? 'קטגוריה' : 'Category'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {DOC_TYPES.map(type => {
                    const active = draftType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setDraftType(type)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${
                          active
                            ? 'bg-[#7a8c6e] text-white ring-[#7a8c6e]'
                            : 'bg-secondary text-muted-foreground ring-border/60 hover:ring-[#7a8c6e]/40'
                        }`}
                      >
                        {DOC_TYPE_LABELS[type][lang]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI summary — read-only */}
              {summary && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {lang === 'he' ? 'סיכום AI' : 'AI Summary'}
                  </label>
                  <p className="rounded-xl bg-[#7a8c6e]/8 px-4 py-3 text-sm leading-relaxed text-foreground ring-1 ring-[#7a8c6e]/20">
                    {summary}
                  </p>
                </div>
              )}

              {/* Personal notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {lang === 'he' ? 'הערות אישיות' : 'Personal Notes'}
                </label>
                <textarea
                  value={draftNotes}
                  onChange={e => setDraftNotes(e.target.value)}
                  rows={3}
                  placeholder={lang === 'he' ? 'הוסף הערה...' : 'Add a note...'}
                  className="w-full resize-none rounded-xl bg-secondary px-4 py-3 text-sm text-foreground ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-[#7a8c6e]/40 placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div
            className="flex flex-col gap-2 border-t border-border/50 px-5 pt-3"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            {/* Save */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-colors ${
                saveState === 'saved'  ? 'bg-[#5a7a4a]' :
                saveState === 'error'  ? 'bg-destructive' :
                saveState === 'saving' ? 'bg-[#7a8c6e]/70' :
                'bg-[#7a8c6e] active:bg-[#6a7c5e]'
              }`}
            >
              <AnimatePresence mode="wait">
                {saveState === 'saved' ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </motion.span>
                ) : null}
              </AnimatePresence>
              {saveLabel()}
            </motion.button>

            {/* Share + Delete row */}
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleShare}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-sm font-medium text-foreground ring-1 ring-border/60 hover:bg-secondary/80 transition-colors"
              >
                <Share2 className="h-4 w-4 shrink-0" />
                {lang === 'he' ? 'שיתוף' : 'Share'}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleDelete}
                disabled={deleting}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium ring-1 transition-colors ${
                  deleteConfirm
                    ? 'bg-destructive text-white ring-destructive'
                    : 'bg-secondary text-destructive ring-border/60 hover:bg-destructive/10'
                }`}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {deleting
                  ? (lang === 'he' ? 'מוחק...' : 'Deleting...')
                  : deleteConfirm
                    ? (lang === 'he' ? 'מחק לצמיתות?' : 'Confirm delete?')
                    : (lang === 'he' ? 'מחיקה' : 'Delete')}
              </motion.button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
