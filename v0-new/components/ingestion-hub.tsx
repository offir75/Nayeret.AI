"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useEffect, useState, useCallback } from "react"

const steps = [
  { text: "מנתח חשבון בזק...", textEn: "Analyzing Bezeq Bill..." },
  { text: "מחלץ נתוני דרכון...", textEn: "Extracting Passport Data..." },
  { text: "מזהה סכומים ותאריכים...", textEn: "Detecting Amounts & Dates..." },
]

function triggerHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([30, 50, 80])
  }
}

export function IngestionHub() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const handleComplete = useCallback(() => {
    setIsComplete(true)
    triggerHaptic()
    setTimeout(() => {
      setIsComplete(false)
      setCurrentStep(0)
    }, 2500)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          handleComplete()
          return prev
        }
        return prev + 1
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [handleComplete])

  const progress = isComplete
    ? 100
    : ((currentStep + 1) / steps.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="sticky top-0 z-40 mx-5 mt-4 rounded-xl bg-secondary/80 backdrop-blur-md px-4 py-3 md:mx-8 ring-1 ring-border/40"
    >
      <AnimatePresence mode="wait">
        {isComplete ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            </motion.div>
            <p className="text-sm font-medium text-primary">
              {"העיבוד הושלם בהצלחה"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-3"
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {steps[currentStep].text}
              </p>
              <p className="truncate text-xs text-muted-foreground" dir="ltr">
                {steps[currentStep].textEn}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-border/60">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  )
}
