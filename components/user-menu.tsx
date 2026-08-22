'use client'

import { useState } from 'react'
import { LogOut, Coins, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { AuthModal } from './auth-modal'

export function UserMenu() {
  const { user, loading, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')

  if (loading) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => { setAuthMode('login'); setAuthOpen(true) }}
          className="h-8 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Войти
        </button>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialMode={authMode} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Credits badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground">
          <Coins className="size-3.5 text-amber-500" aria-hidden />
          {user.credits}
        </span>

        {/* User menu */}
        <div className="relative group">
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted px-2 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <User className="size-3.5" aria-hidden />
            <span className="max-w-[100px] truncate">{user.email}</span>
          </button>

          {/* Dropdown */}
          <div className="invisible absolute right-0 top-full z-40 mt-1 w-48 rounded-lg border border-border bg-background py-1 shadow-lg transition-opacity group-hover:visible">
            <div className="border-b border-border px-3 py-2">
              <p className="text-[12px] text-muted-foreground">Кредиты</p>
              <p className="flex items-center gap-1 text-[14px] font-semibold">
                <Coins className="size-3.5 text-amber-500" aria-hidden />
                {user.credits} аналитик{user.credits === 1 ? 'а' : user.credits >= 2 && user.credits <= 4 ? 'и' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="size-3.5" aria-hidden />
              Выйти
            </button>
          </div>
        </div>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialMode={authMode} />
    </>
  )
}
