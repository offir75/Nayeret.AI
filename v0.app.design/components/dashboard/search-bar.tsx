"use client"

import { Search } from "lucide-react"
import { useState } from "react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div
      className={`
        relative flex items-center bg-card rounded-xl border transition-all duration-300
        ${focused ? "border-zen-sage shadow-sm" : "border-border"}
      `}
    >
      <Search className="w-4 h-4 text-muted-foreground absolute start-4" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="חיפוש לפי שם קובץ, סוג, או ספק..."
        className="w-full bg-transparent py-3.5 pe-4 ps-10 text-sm text-foreground placeholder:text-muted-foreground outline-none"
      />
    </div>
  )
}
