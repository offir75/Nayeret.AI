"use client"

import { TrendingUp, Receipt } from "lucide-react"

export function SummaryCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Total Assets */}
      <div className="group relative bg-card rounded-xl border border-border p-6 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">{"סה\"כ נכסים"}</p>
            <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {"\u20AA475,026.00"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">בכל הדוחות הפיננסיים</p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zen-sage/10 flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-zen-sage" />
          </div>
        </div>
      </div>

      {/* Bills to Pay */}
      <div className="group relative bg-card rounded-xl border border-border p-6 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">חשבונות לתשלום</p>
            <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {"\u20AA567.75"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {"כל החשבונות יחד \u00B7 שער 1 דולר = 3.7 ש\"ח"}
            </p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zen-warm/10 flex-shrink-0">
            <Receipt className="w-5 h-5 text-zen-warm" />
          </div>
        </div>
      </div>
    </div>
  )
}
