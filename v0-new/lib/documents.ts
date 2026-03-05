import { Receipt, BookOpen, FileText } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface DocumentData {
  id: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  filename: string
  summary: string
  amount?: string
  date: string
  category: "recent" | "all"
  note?: string
  isPaid?: boolean
}

export const documents: DocumentData[] = [
  {
    id: "bezeq-jan-2025",
    icon: Receipt,
    iconColor: "#6b7c52",
    iconBg: "rgba(107, 124, 82, 0.1)",
    filename: "חשבון בזק - ינואר 2025",
    summary:
      'חשבון טלפון חודשי. סכום לתשלום ₪189.90 עד 15/02/2025. כולל שיחות בינלאומיות.',
    amount: "₪189.90",
    date: "15 ינואר 2025",
    category: "recent",
    note: "",
    isPaid: false,
  },
  {
    id: "passport-sinai",
    icon: BookOpen,
    iconColor: "#7a6e5a",
    iconBg: "rgba(122, 110, 90, 0.1)",
    filename: "דרכון - סיני כהן",
    summary: "דרכון ישראלי. תוקף עד 03/2029. מספר דרכון: 35982710.",
    date: "12 ינואר 2025",
    category: "recent",
    note: "",
    isPaid: undefined,
  },
  {
    id: "rent-contract",
    icon: FileText,
    iconColor: "#9a7e54",
    iconBg: "rgba(154, 126, 84, 0.1)",
    filename: "חוזה שכירות - דירה",
    summary:
      "חוזה שכירות לתקופה של 12 חודשים. שכר דירה חודשי ₪4,500. תחילת חוזה 01/03/2025.",
    amount: "₪4,500",
    date: "8 ינואר 2025",
    category: "recent",
    note: "",
    isPaid: true,
  },
  {
    id: "arnona-2024",
    icon: Receipt,
    iconColor: "#6b7c52",
    iconBg: "rgba(107, 124, 82, 0.1)",
    filename: "ארנונה - רבעון 4 2024",
    summary: "שובר תשלום ארנונה עירייה. סכום ₪2,340 לרבעון אחרון.",
    amount: "₪2,340",
    date: "1 דצמבר 2024",
    category: "all",
    note: "שולם דרך אתר העירייה",
    isPaid: true,
  },
  {
    id: "health-insurance",
    icon: FileText,
    iconColor: "#9a7e54",
    iconBg: "rgba(154, 126, 84, 0.1)",
    filename: "פוליסת ביטוח בריאות",
    summary: "פוליסת ביטוח משלים מכבי. תוקף עד 12/2025. מספר פוליסה: 8834521.",
    date: "20 נובמבר 2024",
    category: "all",
    note: "",
    isPaid: false,
  },
]
