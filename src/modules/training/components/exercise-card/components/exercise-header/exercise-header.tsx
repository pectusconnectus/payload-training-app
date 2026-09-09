'use client'

import { useTranslations } from 'next-intl'
import React, { useState } from 'react'
import { mutedTextClass } from '@/lib/class-names'
import { getYouTubeEmbedUrl } from '@/lib/youtube'

export function ExerciseHeader({
  numer,
  name,
  videoUrl,
}: {
  numer?: string | null
  name: string
  videoUrl?: string | null
}) {
  const t = useTranslations('exercise')
  const [playerOpen, setPlayerOpen] = useState(false)

  const embedUrl = getYouTubeEmbedUrl(videoUrl)

  return (
    <div className="break-words text-sm text-ui-fg-base">
      <div>
        {numer ? <span className={`inline-block min-w-7 font-semibold ${mutedTextClass}`}>{numer}</span> : null}
        {name}

        {/* A YouTube link opens inline, so the athlete never leaves the workout
            mid-set. Anything else stays an ordinary outbound link. */}
        {embedUrl ? (
          <button
            type="button"
            onClick={() => setPlayerOpen((open) => !open)}
            aria-expanded={playerOpen}
            className="ml-2 cursor-pointer whitespace-nowrap text-xs text-ui-fg-interactive transition-colors hover:text-ui-fg-interactive-hover"
          >
            {playerOpen ? t('hideVideo') : t('video')}
          </button>
        ) : (
          videoUrl && (
            <a
              className="ml-2 whitespace-nowrap text-xs text-ui-fg-interactive"
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('video')}
            </a>
          )
        )}
      </div>

      {/* Mounted only once opened: a workout can list a dozen exercises, and a
          dozen eagerly-loaded YouTube players would be a slow page on mobile. */}
      {embedUrl && playerOpen && (
        <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg border border-ui-border-base bg-black">
          <iframe
            src={embedUrl}
            title={name}
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}
    </div>
  )
}
