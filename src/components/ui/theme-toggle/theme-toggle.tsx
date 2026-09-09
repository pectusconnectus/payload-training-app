'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React, { useEffect, useState } from 'react'
import { joinClasses } from '@/lib/class-names'

/**
 * Switches between the light and dark palettes by toggling the `dark` class on
 * <html>, and remembers the choice in localStorage under `theme`.
 *
 * The class itself is applied before first paint by the inline script in the
 * root layout, so the button only has to stay in sync with it. That is why the
 * initial state is read in an effect rather than during render: on the server
 * there is no DOM to read, and guessing would cause a hydration mismatch.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('nav')
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      /* private mode or blocked storage — the choice just will not persist */
    }
    setIsDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('toggleTheme')}
      title={t('toggleTheme')}
      className={joinClasses(
        'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-ui-border-base bg-ui-bg-component text-ui-fg-muted transition-colors hover:border-ui-border-interactive hover:text-ui-fg-interactive focus-visible:border-ui-border-interactive focus-visible:ring-2 focus-visible:ring-ui-border-interactive/20',
        className,
      )}
    >
      {/* Before mount we do not know the theme yet; render the icon invisibly so
          the button keeps its size and the layout does not shift. */}
      <span className={mounted ? undefined : 'opacity-0'}>
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
    </button>
  )
}
