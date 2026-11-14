import { IconConfetti } from '@tabler/icons-react'

import { ChipLink } from '@/components/ui/Chip'
import { occasions } from '@/config/navigation'

/** "Shop by occasion": gifting is the heart of a lifestyle store. (Beauty concerns live on the Beauty pages.) */
export function OccasionChips() {
  return (
    <section aria-labelledby="occasion-title" className="container-site py-6">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 md:flex-row md:items-center md:gap-5 md:p-5">
        <h2 id="occasion-title" className="flex shrink-0 items-center gap-2 font-display text-lg font-bold">
          <IconConfetti size={22} className="text-sunset-500" /> Shop by occasion
        </h2>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {occasions.map((o) => (
            <ChipLink key={o.slug} href={`/gifts?occasion=${o.slug}`} className="shrink-0">
              {o.label}
            </ChipLink>
          ))}
        </div>
      </div>
    </section>
  )
}
