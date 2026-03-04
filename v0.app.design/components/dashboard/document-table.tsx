"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Document {
  id: string
  name: string
  uploadDate: string
  category: string
  categoryColor: string
  amount: string | null
  dueDate: string | null
  status: "paid" | "pending" | "overdue"
  thumbnail: string
  summary: string
  details: Record<string, string>
}

const documents: Document[] = [
  {
    id: "1",
    name: "ot 2026-03-04 130839.png",
    uploadDate: "04 במרץ 2026",
    category: "אחר",
    categoryColor: "amber",
    amount: null,
    dueDate: null,
    status: "pending",
    thumbnail: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-7r4qZd5AJ5heWvPEldL5MB7mWgyZMb.png",
    summary: "מסמך כללי שהועלה למערכת. טרם סווג באופן מלא.",
    details: {
      "סוג": "תמונה",
      "תאריך העלאה": "2026-03-04",
      "סטטוס": "ממתין לסיווג",
    },
  },
  {
    id: "2",
    name: "חשבון חשמל.png",
    uploadDate: "04 במרץ 2026",
    category: "חשבון",
    categoryColor: "green",
    amount: "\u20AA567.75",
    dueDate: "07 אפריל 2017",
    status: "overdue",
    thumbnail: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-JWrorIVXQYnsmPHBaYbDgBDL4cTStg.png",
    summary: "מסמך זה הוא חשבונית מס/קבלה מחברת החשמל, שהונפקה ללקוח עבור שירותי חשמל שסופקו בין ה-17 בינואר ל-22 במרץ 2017. הסכום הכולל לתשלום עומד על 567.75 ש\"ח עבור 962 קוט\"ש, ויש לשלמו עד ה-7 באפריל 2017, עם אפשרות תשלום בכרטיס אשראי דרך אתר החברה או בטלפון.",
    details: {
      "מטבע": "ILS",
      "תאריך פירעון": "2017-04-07",
      "ספק": "חברת החשמל",
      "סכום כולל": "\u20AA567.75",
      "תשלום אוטומטי": "לא",
    },
  },
  {
    id: "3",
    name: "אנליסט דוח דצמבר 2025.pdf",
    uploadDate: "04 במרץ 2026",
    category: "דוח פיננסי",
    categoryColor: "green",
    amount: "\u20AA475,026.00",
    dueDate: "31 יולי 2025",
    status: "pending",
    thumbnail: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-7r4qZd5AJ5heWvPEldL5MB7mWgyZMb.png",
    summary: "דוח פיננסי שנתי לדצמבר 2025. כולל סיכום נכסים, תשואות, ופילוח השקעות לפי סקטור.",
    details: {
      "מטבע": "ILS",
      "תאריך הפקה": "2025-07-31",
      "ספק": "אנליסט פיננסי",
      "סכום כולל": "\u20AA475,026.00",
    },
  },
]

function getStatusConfig(status: Document["status"]) {
  switch (status) {
    case "paid":
      return { color: "bg-zen-sage", label: "שולם" }
    case "pending":
      return { color: "bg-zen-warm", label: "ממתין" }
    case "overdue":
      return { color: "bg-destructive", label: "באיחור" }
  }
}

function getCategoryStyle(color: string) {
  if (color === "green") return "bg-zen-sage-light text-zen-sage border-zen-sage/20"
  if (color === "amber") return "bg-zen-warm/10 text-zen-warm border-zen-warm/20"
  return "bg-secondary text-secondary-foreground border-border"
}

interface DocumentTableProps {
  searchQuery: string
}

export function DocumentTable({ searchQuery }: DocumentTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const filtered = documents.filter(
    (doc) =>
      doc.name.includes(searchQuery) ||
      doc.category.includes(searchQuery) ||
      (doc.details["ספק"] && doc.details["ספק"].includes(searchQuery))
  )

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-zen-sage" />
    ) : (
      <ChevronDown className="w-3 h-3 text-zen-sage" />
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead>
              <button
                onClick={() => handleSort("name")}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                שם קובץ
                <SortIcon field="name" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("category")}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                קטגוריה
                <SortIcon field="category" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("amount")}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                סכום
                <SortIcon field="amount" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("dueDate")}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                תאריך פירעון
                <SortIcon field="dueDate" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("uploaded")}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                הועלה
                <SortIcon field="uploaded" />
              </button>
            </TableHead>
            <TableHead className="text-center w-20">
              <span className="text-xs font-medium text-muted-foreground">סטטוס</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((doc) => {
            const statusConfig = getStatusConfig(doc.status)
            const isExpanded = expandedRow === doc.id

            return (
              <DocumentRow
                key={doc.id}
                doc={doc}
                statusConfig={statusConfig}
                isExpanded={isExpanded}
                onToggle={() =>
                  setExpandedRow(isExpanded ? null : doc.id)
                }
              />
            )
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-12 text-muted-foreground"
              >
                לא נמצאו מסמכים התואמים את החיפוש
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function DocumentRow({
  doc,
  statusConfig,
  isExpanded,
  onToggle,
}: {
  doc: Document
  statusConfig: { color: string; label: string }
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <TableRow
        className={`
          cursor-pointer transition-all duration-200 border-b border-border/50
          ${isExpanded ? "bg-secondary/50" : "hover:bg-secondary/30"}
        `}
        onClick={onToggle}
      >
        {/* File Name with Hover Preview */}
        <TableCell className="py-4">
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary border border-border overflow-hidden flex-shrink-0">
                  <img
                    src={doc.thumbnail}
                    alt={doc.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {doc.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {doc.uploadDate}
                  </p>
                </div>
              </div>
            </HoverCardTrigger>
            <HoverCardContent
              side="left"
              align="start"
              className="w-72 p-0 overflow-hidden rounded-xl border-border shadow-lg"
            >
              <div className="relative aspect-[4/3] bg-secondary">
                <img
                  src={doc.thumbnail}
                  alt={`תצוגה מקדימה: ${doc.name}`}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zen-stone/80 to-transparent p-3">
                  <p className="text-xs text-white/90 font-medium">{doc.name}</p>
                </div>
              </div>
              <div className="p-3 bg-card">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {doc.summary}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${getCategoryStyle(doc.categoryColor)}`}
                  >
                    {doc.category}
                  </Badge>
                  {doc.amount && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {doc.amount}
                    </span>
                  )}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </TableCell>

        {/* Category */}
        <TableCell className="py-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs px-2.5 py-0.5 rounded-md font-normal ${getCategoryStyle(doc.categoryColor)}`}
            >
              {doc.category}
            </Badge>
          </div>
        </TableCell>

        {/* Amount */}
        <TableCell className="py-4">
          <span className="text-sm tabular-nums text-foreground font-medium">
            {doc.amount || "\u2014"}
          </span>
        </TableCell>

        {/* Due Date */}
        <TableCell className="py-4">
          <span className="text-sm text-muted-foreground">
            {doc.dueDate || "\u2014"}
          </span>
        </TableCell>

        {/* Upload Date */}
        <TableCell className="py-4">
          <span className="text-sm text-muted-foreground">{doc.uploadDate}</span>
        </TableCell>

        {/* Status */}
        <TableCell className="text-center py-4">
          <div className="flex items-center justify-center">
            <div
              className={`w-2.5 h-2.5 rounded-full ${statusConfig.color}`}
              title={statusConfig.label}
            />
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Row Details */}
      {isExpanded && (
        <TableRow className="border-b border-border/50">
          <TableCell colSpan={6} className="p-0">
            <div className="bg-secondary/30 border-t border-border/30">
              <div className="p-6 max-w-3xl me-0 ms-auto">
                {/* Summary */}
                <div className="mb-5 text-right">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">סיכום</h4>
                  <p className="text-sm text-foreground leading-relaxed">{doc.summary}</p>
                </div>

                {/* Details Grid */}
                <div className="mb-5 text-right">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3">פרטים</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(doc.details).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-card rounded-lg border border-border/50 p-3 text-right"
                      >
                        <p className="text-[10px] text-muted-foreground tracking-wide mb-1">
                          {key}
                        </p>
                        <p className="text-sm font-medium text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-start gap-2 pt-2 border-t border-border/30">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive gap-1.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    מחק
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground gap-1.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    צפה במסמך
                  </Button>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
