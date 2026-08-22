'use client'

import { Activity, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMenu } from './user-menu'

interface TopBarProps {
  active: 'trends' | 'methodology'
  onNavigate: (target: 'trends' | 'methodology') => void
  search: string
  onSearchChange: (value: string) => void
}

export function TopBar({ active, onNavigate, search, onSearchChange }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 md:px-8">
        {/* Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('trends')}
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-4" aria-hidden />
          </span>
          Trend Analyzer
        </button>

        {/* Nav */}
        <nav className="ml-2 hidden items-center gap-1 sm:flex" aria-label="Основная навигация">
          <NavItem label="Тренды" active={active === 'trends'} onClick={() => onNavigate('trends')} />
          <NavItem
            label="Методология"
            active={active === 'methodology'}
            onClick={() => onNavigate('methodology')}
          />
        </nav>

        {/* Search — subtle / ghost */}
        <div className="ml-auto flex w-full max-w-xs items-center">
          <label className="relative flex w-full items-center">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden />
            <span className="sr-only">Поиск</span>
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Найти автора, тему или ссылку"
              className={cn(
                'h-9 w-full rounded-lg border border-transparent bg-muted pl-9 pr-3 text-[13px]',
                'text-foreground placeholder:text-muted-foreground',
                'transition-colors hover:bg-secondary focus:border-ring focus:bg-surface focus:outline-none',
              )}
            />
          </label>
        </div>

        {/* Auth */}
        <UserMenu />
      </div>
    </header>
  )
}

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      {active && (
        <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-foreground" aria-hidden />
      )}
    </button>
  )
}
