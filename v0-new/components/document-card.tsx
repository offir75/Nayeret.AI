"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  MoreVertical,
  MessageCircle,
  StickyNote,
  CheckCircle,
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { DocumentData } from "@/lib/documents"
import { documents as allDocuments } from "@/lib/documents"
import { EmptyState } from "./empty-state"

type Tab = "recent" | "all" | "categories"

const tabs: { id: Tab; label: string }[] = [
  { id: "recent", label: "אחרונים" },
  { id: "all", label: "הכל" },
  { id: "categories", label: "קטגוריות" },
]

const categories = [
  { label: "חשבונות", count: 2 },
  { label: "מסמכים אישיים", count: 1 },
  { label: "חוזים", count: 1 },
  { label: "ביטוח", count: 1 },
]

/* ── Quick-action dropdown ── */
function QuickActions({
  isOpen,
  onClose,
  onAddNote,
  doc,
}: {
  isOpen: boolean
  onClose: () => void
  onAddNote: () => void
  doc: DocumentData
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const actions = [
    {
      icon: MessageCircle,
      label: "שיתוף ב-WhatsApp",
      color: "text-foreground",
      handler: () => {
        const text = `${doc.filename}\n${doc.summary}${doc.amount ? `\nסכום: ${doc.amount}` : ""}`
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text)}`,
          "_blank"
        )
        onClose()
      },
    },
    {
      icon: StickyNote,
      label: "הוסף הערה",
      color: "text-foreground",
      handler: () => {
        onAddNote()
        onClose()
      },
    },
    {
      icon: CheckCircle,
      label: doc.isPaid ? "בטל סימון שולם" : "סמן כשולם",
      color: doc.isPaid ? "text-muted-foreground" : "text-primary",
      handler: () => {
        onClose()
      },
    },
  ]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute start-0 top-8 z-30 w-52 overflow-hidden rounded-xl bg-card shadow-xl ring-1 ring-border/60"
    >
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.handler}
          className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm transition-colors hover:bg-secondary"
        >
          <action.icon className={`h-4 w-4 shrink-0 ${action.color}`} />
          <span className={`font-medium ${action.color}`}>{action.label}</span>
        </button>
      ))}
    </motion.div>
  )
}

/* ── Document Card ── */
function DocumentCard({
  doc,
  delay,
  onOpen,
}: {
  doc: DocumentData
  delay: number
  onOpen: (doc: DocumentData) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative"
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onOpen(doc)}
        className="flex w-full gap-3 rounded-xl bg-card p-4 text-start shadow-sm ring-1 ring-border/60 transition-shadow hover:shadow-md"
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: doc.iconBg }}
        >
          <doc.icon className="h-5 w-5" style={{ color: doc.iconColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {/* RTL-safe filename truncation: direction ltr + text-right
                keeps the .pdf extension visible when truncated */}
            <p
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground"
              dir="ltr"
              style={{ textAlign: "right" }}
            >
              {doc.filename}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {doc.isPaid && (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {"שולם"}
                </span>
              )}
              {doc.amount && (
                <span
                  className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"
                  dir="ltr"
                >
                  {doc.amount}
                </span>
              )}
            </div>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {doc.summary}
          </p>
          <p className="mt-1.5 text-[10px] font-medium text-muted-foreground/70">
            {doc.date}
          </p>
        </div>
      </motion.button>

      {/* Three-dot menu — use start-3 for RTL-safe positioning */}
      <div className="absolute start-3 top-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Quick actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        <AnimatePresence>
          <QuickActions
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            onAddNote={() => onOpen(doc)}
            doc={doc}
          />
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ── Skeleton ── */
function SkeletonCard({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      className="flex gap-3 rounded-xl bg-card p-4 ring-1 ring-border/60"
    >
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-muted" />
      <div className="flex-1 space-y-2.5">
        <div className="h-3.5 w-3/4 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-full animate-pulse rounded-md bg-muted/70" />
        <div className="h-2.5 w-1/3 animate-pulse rounded-md bg-muted/50" />
      </div>
    </motion.div>
  )
}

/* ── Main DocumentList ── */
export function DocumentList({
  onOpenDocument,
  searchQuery,
  showEmpty = false,
  onSuggestedSearch,
}: {
  onOpenDocument: (doc: DocumentData) => void
  searchQuery: string
  showEmpty?: boolean
  onSuggestedSearch?: (term: string) => void
}) {
  const [activeTab, setActiveTab] = useState<Tab>("recent")

  const isSearching = searchQuery.length > 0

  const filteredDocs = isSearching
    ? allDocuments.filter(
        (d) =>
          d.filename.includes(searchQuery) ||
          d.summary.includes(searchQuery) ||
          (d.amount && d.amount.includes(searchQuery))
      )
    : activeTab === "recent"
      ? allDocuments.filter((d) => d.category === "recent")
      : allDocuments

  // Empty state
  if (showEmpty && !isSearching) {
    return (
      <EmptyState
        onSuggestedSearch={onSuggestedSearch || (() => {})}
      />
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="px-5 pb-28 pt-6 md:px-8"
    >
      {/* Search result header or tabs */}
      {isSearching ? (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {`תוצאות חיפוש (${filteredDocs.length})`}
          </h2>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-1 rounded-xl bg-secondary/60 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Categories view */}
      {activeTab === "categories" && !isSearching ? (
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <motion.button
              key={cat.label}
              whileTap={{ scale: 0.97 }}
              className="flex flex-col items-center gap-1 rounded-xl bg-card p-5 shadow-sm ring-1 ring-border/60 transition-shadow hover:shadow-md"
            >
              <span className="text-sm font-bold text-foreground">
                {cat.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {`${cat.count} מסמכים`}
              </span>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredDocs.map((doc, index) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                delay={isSearching ? index * 0.05 : 0.5 + index * 0.1}
                onOpen={onOpenDocument}
              />
            ))}
          </AnimatePresence>
          {filteredDocs.length === 0 && isSearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center"
            >
              <p className="text-sm text-muted-foreground">
                {"לא נמצאו תוצאות"}
              </p>
            </motion.div>
          )}
          {!isSearching && (
            <>
              <SkeletonCard delay={0.8} />
              <SkeletonCard delay={0.9} />
            </>
          )}
        </div>
      )}
    </motion.section>
  )
}
