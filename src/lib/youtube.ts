/**
 * Turns a YouTube link a coach pasted into the catalogue into a URL that can be
 * put in an <iframe>, or null when the link is not a YouTube video.
 *
 * Coaches paste whatever the share button gives them, so all the usual shapes
 * are accepted: watch?v=, youtu.be/, /shorts/, /embed/, /live/, with or without
 * a start time. Anything else (Vimeo, a PDF, a blog post) returns null and the
 * caller falls back to rendering a plain link.
 */

/** `t`/`start` accept both raw seconds ("90") and the "1h2m30s" shorthand. */
function parseStartSeconds(value: string | null): number | null {
  if (!value) return null

  if (/^\d+$/.test(value)) {
    const seconds = Number(value)
    return seconds > 0 ? seconds : null
  }

  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i)
  if (!match || !match.slice(1).some(Boolean)) return null

  const [hours, minutes, seconds] = match.slice(1).map((part) => Number(part ?? 0) || 0)
  const total = hours * 3600 + minutes * 60 + seconds
  return total > 0 ? total : null
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'])
const PATH_WITH_ID = /^\/(?:embed|shorts|v|live)\/([^/?#]+)/

export function getYouTubeEmbedUrl(raw?: string | null): string | null {
  if (!raw) return null

  let parsed: URL
  try {
    parsed = new URL(raw.trim())
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
  let id: string | null = null

  if (host === 'youtu.be') {
    id = parsed.pathname.slice(1).split('/')[0] || null
  } else if (YOUTUBE_HOSTS.has(host)) {
    id = parsed.pathname === '/watch' ? parsed.searchParams.get('v') : (parsed.pathname.match(PATH_WITH_ID)?.[1] ?? null)
  }

  // Video ids are always 11 characters of [A-Za-z0-9_-]; checking this keeps a
  // malformed link from becoming an iframe that renders a YouTube error page.
  if (!id || !/^[\w-]{11}$/.test(id)) return null

  const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
  const start = parseStartSeconds(parsed.searchParams.get('t') ?? parsed.searchParams.get('start'))
  if (start) params.set('start', String(start))

  // youtube-nocookie.com is YouTube's own privacy-enhanced host: it does not set
  // tracking cookies until the visitor actually presses play.
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
}
