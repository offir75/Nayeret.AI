import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, StickyNote, Trash2, Share2 } from 'lucide-react';
import { useSettings } from '@/lib/context/settings';
import type { VaultDoc, Currency } from '@/lib/types';
import { typeConfig } from './CategoryBadge';
import { convertAmount, fmtMoney } from '@/lib/vault/helpers';
import { deleteDocument } from '@/lib/services/documents';

interface VaultCardProps {
  doc: VaultDoc;
  index: number;
  token: string;
  onDelete: (id: string) => void;
  onUpdate: (updated: VaultDoc) => void;
  onOpen: (doc: VaultDoc) => void;
}

function getDisplayAmount(doc: VaultDoc, currency: Currency): string | null {
  const ra = doc.raw_analysis;
  if (!ra) return null;
  const raw = ra.total_amount ?? ra.total_balance ?? ra.premium_amount;
  if (raw == null) return null;
  const n = Number(raw);
  if (isNaN(n) || n <= 0) return null;
  const converted = convertAmount(n, String(ra.currency ?? 'ILS'), currency);
  const symbol = currency === 'USD' ? '$' : '₪';
  return fmtMoney(converted, symbol);
}

function formatDate(dateStr: string, lang: 'he' | 'en'): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const ICON_BG: Record<string, string> = {
  bill:             'bg-zen-sage-light',
  financial_report: 'bg-zen-sage-light',
  receipt:          'bg-zen-warm/20',
  claim:            'bg-destructive/10',
  insurance:        'bg-zen-sage-light',
  identification:   'bg-zen-warm/20',
  other:            'bg-secondary',
};

export default function VaultCard({ doc, index, token, onDelete, onUpdate, onOpen }: VaultCardProps) {
  const { lang, currency, privacyMode } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hebrewName = doc.insights?.document_type_name_he as string | null | undefined;
  const { label, emoji } = typeConfig(doc.document_type, lang, hebrewName);
  const displayName = doc.original_filename ?? doc.file_name;
  const summary = lang === 'he' ? doc.summary_he : doc.summary_en;
  const amount = getDisplayAmount(doc, currency);
  const date = formatDate(doc.created_at, lang);
  const bgClass = ICON_BG[doc.document_type] ?? 'bg-secondary';

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleShare = () => {
    const text = `${displayName}\n${summary ?? ''}${amount ? `\n${amount}` : ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!window.confirm(lang === 'he' ? 'למחוק מסמך זה?' : 'Delete this document?')) return;
    try {
      await deleteDocument(doc.id, token);
      onDelete(doc.id);
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.07, 0.4) }}
      className="relative"
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onOpen(doc)}
        className="flex w-full gap-3 rounded-xl bg-card p-4 text-start shadow-sm ring-1 ring-border/60 transition-shadow hover:shadow-md"
      >
        {/* Type icon */}
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${bgClass}`}>
          {emoji}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground"
              dir="ltr"
              style={{ textAlign: 'right' }}
            >
              {displayName}
            </p>
            {amount && (
              <span
                className="shrink-0 rounded-md bg-zen-sage/10 px-2 py-0.5 text-xs font-bold text-zen-sage"
                dir="ltr"
              >
                {privacyMode ? '••••' : amount}
              </span>
            )}
          </div>

          {summary && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {summary}
            </p>
          )}

          <div className="mt-1.5 flex items-center gap-1.5">
            <p className="text-[10px] font-medium text-muted-foreground/70">{date}</p>
            <span className="text-muted-foreground/40">·</span>
            <p className="text-[10px] font-medium text-muted-foreground/70">{label}</p>
          </div>
        </div>
      </motion.button>

      {/* Three-dot menu — start-3 is RTL-safe (visually top-right in RTL) */}
      <div ref={menuRef} className="absolute start-3 top-3 z-10">
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={lang === 'he' ? 'פעולות' : 'Actions'}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute start-0 top-8 w-52 overflow-hidden rounded-xl bg-card shadow-xl ring-1 ring-border"
            >
              <button
                onClick={() => { onOpen(doc); setMenuOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <StickyNote className="h-4 w-4 shrink-0" />
                <span className="font-medium">{lang === 'he' ? 'פרטים ועריכה' : 'Details & Edit'}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-start text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <Share2 className="h-4 w-4 shrink-0" />
                <span className="font-medium">{lang === 'he' ? 'שיתוף ב-WhatsApp' : 'Share via WhatsApp'}</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-start text-sm text-destructive transition-colors hover:bg-secondary"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span className="font-medium">{lang === 'he' ? 'מחיקה' : 'Delete'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
