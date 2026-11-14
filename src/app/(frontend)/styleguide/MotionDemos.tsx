'use client'

import { IconRefresh } from '@tabler/icons-react'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { fadeUp, scaleIn, stagger } from '@/lib/motion/variants'

/** Replayable samples of the motion vocabulary (Framer for UI state, GSAP for timelines). */
export function MotionDemos() {
  const [run, setRun] = useState(0)
  const gsapRoot = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.from('[data-demo-bar]', { scaleX: 0, transformOrigin: 'left center', duration: 0.9, stagger: 0.08, ease: 'expo.out' })
    },
    { scope: gsapRoot, dependencies: [run], revertOnUpdate: true },
  )

  return (
    <div className="flex flex-col gap-6">
      <Button variant="outline" size="sm" className="w-fit" onClick={() => setRun((n) => n + 1)}>
        <IconRefresh size={16} /> Replay
      </Button>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="mb-3 text-sm font-semibold">Framer: fade-up stagger (entrances)</p>
          <motion.ul key={run} initial="hidden" animate="show" variants={stagger(0.08)} className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.li key={i} variants={fadeUp} className="h-6 rounded bg-sunset-100" />
            ))}
          </motion.ul>
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="mb-3 text-sm font-semibold">Framer: scale-in + spring (feedback)</p>
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <motion.div key={`${run}-${i}`} variants={scaleIn} initial="hidden" animate="show" transition={{ delay: i * 0.1 }} whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }} className="size-16 rounded-xl bg-sunset-deep shadow-glow" />
            ))}
          </div>
        </div>
        <div ref={gsapRoot} className="rounded-lg border border-line bg-surface p-5">
          <p className="mb-3 text-sm font-semibold">GSAP: timeline (hero, scroll stories)</p>
          <div className="flex flex-col gap-2">
            {[90, 70, 50, 30].map((w) => (
              <div key={w} data-demo-bar className="h-6 rounded bg-ink-900" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
