'use client'

import { useState } from 'react'
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

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    const fn = mode === 'login' ? login : signup
    const result = await fn(email, password)

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else if (result.message) {
      setMessage(result.message)
    } else {
      onOpenChange(false)
      setEmail('')
      setPassword('')
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError('')
    setMessage('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {mode === 'login' ? 'Вход' : 'Регистрация'}
        </h2>

        {error && (
          <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-[13px] font-medium text-foreground">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1 block text-[13px] font-medium text-foreground">
              Пароль
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-9 w-full rounded-lg bg-primary text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting
              ? '...'
              : mode === 'login'
                ? 'Войти'
                : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button type="button" onClick={switchMode} className="text-primary hover:underline">
            {mode === 'login' ? 'Зарегистрируйтесь' : 'Войдите'}
          </button>
        </p>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
