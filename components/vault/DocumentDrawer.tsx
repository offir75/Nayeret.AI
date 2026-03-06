import { useState, useEffect, useRef } from 'react';
import { Drawer } from 'vaul';
import { X, Trash2, Share2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/lib/context/settings';
import type { VaultDoc } from '@/lib/types';
import { typeConfig } from './CategoryBadge';
import { FIELD_META, DOC_TYPES, DOC_TYPE_LABELS, LEGACY_DOC_TYPE_SET, getTypeLabel, getEditableFields, initDrafts, getInsightFields, labelFromKey, normalizeSource } from '@/lib/vault/fieldMeta';
import { deleteDocument, updateDocument } from '@/lib/services/documents';
import { convertAmount, fmtMoney } from '@/lib/vault/helpers';

interface Props {
  doc: VaultDoc | null;
  token: string;
  open: boolean;
  onClose: () => void;
  onUpdate: (updated: VaultDoc) => void;
  onDelete: (id: string) => void;
  onViewFull?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function DocumentDrawer({
  doc, token, open, onClose, onUpdate, onDelete, onViewFull,
  hasPrev, hasNext, onPrev, onNext,
}: Props) {
  const { lang, currency } = useSettings();

  const [drafts, setDrafts]               = useState<Record<string, string>>({});
  const [draftType, setDraftType]         = useState<string>('other');
  const [draftNotes, setDraftNotes]       = useState('');
  const [saveState, setSaveState]         = useState<SaveState>('idle');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  // Touch-swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Reset local state whenever a new doc is opened
  useEffect(() => {
    if (!doc) return;
    setDrafts(initDrafts(doc.raw_analysis, doc.insights));
    setDraftType(doc.document_type);
    setDraftNotes(doc.user_notes ?? '');
    setSaveState('idle');
    setDeleteConfirm(false);
    setDeleting(false);
    setPreviewLoaded(false);
  }, [doc?.id]);

  // Keyboard left / right for navigation (skip when focus is in a text input)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft')  { onPrev?.(); }
      if (e.key === 'ArrowRight') { onNext?.(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onPrev, onNext]);

  if (!doc) return null;

  const hebrewTypeName = (doc.insights?.document_type_name_he ?? doc.raw_analysis?.document_type_name_he) as string | null | undefined;
  const { emoji } = typeConfig(doc.document_type, lang, hebrewTypeName);
  const displayName = doc.original_filename ?? doc.file_name;
  const summary = lang === 'he' ? doc.summary_he : doc.summary_en;
  const normalizedSource = normalizeSource((doc.insights ?? doc.raw_analysis ?? {}) as Record<string, unknown>);
  const insightFields = getInsightFields(normalizedSource);
  const editableKeys = getEditableFields(draftType);
  const fields = editableKeys.length > 0
    ? [...editableKeys, ...insightFields.filter(k => !editableKeys.includes(k))]
    : insightFields;

  const isDirty =
    draftType !== doc.document_type ||
    draftNotes !== (doc.user_notes ?? '') ||
    fields.some(k => (drafts[k] ?? '') !== (normalizedSource[k] != null ? String(normalizedSource[k]) : ''));

  const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
  const fileUrl = `/api/file?id=${doc.id}&t=${encodeURIComponent(token)}`;

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

  // ── Swipe handling ──────────────────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0);
    touchStartX.current = null;
    touchStartY.current = null;
    // Only act on clearly horizontal swipes (more horizontal than vertical, ≥50px)
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0) onPrev?.();
    else        onNext?.();
  };

  // ── Compact field renderer (used in the preview side-column) ─────────────────

  const renderFieldCompact = (key: string) => {
    const meta = FIELD_META[key];
    const label = meta ? (lang === 'he' ? meta.he : meta.en) : labelFromKey(key);
    const isCurrency = meta?.type === 'currency';
    const isDate = meta?.type === 'date';
    const isNumber = meta?.type === 'number';
    const inputCls = 'w-full rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-foreground ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-[#7a8c6e]/40';

    return (
      <div key={key} className="flex flex-col gap-0.5">
        <label className="text-[10px] font-medium leading-none text-muted-foreground">{label}</label>
        {isCurrency ? (
          <select
            value={drafts[key] ?? ''}
            onChange={e => setDrafts(prev => ({ ...prev, [key]: e.target.value }))}
            className={`${inputCls} cursor-pointer`}
            dir="ltr"
          >
            <option value="">—</option>
            <option value="ILS">₪ ILS</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        ) : (
          <input
            type={isDate ? 'date' : isNumber ? 'number' : 'text'}
            dir={isDate || isNumber ? 'ltr' : 'auto'}
            value={drafts[key] ?? ''}
            onChange={e => setDrafts(prev => ({ ...prev, [key]: e.target.value }))}
            onPointerDown={isDate ? e => e.stopPropagation() : undefined}
            onClick={isDate ? e => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch {} } : undefined}
            className={inputCls}
          />
        )}
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
    <>
    <Drawer.Root
      open={open}
      onOpenChange={v => { if (!v) { onClose(); setDeleteConfirm(false); } }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-[#2c2825]/30 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[92vh] max-w-2xl flex-col rounded-t-3xl bg-card outline-none"
          dir={lang === 'he' ? 'rtl' : 'ltr'}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 pt-1 gap-2">
            <h2 className="text-base font-bold text-foreground flex-1">
              {lang === 'he' ? 'פרטי מסמך' : 'Document Details'}
            </h2>

            {/* Prev / Next navigation arrows */}
            {(hasPrev || hasNext) && (
              <div className="flex items-center gap-1 shrink-0" dir="ltr">
                <button
                  onClick={onPrev}
                  disabled={!hasPrev}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors disabled:opacity-25 hover:text-foreground hover:bg-secondary/80"
                  aria-label="Previous document"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors disabled:opacity-25 hover:text-foreground hover:bg-secondary/80"
                  aria-label="Next document"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">

            {/* ── Top section: preview (left in RTL/Hebrew, right in LTR/English) ── */}
            <div className={`mb-5 flex gap-3 ${lang !== 'he' ? 'flex-row-reverse' : ''}`}>

              {/* Document preview — border uses 'border' not 'ring' to avoid scroll-container clipping */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onViewFull}
                className="relative shrink-0 w-[38%] h-56 rounded-2xl overflow-hidden border border-border/40 hover:border-[#7a8c6e]/60 transition-colors bg-secondary flex items-center justify-center"
                aria-label={lang === 'he' ? 'צפה במסמך' : 'View document'}
              >
                {isPdf ? (
                  <iframe
                    src={fileUrl}
                    title={displayName}
                    scrolling="no"
                    className={`w-full h-full border-0 pointer-events-none transition-opacity duration-300 ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setPreviewLoaded(true)}
                  />
                ) : (
                  <img
                    src={fileUrl}
                    alt=""
                    className={`w-full h-full object-cover transition-opacity duration-300 ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setPreviewLoaded(true)}
                    onError={() => setPreviewLoaded(true)}
                  />
                )}

                {/* Animated loading indicator — fades out once content is ready */}
                <AnimatePresence>
                  {!previewLoaded && (
                    <motion.div
                      key="loader"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary"
                    >
                      {/* Shimmer skeleton lines — each row shimmers independently */}
                      <div className="w-2/3 space-y-2">
                        {(['w-full', 'w-5/6', 'w-full', 'w-4/6', 'w-full', 'w-3/4'] as const).map((w, i) => (
                          <div key={i} className={`relative h-1.5 rounded bg-border/50 overflow-hidden ${w}`}>
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', repeatDelay: 0.3 }}
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Right column: filename + compact editable fields */}
              <div className="flex-1 min-w-0 flex flex-col gap-2" dir={lang === 'he' ? 'rtl' : 'ltr'}>

                {/* Filename chip */}
                <div className="flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2">
                  <span className="shrink-0 text-lg leading-none">{emoji}</span>
                  <p
                    className="min-w-0 flex-1 text-xs font-semibold text-foreground break-all leading-snug"
                    dir="ltr"
                    style={{ textAlign: lang === 'he' ? 'right' : 'left' }}
                  >
                    {displayName}
                  </p>
                </div>

                {/* Compact metadata fields */}
                {fields.map(renderFieldCompact)}
              </div>
            </div>

            {/* ── Below: category, AI summary, notes ── */}
            <div className="flex flex-col gap-4">

              {/* Category pills */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {lang === 'he' ? 'קטגוריה' : 'Category'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {/* Free-form taxonomy chip — shown when the stored type isn't a legacy enum value */}
                  {!LEGACY_DOC_TYPE_SET.has(draftType) && (
                    <button
                      key={draftType}
                      onClick={() => setDraftType(draftType)}
                      className="rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors bg-[#7a8c6e] text-white ring-[#7a8c6e]"
                    >
                      {getTypeLabel(draftType, lang, hebrewTypeName)}
                    </button>
                  )}
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

          {/* Action bar — single row: Save · Share · Delete */}
          <div
            className="flex gap-2 border-t border-border/50 px-5 pt-3"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            {/* Save */}
            <motion.button
              whileTap={isDirty ? { scale: 0.97 } : {}}
              onClick={handleSave}
              disabled={!isDirty || saveState === 'saving'}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold text-white transition-colors ${
                saveState === 'saved'  ? 'bg-[#5a7a4a]' :
                saveState === 'error'  ? 'bg-destructive' :
                saveState === 'saving' ? 'bg-[#7a8c6e]/70' :
                isDirty                ? 'bg-[#7a8c6e] active:bg-[#6a7c5e]' :
                'bg-[#7a8c6e]/30 cursor-not-allowed'
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

            {/* Share */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-secondary py-3 text-sm font-medium text-foreground ring-1 ring-border/60 hover:bg-secondary/80 transition-colors"
            >
              <Share2 className="h-4 w-4 shrink-0" />
              {lang === 'he' ? 'שיתוף' : 'Share'}
            </motion.button>

            {/* Delete */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleDelete}
              disabled={deleting}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-medium ring-1 transition-colors ${
                deleteConfirm
                  ? 'bg-destructive text-white ring-destructive'
                  : 'bg-secondary text-destructive ring-border/60 hover:bg-destructive/10'
              }`}
            >
              {deleting
                ? <div className="h-4 w-4 shrink-0 rounded-full border-2 border-current/40 border-t-current animate-spin" />
                : <Trash2 className="h-4 w-4 shrink-0" />}
              {deleting
                ? (lang === 'he' ? 'מוחק...' : 'Deleting...')
                : deleteConfirm
                  ? (lang === 'he' ? 'אשר?' : 'Confirm?')
                  : (lang === 'he' ? 'מחיקה' : 'Delete')}
            </motion.button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>

    </>
  );
}
