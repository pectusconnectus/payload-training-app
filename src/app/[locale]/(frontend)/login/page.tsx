'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import React, { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { Surface } from '@/components/ui/surface'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function LoginPage() {
  const t = useTranslations('login')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/clients/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.errors?.[0]?.message || t('invalidCredentials'))
        return
      }
      // Payload sets the payload-token cookie for us, so we can go straight to the dashboard.
      router.push('/')
      router.refresh()
    } catch {
      setError(t('genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-6">
      <ThemeToggle className="absolute top-5 right-5 sm:top-6 sm:right-6" />
      <Surface as="form" className="w-full max-w-sm p-6 sm:p-8" onSubmit={onSubmit}>
        <div className="mb-6 flex justify-center">
          <Logo className="h-24 w-auto" />
        </div>
        <h1 className="text-xl font-semibold text-ui-fg-base">{t('title')}</h1>
        <p className="mt-1 mb-6 text-sm text-ui-fg-muted">{t('subtitle')}</p>

        {error && <Alert className="mb-4">{error}</Alert>}

        <Field label={t('emailLabel')} htmlFor="email" className="mb-4">
          <Input
            className="w-full"
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label={t('passwordLabel')} htmlFor="password" className="mb-4">
          <Input
            className="w-full"
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Button className="mt-2 w-full" type="submit" disabled={loading}>
          {loading ? t('loggingIn') : t('button')}
        </Button>
      </Surface>
    </div>
  )
}
