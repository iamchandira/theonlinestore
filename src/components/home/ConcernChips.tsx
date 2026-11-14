import { IconSparkles } from '@tabler/icons-react'

import { ChipLink } from '@/components/ui/Chip'
import { concerns } from '@/config/navigation'

/** "Shop by concern": shoppers often know their problem, not the product name. */
export function ConcernChips() {
  return (
    <section aria-labelledby="concern-title" className="container-site py-6">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 md:flex-row md:items-center md:gap-5 md:p-5">
        <h2 id="concern-title" className="flex shrink-0 items-center gap-2 font-display text-lg font-bold">
          <IconSparkles size={22} className="text-sunset-500" /> Shop by concern
        </h2>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {concerns.map((c) => (
            <ChipLink key={c.slug} href={`/c/beauty?concern=${c.slug}`} className="shrink-0">
              {c.label}
            </ChipLink>
          ))}
        </div>
      </div>
    </section>
  )
}
