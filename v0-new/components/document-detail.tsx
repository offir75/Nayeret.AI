"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  FileText,
  Calendar,
  DollarSign,
  Tag,
  StickyNote,
  Save,
  Share2,
  CheckCircle2,
} from "lucide-react"
import { useState } from "react"
import type { DocumentData } from "@/lib/documents"

interface DocumentDetailProps {
  document: DocumentData | null
  isOpen: boolean
  onClose: () => void
}

export function DocumentDetail({ document, isOpen, onClose }: DocumentDetailProps) {
  const [editedAmount, setEditedAmount] = useState("")
  const [editedDate, setEditedDate] = useState("")
  const [note, setNote] = useState("")
  const [isSaved, setIsSaved] = useState(false)

  function handleOpen() {
    if (document) {
      setEditedAmount(document.amount || "")
      setEditedDate(document.date)
      setNote(document.note || "")
      setIsSaved(false)
    }
  }

  function handleSave() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(20)
    }
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && document && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
          />
          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onAnimationComplete={() => handleOpen()}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92vh] max-w-2xl overflow-y-auto rounded-t-3xl bg-card shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-2">
              <h2 className="text-base font-bold text-foreground">{"פרטי מסמך"}</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Document icon + name */}
            <div className="flex items-center gap-3 px-5 pb-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: document.iconBg }}
              >
                <document.icon className="h-5 w-5" style={{ color: document.iconColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-bold text-foreground"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                >
                  {document.filename}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{document.summary}</p>
              </div>
            </div>

            <div className="mx-5 h-px bg-border" />

            {/* Editable fields */}
            <div className="space-y-4 px-5 py-5">
              {/* Amount */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  {"סכום"}
                </label>
                <input
                  type="text"
                  value={editedAmount}
                  onChange={(e) => setEditedAmount(e.target.value)}
                  placeholder={"הוסף סכום..."}
                  className="w-full rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  dir="ltr"
                />
              </div>

              {/* Date */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {"תאריך"}
                </label>
                <input
                  type="text"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground ring-1 ring-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  dir="rtl"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  {"קטגוריה"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {["חשבון", "דרכון", "חוזה", "רפואי", "אחר"].map((cat) => (
                    <button
                      key={cat}
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground ring-1 ring-border/60 transition-colors hover:bg-primary hover:text-primary-foreground hover:ring-primary"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Summary */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  {"סיכום AI"}
                </label>
                <p className="rounded-xl bg-secondary/60 px-4 py-3 text-sm leading-relaxed text-foreground ring-1 ring-border/40">
                  {document.summary}
                </p>
              </div>

              {/* Free-text Note */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <StickyNote className="h-3.5 w-3.5" />
                  {"הערה אישית"}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={"כתוב הערה אישית... (למשל, \"לבדוק מול חשבון קודם\")"}
                  rows={3}
                  className="w-full resize-none rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Action bar */}
            <div className="flex gap-3 px-5 pb-8 pt-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors"
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {"נשמר"}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {"שמור שינויים"}
                  </>
                )}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground ring-1 ring-border/60 transition-colors hover:bg-accent"
              >
                <Share2 className="h-4 w-4" />
                {"שיתוף"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
