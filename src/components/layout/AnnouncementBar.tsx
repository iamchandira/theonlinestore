'use client'

import { useRef } from 'react'

import { useStoreSettings } from '@/lib/store/StoreSettingsProvider'
import { AnnouncementIcon } from '@/lib/store/announcementIcons'
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/motion/gsap'

/** Infinite GSAP marquee of store promises. Pauses on hover/focus; static when reduced motion is on. */
export function AnnouncementBar() {
  const track = useRef<HTMLDivElement>(null)
  const { announcements } = useStoreSettings()

  useGSAP(
    () => {
      if (!track.current || prefersReducedMotion()) return
      const el = track.current
      const tween = gsap.to(el, { xPercent: -50, ease: 'none', duration: 40, repeat: -1 })
      const pause = () => tween.timeScale(0.0001)
      const play = () => gsap.to(tween, { timeScale: 1, duration: 0.6 })
      el.addEventListener('mouseenter', pause)
      el.addEventListener('mouseleave', play)
      return () => {
        el.removeEventListener('mouseenter', pause)
        el.removeEventListener('mouseleave', play)
      }
    },
    { scope: track },
  )

  // Messages come from Admin › Settings › Store details; no messages, no bar
  if (!announcements.length) return null
  if (announcements.length === 1) {
    return (
      <div className="relative z-50 bg-ink-900 py-2 text-center text-[0.8125rem] font-medium text-white">
        <p className="container-site flex items-center justify-center gap-2">
          <AnnouncementIcon icon={announcements[0].icon} index={0} size={16} className="shrink-0 text-sunset-300" />
          <span>{announcements[0].text}</span>
        </p>
      </div>
    )
  }
  const items = announcements.map(({ text, icon }, i) => (
    <li key={i} className="flex shrink-0 items-center gap-2 px-6">
      <AnnouncementIcon icon={icon} index={i} size={16} className="text-sunset-300" />
      <span>{text}</span>
    </li>
  ))

  return (
    <div className="relative z-50 overflow-hidden bg-ink-900 text-[0.8125rem] font-medium text-white">
      <p className="sr-only">{announcements.map((a) => a.text).join('. ')}</p>
      <div ref={track} className="flex w-max py-2" aria-hidden>
        <ul className="flex">{items}</ul>
        <ul className="flex">{items}</ul>
      </div>
    </div>
  )
}
