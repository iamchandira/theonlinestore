'use client'

import Lenis from 'lenis'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { gsap, prefersReducedMotion, ScrollTrigger } from './gsap'

/**
 * "Butter smooth" scrolling with Lenis, driven by GSAP's ticker so ScrollTrigger animations
 * (hero parallax, marquees) stay frame-perfectly in sync with the scroll.
 *
 * - Desktop wheel/trackpad only. Touch devices keep native momentum scrolling (`syncTouch: false`),
 *   which already feels right on phones and stays fastest.
 * - Off for `prefers-reduced-motion` (we don't even create the instance).
 * - Lenis keeps native scrolling under the hood, so `position: sticky`, `useScroll`, IntersectionObserver
 *   and find-in-page all keep working.
 * - Nested scroll areas (drawers, search suggestions, menus) scroll natively (`allowNestedScroll` +
 *   `data-lenis-prevent`), and `lockScroll()` / `unlockScroll()` pause the page behind modals.
 */

let instance: Lenis | null = null

/** Current Lenis instance (null when disabled: touch-only, reduced motion, or server). */
export const getLenis = () => instance

/** Pause page scrolling (e.g. while a drawer or sheet is open). Safe to call when Lenis is off. */
export const lockScroll = () => instance?.stop()
export const unlockScroll = () => instance?.start()

/** Smoothly scroll to an element or position, falling back to native scrolling when Lenis is off. */
export function scrollToTarget(target: string | HTMLElement | number, offset = -96) {
  if (instance) return instance.scrollTo(target, { offset })
  if (typeof target === 'number') return window.scrollTo({ top: target, behavior: 'smooth' })
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' })
}

export function SmoothScroll() {
  const pathname = usePathname()
  const lastPath = useRef(pathname)

  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({
      lerp: 0.1, // glide amount: lower = floatier. 0.1 feels premium without feeling "slow"
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false, // native momentum on phones and tablets
      allowNestedScroll: true, // drawers, dropdowns and carousels scroll on their own
      anchors: { offset: -96 }, // in-page links glide and clear the sticky header
      stopInertiaOnNavigate: true,
      autoRaf: false, // driven by GSAP's ticker below
    })
    instance = lenis

    // One clock for everything: Lenis + ScrollTrigger update on the same GSAP frame
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(500, 33) // restore GSAP defaults
      lenis.destroy()
      instance = null
    }
  }, [])

  // New page: jump to top instantly (no long glide from the previous page's position)
  // Compares with the previous path (not a "first run" flag): React runs effects twice on mount in
  // development, and a flag made the second run think the page had changed and snap to the top.
  // Reload / back-forward keep the browser's own scroll restoration because the path is unchanged.
  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    instance?.scrollTo(0, { immediate: true, force: true })
  }, [pathname])

  return null
}
