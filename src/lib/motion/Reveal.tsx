'use client'

import { motion, type HTMLMotionProps } from 'motion/react'

import { fadeUp, stagger } from './variants'

type RevealProps = HTMLMotionProps<'div'> & {
  /** Stagger direct <RevealItem> children instead of animating as one block. */
  staggerChildren?: number
  delay?: number
}

/** Fades content up once when it scrolls into view. Honours reduced motion via <MotionConfig>. */
export function Reveal({ children, staggerChildren, delay = 0, ...rest }: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      variants={staggerChildren ? stagger(staggerChildren, delay) : fadeUp}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem(props: HTMLMotionProps<'div'>) {
  return <motion.div variants={fadeUp} {...props} />
}
