import type { ReactNode } from 'react'

import { ProductRail } from '@/components/product/ProductRail'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { Product } from '@/lib/catalog'
import { cn } from '@/lib/utils/cn'

type RailSectionProps = {
  id: string
  eyebrow?: string
  title: ReactNode
  description?: string
  action?: { label: string; href: string }
  products: Product[]
  /** Optional tinted panel behind the rail */
  tone?: 'plain' | 'blush' | 'cream' | 'lilac'
  headerExtra?: ReactNode
}

/** Standard home-page product rail with section header. */
export function RailSection({ id, eyebrow, title, description, action, products, tone = 'plain', headerExtra }: RailSectionProps) {
  return (
    <section aria-labelledby={id} className={cn('py-10 md:py-14', tone === 'blush' && 'bg-tint-skincare/70', tone === 'cream' && 'bg-tint-body/60', tone === 'lilac' && 'bg-tint-fragrance/70')}>
      <div className="container-site">
        <SectionHeader eyebrow={eyebrow} title={<span id={id}>{title}</span>} description={description} action={action}>
          {headerExtra}
        </SectionHeader>
        <ProductRail products={products} label={typeof title === 'string' ? title : id} />
      </div>
    </section>
  )
}
