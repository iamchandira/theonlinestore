'use client'

import { IconCash, IconCreditCard, IconGift, IconRosetteDiscountCheck, IconTruckDelivery } from '@tabler/icons-react'
import { useRef } from 'react'

import { site } from '@/config/site'
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/motion/gsap'

const icons = [IconTruckDelivery, IconCash, IconCreditCard, IconRosetteDiscountCheck, IconGift]

/** Infinite GSAP marquee of store promises. Pauses on hover/focus; static when reduced motion is on. */
export function AnnouncementBar() {
  const track = useRef<HTMLDivElement>(null)

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

  const items = site.announcements.map((text, i) => {
    const Icon = icons[i % icons.length]
    return (
      <li key={i} className="flex shrink-0 items-center gap-2 px-6">
        <Icon size={16} className="text-sunset-300" aria-hidden />
        <span>{text}</span>
      </li>
    )
  })

  return (
    <div className="relative z-50 overflow-hidden bg-ink-900 text-[0.8125rem] font-medium text-white">
      <p className="sr-only">{site.announcements.join('. ')}</p>
      <div ref={track} className="flex w-max py-2" aria-hidden>
        <ul className="flex">{items}</ul>
        <ul className="flex">{items}</ul>
      </div>
    </div>
  )
}
