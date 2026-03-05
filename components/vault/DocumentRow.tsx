import React, { useState, useEffect } from 'react';
import { Trash2, FileText } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { supabase } from '@/supabase/browser';
import { useSettings } from '@/lib/context/settings';
import type { VaultDoc } from '@/lib/types';
import { getDueAlert, isLiquid, convertAmount, fmtMoney, SENSITIVE_KEYS } from '@/lib/vault/helpers';
import { translations } from '@/lib/vault/translations';
import { deleteDocument } from '@/lib/services/documents';
import CategoryBadge, { typeConfig } from './CategoryBadge';
import ConfirmDialog from './ConfirmDialog';
import DocumentModal from './DocumentModal';

function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 shadow-lg">
      <span>⚠️ {message}</span>
      <button onClick={onDismiss} className="text-destructive/60 hover:text-destructive font-bold leading-none">×</button>
    </div>
  );
}

function PrivateValue({ value }: { value: string }) {
  const { privacyMode } = useSettings();
  if (!privacyMode) return <>{value}</>;
  return (
    <span className="blur-sm hover:blur-none transition-[filter] duration-200 cursor-pointer select-none" title="Hover to reveal">
      {value}
    </span>
  );
}

function getValidationStatus(doc: VaultDoc): 'verified' | 'unsure' | 'missing' {
  const ra = doc.raw_analysis ?? {};
  if (ra.is_media) return 'unsure';
  if (!doc.summary_he && !doc.summary_en) return 'missing';
  switch (doc.document_type) {
    case 'bill':           if (!ra.total_amount && !ra.provider) return 'missing'; if (!ra.due_date) return 'unsure'; break;
    case 'financial_report': if (!ra.total_balance) return 'unsure'; break;
    case 'receipt':        if (!ra.total_amount && !ra.merchant) return 'missing'; break;
    case 'claim':          if (!ra.total_amount && !ra.insurer) return 'missing'; break;
    case 'insurance':      if (!ra.insurer && !ra.policy_number) return 'missing'; break;
    case 'identification': if (!ra.id_number && !ra.full_name) return 'missing'; break;
  }
  return 'verified';
}

function ValidationDot({ doc }: { doc: VaultDoc }) {
  const { lang } = useSettings();
  const status = getValidationStatus(doc);
  const cfg = {
    verified: { cls: 'bg-zen-sage',   tip: lang === 'he' ? 'מאומת'    : 'Verified'     },
    unsure:   { cls: 'bg-zen-warm',   tip: lang === 'he' ? 'לא בטוח'  : 'AI Unsure'    },
    missing:  { cls: 'bg-destructive', tip: lang === 'he' ? 'חסר מידע' : 'Missing Data' },
  }[status];
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.cls}`} title={cfg.tip} />;
}

export const DocumentRow = React.memo(function DocumentRow({
  doc, token, onDelete, expanded, onToggle, hasInsurance,
}: {
  doc: VaultDoc; token: string; onDelete: (id: string) => void;
  expanded: boolean; onToggle: () => void; hasInsurance: boolean;
}) {
  const { lang, alertDays, currency, privacyMode } = useSettings();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [imgError, setImgError] = useState(false);

  const ra = doc.raw_analysis ?? {};
  const dueAlert = doc.document_type === 'bill' ? getDueAlert(ra.due_date, alertDays) : null;
  const liquid = isLiquid(doc);
  const isPotentialClaim = doc.document_type === 'receipt' && hasInsurance;
  const symbol = currency === 'ILS' ? '₪' : '$';
  const summary = lang === 'he' ? doc.summary_he : doc.summary_en;

  const amount = (() => {
    const raw = Number(ra.total_amount ?? ra.total_balance);
    if (isNaN(raw) || raw === 0) return null;
    return fmtMoney(convertAmount(raw, String(ra.currency ?? 'ILS'), currency), symbol);
  })();

  const dueDateStr = (() => {
    const d = ra.due_date ?? ra.purchase_date ?? ra.claim_date ?? ra.liquidity_date;
    if (!d || typeof d !== 'string') return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const metaEntries = Object.entries(ra).filter(([key, v]) => v !== null && v !== undefined && v !== '' && key !== 'is_media');

  const dots: Array<{ cls: string; tip: string }> = [];
  if (dueAlert === 'overdue')  dots.push({ cls: 'bg-destructive', tip: lang === 'he' ? 'באיחור' : 'Overdue' });
  if (dueAlert === 'due-soon') dots.push({ cls: 'bg-zen-warm',    tip: lang === 'he' ? 'בקרוב'  : 'Due Soon' });
  if (liquid)                  dots.push({ cls: 'bg-yellow-400',  tip: lang === 'he' ? 'נזילות' : 'Liquidity' });
  if (isPotentialClaim)        dots.push({ cls: 'bg-violet-500',  tip: lang === 'he' ? 'תביעה'  : 'Claim' });

  const rowCls = liquid
    ? 'bg-zen-warm/5 hover:bg-zen-warm/10'
    : dueAlert === 'overdue'
    ? 'bg-destructive/5 hover:bg-destructive/10'
    : expanded
    ? 'bg-secondary/50'
    : 'hover:bg-secondary/30';

  const handleDeleteClick = (e: React.MouseEvent) => { e.stopPropagation(); setShowConfirm(true); };

  const confirmDelete = async () => {
    setShowConfirm(false);
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      await deleteDocument(doc.id, token);
      onDelete(doc.id);
    } catch {
      setDeleteError(translations.deleteFailMsg[lang]);
      setDeleting(false);
    }
  };

  const hasThumbnail = !!doc.thumbnail_url && !imgError;
  const { emoji } = typeConfig(doc.document_type);

  return (
    <>
      {showConfirm && <ConfirmDialog filename={doc.file_name} onConfirm={confirmDelete} onCancel={() => setShowConfirm(false)} />}
      {deleteError && <ErrorToast message={deleteError} onDismiss={() => setDeleteError(null)} />}
      {showModal && <DocumentModal doc={doc} token={token} onClose={() => setShowModal(false)} />}

      <TableRow className={`cursor-pointer transition-all duration-200 border-b border-border/50 ${rowCls}`} onClick={onToggle}>
        {/* Filename + Thumbnail with HoverCard */}
        <TableCell className="py-4">
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg bg-secondary border border-border overflow-hidden flex-shrink-0 cursor-zoom-in"
                  onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                >
                  {hasThumbnail ? (
                    <img src={doc.thumbnail_url!} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-base select-none">{emoji}</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[160px]" title={doc.file_name}>{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(doc.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </HoverCardTrigger>
            {hasThumbnail && (
              <HoverCardContent side="left" align="start" className="w-72 p-0 overflow-hidden rounded-xl border-border shadow-lg">
                <div className="relative aspect-[4/3] bg-secondary">
                  <img src={doc.thumbnail_url!} alt={`תצוגה מקדימה: ${doc.file_name}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zen-stone/80 to-transparent p-3">
                    <p className="text-xs text-white/90 font-medium">{doc.file_name}</p>
                  </div>
                </div>
                <div className="p-3 bg-card">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{summary}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <CategoryBadge type={doc.document_type} />
                    {amount && <span className="text-[10px] text-muted-foreground tabular-nums">{amount}</span>}
                  </div>
                </div>
              </HoverCardContent>
            )}
          </HoverCard>
        </TableCell>

        {/* Category */}
        <TableCell className="py-4">
          <div className="flex items-center gap-1.5">
            <CategoryBadge type={doc.document_type} />
            <ValidationDot doc={doc} />
          </div>
        </TableCell>

        {/* Amount */}
        <TableCell className="py-4 hidden sm:table-cell">
          <span className="text-sm tabular-nums text-foreground font-medium">
            {amount ? (privacyMode ? <PrivateValue value={amount} /> : amount) : <span className="text-muted-foreground/40">—</span>}
          </span>
        </TableCell>

        {/* Due Date */}
        <TableCell className="py-4 hidden sm:table-cell">
          <span className="text-sm text-muted-foreground">{dueDateStr ?? <span className="text-muted-foreground/40">—</span>}</span>
        </TableCell>

        {/* Uploaded */}
        <TableCell className="py-4 hidden sm:table-cell">
          <span className="text-sm text-muted-foreground tabular-nums">
            {new Date(doc.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </TableCell>

        {/* Status dots */}
        <TableCell className="text-center py-4">
          <div className="flex items-center justify-center gap-1">
            {dots.length > 0
              ? dots.map((dot, i) => <span key={i} className={`inline-block w-2.5 h-2.5 rounded-full ${dot.cls}`} title={dot.tip} />)
              : <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
            }
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded row */}
      {expanded && (
        <TableRow className="border-b border-border/50">
          <TableCell colSpan={6} className="p-0">
            <div className="bg-secondary/30 border-t border-border/30">
              <div className="p-6 max-w-3xl ms-0 me-auto w-full overflow-hidden" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                {ra.is_media ? (
                  <div className="mb-5 text-start">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">{translations.mediaDescription[lang]}</h4>
                    <p className="text-sm text-muted-foreground italic mb-1">{translations.mediaNote[lang]}</p>
                    {(doc.summary_he || doc.summary_en) && (
                      <p className="text-sm text-foreground leading-relaxed break-words">
                        {lang === 'he' ? (doc.summary_he || doc.summary_en) : (doc.summary_en || doc.summary_he)}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {summary && (
                      <div className="mb-5 text-start">
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">{translations.tableSummary[lang]}</h4>
                        <p className="text-sm text-foreground leading-relaxed break-words">{summary}</p>
                      </div>
                    )}
                    {metaEntries.length > 0 && (
                      <div className="mb-5 text-start">
                        <h4 className="text-xs font-medium text-muted-foreground mb-3">{translations.tableDetails[lang]}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {metaEntries.map(([key, value]) => {
                            const rawStr = String(value);
                            const isMoney = SENSITIVE_KEYS.has(key) && !isNaN(Number(value));
                            let displayStr = rawStr;
                            if (isMoney) {
                              displayStr = fmtMoney(convertAmount(Number(value), String(ra.currency ?? 'ILS'), currency), symbol);
                            }
                            return (
                              <div key={key} className="bg-card rounded-lg border border-border/50 p-3 text-start min-w-0">
                                <p className="text-[10px] text-muted-foreground tracking-wide mb-1 break-words">{key.replace(/_/g, ' ')}</p>
                                <p className="text-sm font-medium text-foreground break-words">
                                  {SENSITIVE_KEYS.has(key) ? <PrivateValue value={displayStr} /> : displayStr}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive gap-1.5 text-xs"
                    onClick={handleDeleteClick}
                    disabled={deleting}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleting ? translations.deletingDoc[lang] : translations.deleteDoc[lang]}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {translations.viewDoc[lang]}
                  </Button>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
