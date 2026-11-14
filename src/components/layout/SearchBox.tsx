'use client'

import { IconArrowUpRight, IconSearch, IconTrendingUp, IconX } from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'

type Suggest = {
  products: { slug: string; name: string; brand: string; price: number | null; image: string | null }[]
  brands: { name: string; slug: string }[]
}
const EMPTY: Suggest = { products: [], brands: [] }

import { Price } from '@/components/ui/Price'
import { categories, popularSearches } from '@/config/navigation'
import { dropdown } from '@/lib/motion/variants'
import { cn } from '@/lib/utils/cn'

/**
 * Always-visible search with autosuggest (combobox pattern).
 * Empty → popular searches + categories. Typing → matching brands, categories and products.
 * No dead ends: zero results still offers popular searches.
 */
export function SearchBox({ className, autoFocus, onNavigate }: { className?: string; autoFocus?: boolean; onNavigate?: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const deferred = useDeferredValue(q)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const [data, setData] = useState<{ q: string; res: Suggest }>({ q: '', res: EMPTY })
  const term = deferred.trim()

  // Debounced fetch from the server (GET /api/products/suggest); stale responses are ignored
  useEffect(() => {
    if (term.length < 2) return
    const ctrl = new AbortController()
    const t = window.setTimeout(() => {
      fetch(`/api/products/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : EMPTY))
        .then((res: Suggest) => setData({ q: term, res }))
        .catch(() => {})
    }, 140)
    return () => {
      window.clearTimeout(t)
      ctrl.abort()
    }
  }, [term])

  const current = data.q === term ? data.res : EMPTY
  const loading = term.length >= 2 && data.q !== term
  const results = current.products.slice(0, 5)
  const brandHits = current.brands
  const catHits = useMemo(() => {
    const t = deferred.trim().toLowerCase()
    return t.length < 2 ? [] : categories.flatMap((c) => [c, ...(c.children ?? [])]).filter((c) => c.name.toLowerCase().includes(t)).slice(0, 3)
  }, [deferred])

  const hasQuery = deferred.trim().length >= 2
  const options = hasQuery ? results.map((p) => `/p/${p.slug}`) : []

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    onNavigate?.()
    router.push(href)
  }

  const submit = (term = q) => {
    const t = term.trim()
    if (!t) return inputRef.current?.focus()
    go(`/search?q=${encodeURIComponent(t)}`)
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (active >= 0 && options[active]) go(options[active])
          else submit()
        }}
        className={cn(
          'group flex h-12 items-center gap-2 rounded-full border bg-surface pl-4 pr-1.5 transition-[border-color,box-shadow] duration-200',
          open ? 'border-ink-900 shadow-[0_0_0_4px_var(--color-sunset-100)]' : 'border-line-strong hover:border-ink-300',
        )}
      >
        <IconSearch size={20} className="shrink-0 text-ink-500" aria-hidden />
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search products, brands and categories
        </label>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          autoFocus={autoFocus}
          value={q}
          placeholder="Search CeraVe, serums, gifts…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(-1)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, options.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, -1))
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink-900 outline-none placeholder:text-ink-500 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" aria-label="Clear search" onClick={() => { setQ(''); inputRef.current?.focus() }} className="grid size-9 place-items-center rounded-full text-ink-500 hover:bg-ink-50">
            <IconX size={18} />
          </button>
        )}
        <button type="submit" className="hidden h-9 items-center rounded-full bg-ink-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-sunset-600 sm:inline-flex">
          Search
        </button>
      </form>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdown}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute inset-x-0 top-[calc(100%+8px)] z-[70] overflow-hidden rounded-xl border border-line bg-surface shadow-lift"
          >
            <div id={listId} role="listbox" aria-label="Search suggestions" data-lenis-prevent className="max-h-[70dvh] overflow-y-auto overscroll-contain p-2">
              {hasQuery && loading && results.length === 0 ? (
                <ul className="py-1" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-center gap-3 p-2">
                      <span className="skeleton size-14 shrink-0 rounded-md" />
                      <span className="flex-1 space-y-2">
                        <span className="skeleton block h-3 w-16 rounded" />
                        <span className="skeleton block h-4 w-3/4 rounded" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : !hasQuery || (results.length === 0 && brandHits.length === 0 && catHits.length === 0) ? (
                <div className="p-3">
                  {hasQuery && (
                    <p className="mb-4 rounded-md bg-ink-50 px-3 py-2.5 text-sm text-ink-700">
                      No matches for <strong>“{deferred}”</strong> yet. Try one of these:
                    </p>
                  )}
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
                    <IconTrendingUp size={15} /> Popular searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((s) => (
                      <button key={s} type="button" onClick={() => { setQ(s); submit(s) }} className="h-9 rounded-full border border-line-strong px-3.5 text-sm font-medium hover:border-ink-900">
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-ink-500">Shop categories</p>
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                    {categories.map((c) => (
                      <Link key={c.slug} href={c.href} onClick={() => { setOpen(false); onNavigate?.() }} className="rounded-md px-2.5 py-2 text-sm font-medium hover:bg-ink-50">
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {(brandHits.length > 0 || catHits.length > 0) && (
                    <div className="flex flex-wrap gap-2 border-b border-line p-2 pb-3">
                      {brandHits.map((b) => (
                        <Link key={b.slug} href={`/brands/${b.slug}`} onClick={() => setOpen(false)} className="inline-flex h-9 items-center gap-1 rounded-full bg-ink-50 px-3.5 text-sm font-semibold hover:bg-ink-100">
                          {b.name} <span className="font-normal text-ink-500">· Brand</span>
                        </Link>
                      ))}
                      {catHits.map((c) => (
                        <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="inline-flex h-9 items-center gap-1 rounded-full bg-sunset-50 px-3.5 text-sm font-semibold text-sunset-800 hover:bg-sunset-100">
                          {c.name} <span className="font-normal opacity-75">· Category</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <ul className="py-1">
                    {results.map((p, i) => (
                      <li key={p.slug} id={`${listId}-opt-${i}`} role="option" aria-selected={active === i}>
                        <Link
                          href={`/p/${p.slug}`}
                          onClick={() => { setOpen(false); onNavigate?.() }}
                          onMouseEnter={() => setActive(i)}
                          className={cn('flex items-center gap-3 rounded-md p-2', active === i && 'bg-ink-50')}
                        >
                          <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-ink-50">
                            {p.image && <Image src={p.image} alt="" fill sizes="56px" className="object-contain p-1 mix-blend-multiply" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[0.6875rem] font-bold uppercase tracking-wider text-ink-500">{p.brand}</span>
                            <span className="line-clamp-1 text-sm font-semibold">{p.name}</span>
                          </span>
                          {p.price ? <Price price={p.price} size="sm" /> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => submit()} className="flex w-full items-center justify-between rounded-md px-3 py-3 text-sm font-semibold text-sunset-700 hover:bg-sunset-50">
                    See all results for “{deferred}” <IconArrowUpRight size={18} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
