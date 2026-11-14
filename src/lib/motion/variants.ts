import type { Transition, Variants } from 'motion/react'

/**
 * Motion tokens. Rules (docs/05-brand-and-design-system.md › Motion):
 *  - micro-interactions 150–250ms, entrances 400–700ms, ease-out
 *  - never block input; never animate layout-affecting properties on load (CLS < 0.1)
 */
export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
}

export const duration = {
  micro: 0.18,
  fast: 0.25,
  base: 0.45,
  slow: 0.7,
}

export const spring: Record<'snappy' | 'soft' | 'bouncy', Transition> = {
  snappy: { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 },
  soft: { type: 'spring', stiffness: 260, damping: 30 },
  bouncy: { type: 'spring', stiffness: 420, damping: 18 },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.base, ease: ease.out } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: duration.base, ease: ease.out } },
}

export const stagger = (staggerChildren = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
})

/** Right-side drawer (cart, filters on desktop). */
export const drawerRight: Variants = {
  hidden: { x: '100%' },
  show: { x: 0, transition: spring.soft },
  exit: { x: '100%', transition: { duration: duration.fast, ease: ease.inOut } },
}

/** Bottom sheet (mobile quick-add, filters). */
export const sheetUp: Variants = {
  hidden: { y: '100%' },
  show: { y: 0, transition: spring.soft },
  exit: { y: '100%', transition: { duration: duration.fast, ease: ease.inOut } },
}

export const backdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.fast } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
}

export const dropdown: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: duration.fast, ease: ease.out } },
  exit: { opacity: 0, y: 6, transition: { duration: duration.micro } },
}
