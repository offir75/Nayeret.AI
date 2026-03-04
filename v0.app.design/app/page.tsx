"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { SearchBar } from "@/components/dashboard/search-bar"
import { DocumentTable } from "@/components/dashboard/document-table"

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col gap-6">
          <SummaryCards />
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <DocumentTable searchQuery={searchQuery} />
        </div>

        {/* Subtle footer */}
        <div className="mt-12 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            {"Nayeret.AI \u00B7 \u05DE\u05E0\u05D4\u05DC \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD \u05D7\u05DB\u05DD"}
          </p>
        </div>
      </main>
    </div>
  )
}
