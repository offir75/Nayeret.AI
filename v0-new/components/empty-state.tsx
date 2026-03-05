"use client"

import { motion } from "framer-motion"

const suggestedSearches = [
  "ארנונה",
  "דרכון",
  "ביטוח רכב",
  "חשבון חשמל",
  "חוזה שכירות",
]

interface EmptyStateProps {
  onSuggestedSearch: (term: string) => void
}

export function EmptyState({ onSuggestedSearch }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="flex flex-col items-center px-5 pb-32 pt-8 md:px-8"
    >
      {/* Zen illustration - concentric circles with a leaf */}
      <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
        {/* Ripple rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.15 - i * 0.04, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.5 + i * 0.2 }}
            className="absolute rounded-full border border-primary/30"
            style={{
              width: `${80 + i * 40}px`,
              height: `${80 + i * 40}px`,
            }}
          />
        ))}
        {/* Center icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.4 }}
          className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-primary/8"
        >
          {/* Leaf SVG */}
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            className="text-primary"
          >
            <path
              d="M12 2C6.5 2 2 6.5 2 12c0 5 4 9.5 10 10-.5-1-1-2.5-1-4.5 0-3 2-5.5 2-8.5 0-2-1-4-1-7z"
              fill="currentColor"
              opacity="0.15"
            />
            <path
              d="M12 2c0 3 1 5 1 7 0 3-2 5.5-2 8.5 0 2 .5 3.5 1 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M12 2C17.5 2 22 6.5 22 12c0 5-4 9.5-10 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M12 2C6.5 2 2 6.5 2 12c0 5 4 9.5 10 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
            {/* Small vein lines */}
            <path
              d="M12 8c2 1 4 2.5 5 4.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M12 8c-2 1-4 2.5-5 4.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M11 13c-1.5 1.5-2.5 3.5-3 5.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M13 13c1.5 1.5 2.5 3.5 3 5.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.3"
            />
          </svg>
        </motion.div>
        {/* Floating dots */}
        {[
          { x: 12, y: 20, delay: 1.0 },
          { x: -18, y: 55, delay: 1.3 },
          { x: 50, y: 45, delay: 1.1 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.3, scale: 1 }}
            transition={{ duration: 0.8, delay: dot.delay }}
            className="absolute h-1.5 w-1.5 rounded-full bg-primary/50"
            style={{ top: dot.y, right: dot.x }}
          />
        ))}
      </div>

      {/* Message */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mb-2 text-center text-base font-bold text-foreground text-balance"
      >
        {"הכספת שלך מוכנה"}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="mb-8 max-w-[280px] text-center text-sm leading-relaxed text-muted-foreground text-pretty"
      >
        {"שחררו את החשבון או התמונה הראשונים למעלה כדי להתחיל."}
      </motion.p>

      {/* Suggested searches */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="w-full max-w-sm"
      >
        <p className="mb-3 text-center text-xs font-semibold text-muted-foreground/70">
          {"חיפושים מומלצים"}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {suggestedSearches.map((term, i) => (
            <motion.button
              key={term}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 1.0 + i * 0.08 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSuggestedSearch(term)}
              className="rounded-full bg-card px-4 py-2 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/60 transition-colors hover:bg-secondary hover:ring-primary/30"
            >
              {term}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
