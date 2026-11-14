'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils/cn'

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

/** Relative deadlines are resolved in the browser so statically rendered pages never show a stale timer. */
function resolveEnd(endsAt: Date | string, now: number): number {
  if (endsAt === 'midnight' || endsAt === 'end-of-week') {
    const d = new Date(now)
    if (endsAt === 'end-of-week') d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
    d.setHours(23, 59, 59, 0)
    return d.getTime()
  }
  return new Date(endsAt).getTime()
}

/**
 * Counts down to `endsAt` (a date, ISO string, or 'midnight' / 'end-of-week' in the shopper's timezone).
 * Renders a stable placeholder on the server to avoid hydration mismatch.
 */
export function Countdown({
  endsAt,
  tone = 'light',
  compact,
  className,
}: {
  endsAt: Date | string | 'midnight' | 'end-of-week'
  tone?: 'light' | 'dark'
  compact?: boolean
  className?: string
}) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const p = now === null ? null : parts(resolveEnd(endsAt, now) - now)
  const units = [
    { k: 'd', label: 'Days', v: p?.d },
    { k: 'h', label: 'Hrs', v: p?.h },
    { k: 'm', label: 'Mins', v: p?.m },
    { k: 's', label: 'Secs', v: p?.s },
  ].filter((u) => !(compact && u.k === 'd' && !p?.d))

  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      role="timer"
      aria-label={p ? `Ends in ${p.d} days ${p.h} hours ${p.m} minutes` : 'Deal countdown'}
    >
      {units.map((u, i) => (
        <div key={u.k} className="flex items-center gap-1.5" aria-hidden>
          <span
            className={cn(
              'grid min-w-11 place-items-center rounded-md px-1.5 py-1 text-center',
              tone === 'light' ? 'bg-white/95 text-ink-900' : 'bg-ink-900 text-white',
            )}
          >
            <span className="font-display text-lg font-bold tabular-nums leading-none">
              {u.v === undefined ? '--' : String(u.v).padStart(2, '0')}
            </span>
            {!compact && <span className="mt-0.5 text-[0.625rem] font-medium uppercase opacity-70">{u.label}</span>}
          </span>
          {i < units.length - 1 && <span className="font-bold opacity-70">:</span>}
        </div>
      ))}
    </div>
  )
}
