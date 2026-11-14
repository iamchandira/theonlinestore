'use client'

import Image from 'next/image'

import { VariantPill } from '@/components/ui/Chip'
import type { Variant } from '@/lib/catalog'
import { formatLKR } from '@/lib/format'
import { cn } from '@/lib/utils/cn'

/** Distinct values in first-seen order. */
const uniq = (list: (string | null)[]) => [...new Set(list.filter(Boolean) as string[])]

/** Finds the best variant for a combination, falling back to an in-stock one. */
export function resolveVariant(variants: Variant[], label: string | null, option2: string | null): Variant {
  const exact = variants.find((v) => (label == null || v.label === label) && (option2 == null || v.option2 === option2))
  if (exact && exact.stock > 0) return exact
  const sameColour = variants.find((v) => v.option2 === option2 && v.stock > 0)
  return sameColour ?? exact ?? variants.find((v) => v.stock > 0) ?? variants[0]
}

/**
 * Variant picker for one or two options.
 * - One option (size, shade, scent…): pills; shades/scents show a photo thumb.
 * - Two options (e.g. Colour × Shoe size): colour swatches (each colour's photo) then size pills.
 *   A size is disabled when it doesn't exist in the chosen colour or is sold out.
 */
export function VariantSelector({ variants, selected, onSelect }: { variants: Variant[]; selected: Variant; onSelect: (v: Variant) => void }) {
  if (variants.length <= 1) return null
  const twoOptions = Boolean(selected.option2Name)

  if (!twoOptions) {
    const showThumb = selected.option !== 'Size' && selected.option !== 'Pack' && selected.option !== 'Weight'
    return (
      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold">
          {selected.option}: <span className="font-normal text-ink-600">{selected.label}</span>
        </legend>
        <div role="radiogroup" aria-label={selected.option} className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <VariantPill key={v.sku} selected={v.sku === selected.sku} disabled={v.stock <= 0} onClick={() => onSelect(v)}>
              <span className="flex items-center gap-2">
                {showThumb && v.image && (
                  <span className="relative size-7 shrink-0 overflow-hidden rounded bg-white">
                    <Image src={v.image} alt="" fill sizes="28px" className="object-contain" />
                  </span>
                )}
                <span>
                  {v.label}
                  {v.price !== selected.price && <span className="ml-1.5 text-xs opacity-75">{formatLKR(v.price)}</span>}
                </span>
              </span>
            </VariantPill>
          ))}
        </div>
      </fieldset>
    )
  }

  // Two options: option2 (e.g. Colour) first, then option1 (e.g. Shoe size)
  const colours = uniq(variants.map((v) => v.option2))
  const sizes = uniq(variants.map((v) => v.label))
  const inColour = variants.filter((v) => v.option2 === selected.option2)

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold">
          {selected.option2Name}: <span className="font-normal text-ink-600">{selected.option2}</span>
        </legend>
        <div role="radiogroup" aria-label={selected.option2Name ?? 'Option'} className="flex flex-wrap gap-2.5">
          {colours.map((c) => {
            const sample = variants.find((v) => v.option2 === c)!
            const anyStock = variants.some((v) => v.option2 === c && v.stock > 0)
            const isSel = c === selected.option2
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={isSel}
                aria-label={`${c}${anyStock ? '' : ' (sold out)'}`}
                onClick={() => onSelect(resolveVariant(variants, selected.label, c))}
                className={cn(
                  'flex items-center gap-2 rounded-xl border bg-surface p-1.5 pr-3.5 text-sm font-medium transition-[border-color,box-shadow]',
                  isSel ? 'border-ink-900 shadow-soft' : 'border-line-strong hover:border-ink-900',
                  !anyStock && 'opacity-50',
                )}
              >
                <span className="relative size-11 overflow-hidden rounded-lg bg-white">
                  <Image src={sample.image} alt="" fill sizes="44px" className="object-contain p-0.5" />
                </span>
                {c}
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold">
          {selected.option}: <span className="font-normal text-ink-600">{selected.label}</span>
        </legend>
        <div role="radiogroup" aria-label={selected.option} className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
          {sizes.map((s) => {
            const v = inColour.find((x) => x.label === s)
            const unavailable = !v || v.stock <= 0
            return (
              <VariantPill
                key={s}
                selected={v?.sku === selected.sku}
                disabled={unavailable}
                onClick={() => v && onSelect(v)}
                className="justify-center text-center"
                aria-label={`${s}${!v ? ' (not available in this colour)' : v.stock <= 0 ? ' (sold out)' : ''}`}
              >
                {s.replace(/^(EU|UK|US) /, '')}
              </VariantPill>
            )
          })}
        </div>
        {/^(EU|UK|US) /.test(sizes[0] ?? '') && <p className="mt-2 text-xs text-ink-500">{sizes[0].split(' ')[0]} sizes</p>}
      </fieldset>
    </div>
  )
}
