'use client'

import { IconAdjustmentsHorizontal, IconCheck, IconChevronDown, IconSearch, IconStarFilled } from '@tabler/icons-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import type { FacetGroup, FacetOption } from '@/lib/catalog/facets'
import { cn } from '@/lib/utils/cn'

/* ============================================================== URL helpers */

type Params = Record<string, string>
const FILTER_KEYS = ['cat', 'brand', 'type', 'concern', 'recipient', 'occasion', 'size', 'colour', 'scent', 'diet', 'min', 'max', 'rating', 'stock', 'sale']

const fresh = (p: Params) => {
  const { page: _page, ...rest } = p
  return rest
}
function toggleValue(p: Params, key: string, value: string): Params {
  const next = fresh(p)
  const list = (next[key] ?? '').split(',').filter(Boolean)
  const i = list.indexOf(value)
  if (i >= 0) list.splice(i, 1)
  else list.push(value)
  if (list.length) next[key] = list.join(',')
  else delete next[key]
  return next
}
function setValue(p: Params, key: string, value?: string): Params {
  const next = fresh(p)
  if (value) next[key] = value
  else delete next[key]
  return next
}
function setPrice(p: Params, min?: number, max?: number): Params {
  const next = fresh(p)
  delete next.min
  delete next.max
  if (min) next.min = String(min)
  if (max) next.max = String(max)
  return next
}
const clearAll = (p: Params): Params => Object.fromEntries(Object.entries(fresh(p)).filter(([k]) => !FILTER_KEYS.includes(k)))
const countActive = (p: Params) =>
  FILTER_KEYS.reduce((n, k) => (k === 'max' && p.min ? n : n + (k === 'min' || k === 'max' || k === 'rating' || k === 'stock' || k === 'sale' ? (p[k] ? 1 : 0) : (p[k] ?? '').split(',').filter(Boolean).length)), 0)
const hrefFor = (path: string, p: Params) => {
  const q = new URLSearchParams(p)
  return `${path}${q.size ? `?${q}` : ''}`
}
const selectedIn = (p: Params, key: string) => (p[key] ?? '').split(',').filter(Boolean)

/* ========================================================== listing context */

type ListingCtx = { pending: boolean; navigate: (href: string) => void }
const Ctx = createContext<ListingCtx>({ pending: false, navigate: () => {} })

/** Shares one navigation transition between the filters and the results grid (the grid dims while loading). */
export function ListingProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const value = useMemo<ListingCtx>(() => ({ pending, navigate: (href) => start(() => router.push(href, { scroll: false })) }), [pending, router])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function ListingResults({ children }: { children: ReactNode }) {
  const { pending } = useContext(Ctx)
  return (
    <div aria-busy={pending} className={cn('transition-opacity duration-200', pending && 'pointer-events-none opacity-50')}>
      {children}
    </div>
  )
}

/** The URL's params, updated optimistically on click so checkboxes respond instantly. */
function useLiveParams() {
  const sp = useSearchParams()
  const urlParams = useMemo(() => Object.fromEntries(sp.entries()), [sp])
  const [params, setParams] = useState<Params>(urlParams)
  const [synced, setSynced] = useState(urlParams)
  if (synced !== urlParams) {
    setSynced(urlParams)
    setParams(urlParams)
  }
  return [params, setParams] as const
}

/* ================================================================= sidebar */

/** Desktop: filters in a sticky sidebar; every change applies immediately (and is kept in the URL). */
export function FilterSidebar({ facets }: { facets: FacetGroup[] }) {
  const path = usePathname()
  const { navigate } = useContext(Ctx)
  const [params, setParams] = useLiveParams()
  const active = countActive(params)
  const apply = (next: Params) => {
    setParams(next)
    navigate(hrefFor(path, next))
  }
  if (!facets.length) return null
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <IconAdjustmentsHorizontal size={19} aria-hidden /> Filters
        </h2>
        {active > 0 && (
          <button type="button" onClick={() => apply(clearAll(params))} className="text-sm font-semibold text-sunset-700 underline-offset-4 hover:underline">
            Clear all
          </button>
        )}
      </div>
      <FacetGroups facets={facets} params={params} onChange={apply} />
    </div>
  )
}

/* ============================================================ mobile sheet */

/** Phones/tablets: a "Filters" button opening a bottom sheet with live counts and "Show n results". */
export function FilterSheetButton({ facets, scopeToken, total }: { facets: FacetGroup[]; scopeToken: string; total: number }) {
  const path = usePathname()
  const { navigate } = useContext(Ctx)
  const [params] = useLiveParams()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Params>(params)
  const [preview, setPreview] = useState<{ key: string; total: number; facets: FacetGroup[] } | null>(null)
  const active = countActive(params)
  const draftKey = new URLSearchParams(draft).toString()
  const current = preview?.key === draftKey ? preview : null
  const loading = open && !current && draftKey !== new URLSearchParams(params).toString()

  useEffect(() => {
    if (!open) return
    if (draftKey === new URLSearchParams(params).toString()) return
    const ctrl = new AbortController()
    const t = window.setTimeout(() => {
      fetch(`/api/products/facets?scope=${encodeURIComponent(scopeToken)}&${draftKey}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((res: { total: number; facets: FacetGroup[] } | null) => res && setPreview({ key: draftKey, ...res }))
        .catch(() => {})
    }, 180)
    return () => {
      window.clearTimeout(t)
      ctrl.abort()
    }
  }, [draftKey, open, params, scopeToken])

  const shownFacets = current?.facets ?? facets
  const shownTotal = current?.total ?? total
  if (!facets.length) return null
  return (
    <>
      <Button
        variant="outline"
        className="h-11 lg:hidden"
        onClick={() => {
          setDraft(params)
          setOpen(true)
        }}
        aria-haspopup="dialog"
      >
        <IconAdjustmentsHorizontal size={18} aria-hidden /> Filters
        {active > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-ink-900 px-1.5 text-xs font-bold text-white">{active}</span>}
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side="bottom"
        title="Filters"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setDraft(clearAll(draft))} disabled={!countActive(draft)}>
              Clear all
            </Button>
            <Button
              className="flex-1"
              loading={loading}
              onClick={() => {
                setOpen(false)
                navigate(hrefFor(path, draft))
              }}
            >
              {shownTotal ? `Show ${shownTotal} result${shownTotal === 1 ? '' : 's'}` : 'No results: change filters'}
            </Button>
          </div>
        }
      >
        <div className="px-5 pb-4 pt-1">
          <FacetGroups facets={shownFacets} params={draft} onChange={setDraft} compact />
        </div>
      </Drawer>
    </>
  )
}

/* ================================================================== groups */

const SWATCH: Record<string, string> = {
  black: '#111827',
  white: '#ffffff',
  grey: '#9ca3af',
  gray: '#9ca3af',
  silver: '#cbd5e1',
  navy: '#1e2a4a',
  blue: '#2563eb',
  red: '#dc2626',
  pink: '#f472b6',
  blush: '#f9c6c9',
  beige: '#e8d5b5',
  nude: '#e3bc9a',
  tan: '#c8a27a',
  brown: '#8b5a2b',
  green: '#16a34a',
  olive: '#6b7a3a',
  cream: '#f5ecd7',
  gold: '#d4af37',
  rose: '#e8a0a8',
  'rose-gold': '#e0b2a0',
}

const INITIAL_VISIBLE = 6

function FacetGroups({ facets, params, onChange, compact }: { facets: FacetGroup[]; params: Params; onChange: (p: Params) => void; compact?: boolean }) {
  return (
    <div className="flex flex-col divide-y divide-line border-y border-line">
      {facets.map((g, i) => (
        <Group key={g.key} group={g} params={params} onChange={onChange} defaultOpen={compact ? i < 3 : i < 6} />
      ))}
    </div>
  )
}

function Group({ group, params, onChange, defaultOpen }: { group: FacetGroup; params: Params; onChange: (p: Params) => void; defaultOpen: boolean }) {
  const activeHere =
    group.kind === 'list' ? selectedIn(params, group.key).length : group.kind === 'price' ? (params.min || params.max ? 1 : 0) : params[group.key] ? 1 : 0
  const [open, setOpen] = useState(defaultOpen || activeHere > 0)
  const id = `facet-${group.key}`

  if (group.kind === 'toggle') {
    const on = params[group.key] === '1'
    return (
      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 py-2.5 text-sm font-semibold">
        <span>
          {group.label} <span className="font-normal text-ink-500">({group.count})</span>
        </span>
        <input type="checkbox" role="switch" checked={on} onChange={() => onChange(setValue(params, group.key, on ? undefined : '1'))} className="peer sr-only" />
        <span
          aria-hidden
          className="relative h-6 w-10 shrink-0 rounded-full bg-ink-200 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-ink-900 peer-checked:after:translate-x-4 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sunset-600"
        />
      </label>
    )
  }

  return (
    <section className="py-1">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left text-sm font-bold"
        >
          <span className="flex items-center gap-2">
            {group.label}
            {activeHere > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-sunset-600 px-1.5 text-[11px] font-bold text-white">{activeHere}</span>}
          </span>
          <IconChevronDown size={18} className={cn('shrink-0 text-ink-500 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
        </button>
      </h3>
      <div id={id} hidden={!open} className="pb-4">
        {group.kind === 'list' && <ListOptions group={group} params={params} onChange={onChange} />}
        {group.kind === 'rating' && <RatingOptions group={group} params={params} onChange={onChange} />}
        {group.kind === 'price' && <PriceOptions group={group} params={params} onChange={onChange} />}
      </div>
    </section>
  )
}

function ListOptions({ group, params, onChange }: { group: Extract<FacetGroup, { kind: 'list' }>; params: Params; onChange: (p: Params) => void }) {
  const selected = selectedIn(params, group.key)
  const [showAll, setShowAll] = useState(false)
  const [query, setQuery] = useState('')
  const searchable = group.options.length > 10
  const filtered = query ? group.options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : group.options
  const visible = showAll || query ? filtered : filtered.slice(0, INITIAL_VISIBLE)
  const isSelected = (o: FacetOption) => selected.includes(o.value)

  if (group.key === 'size') {
    return (
      <fieldset>
        <legend className="sr-only">{group.label}</legend>
        <div className="grid grid-cols-4 gap-2">
          {group.options.map((o) => (
            <label
              key={o.value}
              className={cn(
                'relative grid h-11 cursor-pointer place-items-center rounded-lg border text-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sunset-600',
                isSelected(o) ? 'border-ink-900 bg-ink-900 text-white' : 'border-line-strong hover:border-ink-900',
                o.count === 0 && !isSelected(o) && 'opacity-40',
              )}
            >
              <input type="checkbox" className="sr-only" checked={isSelected(o)} onChange={() => onChange(toggleValue(params, group.key, o.value))} />
              {o.label.replace(/^(EU|UK|US) /, '')}
              <span className="sr-only">
                {' '}
                ({o.count} products)
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  return (
    <fieldset>
      <legend className="sr-only">{group.label}</legend>
      {searchable && (
        <label className="mb-2 flex h-10 items-center gap-2 rounded-full border border-line-strong px-3 focus-within:border-ink-900">
          <IconSearch size={16} className="text-ink-500" aria-hidden />
          <span className="sr-only">Find a {group.label.toLowerCase()}</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Find a ${group.label.toLowerCase()}`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
      )}
      <ul className="flex flex-col">
        {visible.map((o) => (
          <li key={o.value}>
            <label className={cn('group flex min-h-10 cursor-pointer items-center gap-3 rounded-md py-1.5 text-sm', o.count === 0 && !isSelected(o) && 'opacity-45')}>
              <input type="checkbox" checked={isSelected(o)} onChange={() => onChange(toggleValue(params, group.key, o.value))} className="peer sr-only" />
              <span
                aria-hidden
                className="grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px] border-ink-300 bg-surface text-white transition-colors group-hover:border-ink-900 peer-checked:border-ink-900 peer-checked:bg-ink-900 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sunset-600 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
              >
                <IconCheck size={14} stroke={3} />
              </span>
              {group.key === 'colour' && (
                <span aria-hidden className="size-4 shrink-0 rounded-full border border-ink-200" style={{ background: SWATCH[o.value] ?? 'conic-gradient(#f9c6c9,#e8d5b5,#bcd4f5,#f9c6c9)' }} />
              )}
              <span className="flex-1 text-ink-800">{o.label}</span>
              <span className="text-xs tabular-nums text-ink-500">{o.count}</span>
            </label>
          </li>
        ))}
        {query && !filtered.length && <li className="py-2 text-sm text-ink-500">No matches</li>}
      </ul>
      {!query && filtered.length > INITIAL_VISIBLE && (
        <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-1 text-sm font-semibold text-sunset-700 underline-offset-4 hover:underline">
          {showAll ? 'Show fewer' : `Show all ${filtered.length}`}
        </button>
      )}
    </fieldset>
  )
}

function RatingOptions({ group, params, onChange }: { group: Extract<FacetGroup, { kind: 'rating' }>; params: Params; onChange: (p: Params) => void }) {
  return (
    <fieldset className="flex flex-col">
      <legend className="sr-only">{group.label}</legend>
      {group.options.map((o) => {
        const on = params.rating === o.value
        return (
          <label key={o.value} className={cn('flex min-h-10 cursor-pointer items-center gap-3 text-sm', o.count === 0 && !on && 'opacity-45')}>
            <input
              type="radio"
              name="rating"
              checked={on}
              onClick={() => on && onChange(setValue(params, 'rating'))}
              onChange={() => onChange(setValue(params, 'rating', o.value))}
              className="size-[18px] accent-ink-900"
            />
            <span className="flex items-center gap-0.5 text-star" aria-hidden>
              {Array.from({ length: Number(o.value) }, (_, i) => (
                <IconStarFilled key={i} size={14} />
              ))}
            </span>
            <span className="flex-1 text-ink-800">& up</span>
            <span className="text-xs tabular-nums text-ink-500">{o.count}</span>
          </label>
        )
      })}
    </fieldset>
  )
}

function PriceOptions({ group, params, onChange }: { group: Extract<FacetGroup, { kind: 'price' }>; params: Params; onChange: (p: Params) => void }) {
  const [min, setMin] = useState(params.min ?? '')
  const [max, setMax] = useState(params.max ?? '')
  // Re-sync the inputs when the URL's price changes (e.g. a chip was removed)
  const urlPrice = `${params.min}|${params.max}`
  const [syncedPrice, setSyncedPrice] = useState(urlPrice)
  if (syncedPrice !== urlPrice) {
    setSyncedPrice(urlPrice)
    setMin(params.min ?? '')
    setMax(params.max ?? '')
  }
  const bucketOf = (value: string) => value.split('-').map((n) => (n ? Number(n) : undefined)) as [number | undefined, number | undefined]
  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col">
        <legend className="sr-only">Price ranges</legend>
        {group.buckets.map((b) => {
          const [lo, hi] = bucketOf(b.value)
          const on = Number(params.min ?? 0) === (lo ?? 0) && (params.max ? Number(params.max) : undefined) === hi
          return (
            <label key={b.value} className={cn('flex min-h-10 cursor-pointer items-center gap-3 text-sm', b.count === 0 && !on && 'opacity-45')}>
              <input type="radio" name="price-bucket" checked={on} onClick={() => on && onChange(setPrice(params))} onChange={() => onChange(setPrice(params, lo || undefined, hi))} className="size-[18px] accent-ink-900" />
              <span className="flex-1 text-ink-800">{b.label}</span>
              <span className="text-xs tabular-nums text-ink-500">{b.count}</span>
            </label>
          )
        })}
      </fieldset>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const lo = Number(min) || undefined
          const hi = Number(max) || undefined
          onChange(setPrice(params, lo && hi && lo > hi ? hi : lo, lo && hi && lo > hi ? lo : hi))
        }}
      >
        {(['min', 'max'] as const).map((k) => (
          <label key={k} className="flex flex-1 flex-col gap-1 text-xs font-semibold text-ink-600">
            {k === 'min' ? 'Min (Rs)' : 'Max (Rs)'}
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={k === 'min' ? min : max}
              onChange={(e) => (k === 'min' ? setMin : setMax)(e.target.value.replace(/\D/g, '').slice(0, 7))}
              placeholder={String(k === 'min' ? Math.floor(group.min) : Math.ceil(group.max))}
              className="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 text-base font-normal text-ink-900 outline-none focus:border-ink-900 md:text-sm"
            />
          </label>
        ))}
        <Button type="submit" variant="dark" size="sm" className="h-10">
          Go
        </Button>
      </form>
    </div>
  )
}
