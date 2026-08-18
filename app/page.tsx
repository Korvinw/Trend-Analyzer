'use client'

import { useState } from 'react'
import { TopBar } from '@/components/top-bar'
import { TrendFeed } from '@/components/trend-feed'
import { Methodology } from '@/components/methodology'

export default function Page() {
  const [view, setView] = useState<'trends' | 'methodology'>('trends')
  const [search, setSearch] = useState('')

  return (
    <div className="min-h-dvh bg-background">
      <TopBar active={view} onNavigate={setView} search={search} onSearchChange={setSearch} />

      <main className="mx-auto max-w-[1240px] px-4 py-6 md:px-8 md:py-8">
        {view === 'trends' ? <TrendFeed search={search} /> : <Methodology />}
      </main>
    </div>
  )
}
