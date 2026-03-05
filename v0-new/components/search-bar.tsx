"use client"

import { Search, Sparkles, X } from "lucide-react"
import { motion } from "framer-motion"

interface SearchBarProps {
  query: string
  onQueryChange: (q: string) => void
}

export function SearchBar({ query, onQueryChange }: SearchBarProps) {
  const isActive = query.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-5 pt-8 md:px-8"
    >
      <div className="mx-auto max-w-2xl">
        <div
          className={`flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-lg ring-1 transition-shadow ${
            isActive
              ? "shadow-xl ring-primary/40"
              : "ring-border/60 focus-within:shadow-xl focus-within:ring-primary/30"
          }`}
        >
          {/* Search icon — end of row in RTL (visually on the right) */}
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={'חפש בכספת (למשל, "חשבון בזק 2025" או "דרכון")'}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            dir="rtl"
          />
          {isActive ? (
            <button
              onClick={() => onQueryChange("")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
              aria-label="AI Search"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
