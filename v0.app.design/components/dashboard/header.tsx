"use client"

import { Settings, ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
      {/* Right side (start in RTL): brand */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          Nayeret<span className="text-zen-sage">.AI</span>
        </span>
        <span className="text-xs text-muted-foreground">מנהל מסמכים חכם</span>
      </div>

      {/* Left side (end in RTL): actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="default"
          className="bg-zen-sage text-accent-foreground hover:bg-zen-sage/90 gap-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          <span>הוסף מסמכים</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
        <div className="w-9 h-9 rounded-full bg-zen-sage/20 flex items-center justify-center text-xs font-medium text-zen-stone">
          א
        </div>
        <button className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-muted-foreground hover:bg-border transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
