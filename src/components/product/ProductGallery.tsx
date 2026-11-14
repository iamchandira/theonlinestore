'use client'

import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import { useCallback, useEffect, useState, type MouseEvent } from 'react'

import { cn } from '@/lib/utils/cn'

export type GalleryImage = { src: string; large: string; alt: string }

/**
 * Product gallery.
 * - Phones and tablets: swipeable slides with dots.
 * - Desktop: thumbnail rail + main image with hover zoom (transform only, follows the cursor).
 * `activeIndex` follows the selected variant; the shopper can still browse freely.
 */
export function ProductGallery({ images, activeIndex, tint }: { images: GalleryImage[]; activeIndex: number; tint: string }) {
  const [index, setIndex] = useState(activeIndex)
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: 'center' })
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)

  // Variant change → jump to its photo
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(activeIndex)
    embla?.scrollTo(activeIndex)
  }, [activeIndex, embla])

  const onSelect = useCallback(() => embla && setIndex(embla.selectedScrollSnap()), [embla])
  useEffect(() => {
    if (!embla) return
    embla.on('select', onSelect)
    return () => {
      embla.off('select', onSelect)
    }
  }, [embla, onSelect])

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }
  const current = images[index] ?? images[0]
  if (!current) return null

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      {/* Mobile / tablet: swipe */}
      <div className="lg:hidden">
        <div ref={emblaRef} className={cn('overflow-hidden rounded-2xl border border-line bg-white', tint)}>
          <div className="flex touch-pan-y">
            {images.map((img, i) => (
              <div key={img.large + i} className="relative aspect-square min-w-0 shrink-0 basis-full bg-white">
                <Image src={img.large} alt={img.alt} fill priority={i === 0} sizes="100vw" className="object-contain p-6" />
              </div>
            ))}
          </div>
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Product photos">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Photo ${i + 1} of ${images.length}`}
                onClick={() => embla?.scrollTo(i)}
                className="grid size-6 place-items-center"
              >
                <span className={cn('block h-1.5 rounded-full transition-all', i === index ? 'w-5 bg-ink-900' : 'w-1.5 bg-ink-300')} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: main image with hover zoom */}
      <div
        className="relative hidden aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-2xl border border-line bg-white lg:block"
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
      >
        <Image
          key={current.large}
          src={current.large}
          alt={current.alt}
          fill
          priority
          sizes="(min-width: 1280px) 600px, 50vw"
          className="object-contain p-10 transition-transform duration-200 ease-out"
          style={zoom ? { transform: 'scale(1.9)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
      </div>
      {images.length > 1 && (
        <ul className="hidden w-20 shrink-0 flex-col gap-2 lg:flex" aria-label="Product photos">
          {images.map((img, i) => (
            <li key={img.src + i}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'relative block aspect-square w-full overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow]',
                  i === index ? 'border-ink-900 shadow-soft' : 'border-line hover:border-ink-300',
                )}
              >
                <Image src={img.src} alt="" fill sizes="80px" className="object-contain p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
