'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: 'login' | 'signup'
}

export function AuthModal({ open, onOpenChange, initialMode = 'login' }: AuthModalProps) {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) { setMode(initialMode); setError(''); setMessage('') }
  }, [open, initialMode])

  useEffect(() => {
    if (!open) { setEmail(''); setPassword(''); setError(''); setMessage('') }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setMessage(''); setSubmitting(true)
    const fn = mode === 'login' ? login : signup
    const result = await fn(email, password)
    setSubmitting(false)
    if (result.error) setError(result.error)
    else if (result.message) setMessage(result.message)
    else onOpenChange(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onOpenChange(false) }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >X</button>
        <h2 className="mb-1 text-lg font-semibold">
          {mode === 'login' ? '\u0412\u0445\u043e\u0434' : '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f'}
        </h2>
        <p className="mb-4 text-[13px] text-muted-foreground">
          {mode === 'login'
            ? '\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0430\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0432\u0438\u0434\u0435\u043e \u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0442\u044c \u0438\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435'
            : '\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044c \u2014 \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u0435 5 \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0445 \u0430\u043d\u0430\u043b\u0438\u0437\u043e\u0432'}
        </p>
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[13px] text-green-700">
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-[13px] font-medium">Email</label>
            <input id="auth-email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus
              className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-[14px] placeholder:text-muted-foreground focus:border-ring focus:outline-none" />
          </div>
          <div>
            <label htmlFor="auth-password" className="mb-1 block text-[13px] font-medium">
              {'\u041f\u0430\u0440\u043e\u043b\u044c'}
            </label>
            <input id="auth-password" type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={'\u041c\u0438\u043d\u0438\u043c\u0443\u043c 6 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432'}
              className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-[14px] placeholder:text-muted-foreground focus:border-ring focus:outline-none" />
          </div>
          <button type="submit" disabled={submitting}
            className="h-10 w-full rounded-lg bg-primary text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
            {submitting ? '...' : mode === 'login' ? '\u0412\u043e\u0439\u0442\u0438' : '\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f'}
          </button>
        </form>
        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          {mode === 'login' ? '\u041d\u0435\u0442 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430?' : '\u0423\u0436\u0435 \u0435\u0441\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442?'}{' '}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
            className="font-medium text-primary hover:underline">
            {mode === 'login' ? '\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044c' : '\u0412\u043e\u0439\u0434\u0438\u0442\u0435'}
          </button>
        </p>
      </div>
    </div>
  )
}
