'use client'

import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import type { Product } from '@/lib/catalog'
import { fadeUp, stagger } from '@/lib/motion/variants'

import { ProductCard } from './ProductCard'

/**
 * Horizontal product carousel. Touch: native swipe with snap; desktop: arrow buttons + trackpad.
 * Cards stagger in once when the rail scrolls into view.
 */
export function ProductRail({ products, label }: { products: Product[]; label: string }) {
  const [emblaRef, embla] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps', dragFree: true, skipSnaps: true })
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const update = useCallback(() => {
    if (!embla) return
    setCanPrev(embla.canScrollPrev())
    setCanNext(embla.canScrollNext())
  }, [embla])

  useEffect(() => {
    if (!embla) return
    const raf = requestAnimationFrame(update)
    embla.on('select', update).on('reInit', update).on('scroll', update)
    return () => {
      cancelAnimationFrame(raf)
      embla.off('select', update).off('reInit', update).off('scroll', update)
    }
  }, [embla, update])

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="-mx-4 overflow-hidden px-4 md:mx-0 md:px-0" ref={emblaRef}>
        <motion.ul
          className="flex touch-pan-y gap-3 sm:gap-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          variants={stagger(0.05)}
        >
          {products.map((p, i) => (
            <motion.li
              key={p.slug}
              variants={fadeUp}
              className="min-w-0 shrink-0 basis-[46%] py-1 xs:basis-[44%] sm:basis-[31%] lg:basis-[23.5%] xl:basis-[19%]"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${products.length}`}
            >
              <ProductCard product={p} />
            </motion.li>
          ))}
        </motion.ul>
      </div>
      <div className="pointer-events-none absolute inset-y-0 -left-5 -right-5 hidden items-center justify-between md:flex">
        <IconButton
          label="Previous products"
          tone="surface"
          icon={<IconChevronLeft size={22} />}
          onClick={() => embla?.scrollPrev()}
          className={canPrev ? 'pointer-events-auto' : 'pointer-events-none opacity-0'}
          tabIndex={canPrev ? 0 : -1}
        />
        <IconButton
          label="Next products"
          tone="surface"
          icon={<IconChevronRight size={22} />}
          onClick={() => embla?.scrollNext()}
          className={canNext ? 'pointer-events-auto' : 'pointer-events-none opacity-0'}
          tabIndex={canNext ? 0 : -1}
        />
      </div>
    </div>
  )
}
