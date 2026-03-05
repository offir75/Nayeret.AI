"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { CaptureZone } from "@/components/capture-zone"
import { IngestionHub } from "@/components/ingestion-hub"
import { DocumentList } from "@/components/document-card"
import { SearchBar } from "@/components/search-bar"
import { DocumentDetail } from "@/components/document-detail"
import type { DocumentData } from "@/lib/documents"

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  /* Toggle to true to preview the empty vault state */
  const [showEmpty] = useState(false)

  function handleOpenDocument(doc: DocumentData) {
    setSelectedDoc(doc)
    setDetailOpen(true)
  }

  function handleCloseDetail() {
    setDetailOpen(false)
    setTimeout(() => setSelectedDoc(null), 300)
  }

  function handleSuggestedSearch(term: string) {
    setSearchQuery(term)
  }

  return (
    <div className="relative mx-auto min-h-svh max-w-2xl bg-background">
      <Header />
      <main>
        <CaptureZone />
        <IngestionHub />
        <DocumentList
          onOpenDocument={handleOpenDocument}
          searchQuery={searchQuery}
          showEmpty={showEmpty}
          onSuggestedSearch={handleSuggestedSearch}
        />
      </main>
      <SearchBar query={searchQuery} onQueryChange={setSearchQuery} />
      <DocumentDetail
        document={selectedDoc}
        isOpen={detailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  )
}
