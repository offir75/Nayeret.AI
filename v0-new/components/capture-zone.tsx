"use client"

import { Camera, Image as ImageIcon, FolderOpen, Upload } from "lucide-react"
import { motion } from "framer-motion"
import { useIsMobile } from "@/hooks/use-mobile"

const mobileActions = [
  {
    icon: Camera,
    label: "מצלמה",
    sublabel: "צלם מסמך",
    primary: true,
  },
  {
    icon: ImageIcon,
    label: "גלריה",
    sublabel: "בחר תמונה",
    primary: false,
  },
  {
    icon: FolderOpen,
    label: "קבצים",
    sublabel: "עיון בקבצים",
    primary: false,
  },
]

export function CaptureZone() {
  const isMobile = useIsMobile()

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="px-5 md:px-8"
    >
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        {"העלאת מסמכים"}
      </h2>
      {isMobile ? (
        <div className="grid grid-cols-3 gap-3">
          {mobileActions.map((action) => (
            <motion.button
              key={action.label}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-5 transition-colors ${
                action.primary
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <action.icon className={`h-7 w-7 ${action.primary ? "text-primary" : ""}`} />
              <div className="text-center">
                <p className="text-sm font-semibold">{action.label}</p>
                <p className="text-[10px] text-muted-foreground">{action.sublabel}</p>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <motion.div
          whileHover={{ borderColor: "var(--primary)" }}
          className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card p-12 transition-all hover:bg-secondary/50"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">
              {"גרור קבצים לכאן או לחץ להעלאה"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {"PDF, תמונות, מסמכים סרוקים"}
            </p>
          </div>
        </motion.div>
      )}
    </motion.section>
  )
}
