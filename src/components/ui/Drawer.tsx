'use client'

import { IconX } from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { lockScroll, unlockScroll } from '@/lib/motion/SmoothScroll'
import { backdrop, drawerRight, sheetUp } from '@/lib/motion/variants'
import { cn } from '@/lib/utils/cn'

import { IconButton } from './IconButton'

type DrawerProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** right = side drawer (cart); bottom = mobile sheet (quick add, filters); left = mobile menu */
  side?: 'right' | 'bottom' | 'left'
  children: ReactNode
  footer?: ReactNode
  className?: string
}

const drawerLeft = {
  hidden: { x: '-100%' },
  show: { x: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 30 } },
  exit: { x: '-100%', transition: { duration: 0.25 } },
}

/**
 * Accessible modal drawer / bottom sheet: focus moves in, Escape closes,
 * Tab is trapped inside, body scroll is locked, focus returns to the trigger on close.
 */
export function Drawer({ open, onClose, title, side = 'right', children, footer, className }: DrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  // Keep the latest onClose without re-running the open/close effect on every render
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement as HTMLElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    lockScroll()
    const t = window.setTimeout(() => panelRef.current?.focus(), 30)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = overflow
      unlockScroll()
      document.removeEventListener('keydown', onKey)
      returnFocus.current?.focus?.()
    }
  }, [open])

  if (typeof document === 'undefined') return null

  const variants = side === 'bottom' ? sheetUp : side === 'left' ? drawerLeft : drawerRight

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
            variants={backdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            variants={variants}
            initial="hidden"
            animate="show"
            exit="exit"
            drag={side === 'bottom' ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (side === 'bottom' && (info.offset.y > 120 || info.velocity.y > 600)) onClose()
            }}
            className={cn(
              'absolute flex flex-col bg-surface outline-none',
              side === 'right' && 'inset-y-0 right-0 w-full max-w-[440px] shadow-drawer',
              side === 'left' && 'inset-y-0 left-0 w-[88%] max-w-[380px] shadow-drawer',
              side === 'bottom' && 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[24px] shadow-drawer',
              className,
            )}
          >
            {side === 'bottom' && <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-ink-200" aria-hidden />}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3">
              <h2 id={titleId} className="font-display text-lg font-bold">
                {title}
              </h2>
              <IconButton label="Close" icon={<IconX size={22} />} onClick={onClose} className="-mr-2" />
            </div>
            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
            {footer && <div className="shrink-0 border-t border-line bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
