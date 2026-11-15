'use client'

import {
  IconArrowRight,
  IconBox,
  IconBuildingStore,
  IconCategory,
  IconExternalLink,
  IconFileImport,
  IconHistory,
  IconHome,
  IconLayoutDashboard,
  IconListSearch,
  IconMessageStar,
  IconPackages,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconShieldLock,
  IconUsers,
} from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'

type Item = { id: string; group: string; label: string; hint?: string; icon?: ComponentType<{ size?: number }>; image?: string | null; href: string; external?: boolean }

const PAGES: Item[] = [
  { id: 'home', group: 'Go to', label: 'Dashboard', icon: IconHome, href: '/admin' },
  { id: 'products', group: 'Go to', label: 'Products', icon: IconBox, href: '/admin/collections/products' },
  { id: 'inventory', group: 'Go to', label: 'Inventory', icon: IconPackages, href: '/admin/inventory' },
  { id: 'categories', group: 'Go to', label: 'Categories', icon: IconCategory, href: '/admin/collections/categories' },
  { id: 'brands', group: 'Go to', label: 'Brands', icon: IconBuildingStore, href: '/admin/collections/brands' },
  { id: 'customers', group: 'Go to', label: 'Customers', icon: IconUsers, href: '/admin/collections/users?where[roles][contains]=customer' },
  { id: 'homepage', group: 'Go to', label: 'Home page merchandising', icon: IconLayoutDashboard, href: '/admin/globals/home-page' },
  { id: 'media', group: 'Go to', label: 'Media library', icon: IconPhoto, href: '/admin/collections/media' },
  { id: 'history', group: 'Go to', label: 'Stock history', icon: IconHistory, href: '/admin/collections/stock-movements' },
  { id: 'reviews', group: 'Go to', label: 'Reviews waiting for approval', icon: IconMessageStar, href: '/admin/collections/reviews' },
  { id: 'search-insights', group: 'Go to', label: 'Search insights', icon: IconListSearch, href: '/admin/search-insights' },
  { id: 'staff', group: 'Go to', label: 'Staff & roles', icon: IconShieldLock, href: '/admin/collections/users?where[roles][not_in]=customer' },
  { id: 'new-product', group: 'Actions', label: 'Add a product', icon: IconPlus, href: '/admin/collections/products/create' },
  { id: 'adjust', group: 'Actions', label: 'Adjust stock', icon: IconPackages, href: '/admin/inventory' },
  { id: 'export', group: 'Actions', label: 'Export products to CSV', icon: IconFileImport, href: '/admin/import-export' },
  { id: 'import', group: 'Actions', label: 'Import prices & stock from CSV', icon: IconFileImport, href: '/admin/import-export' },
  { id: 'low', group: 'Actions', label: 'Show low-stock products', icon: IconPackages, href: '/admin/collections/products?tab=low' },
  { id: 'store', group: 'Actions', label: 'View the store', icon: IconExternalLink, href: '/', external: true },
]

type ApiProduct = { id: number; name: string; brand?: { name?: string } | null; minPrice?: number | null; variants?: { sku?: string; image?: { url?: string; sizes?: { thumb?: { url?: string } } } | null }[] }

/**
 * Admin command palette: ⌘K / Ctrl+K anywhere in the admin (or the sidebar search button).
 * Searches products by name, brand, SKU or category, and jumps to pages and actions.
 */
export function CommandPaletteProvider({ children }: { children?: ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [products, setProducts] = useState<Item[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('tos:cmdk', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('tos:cmdk', onOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ('')
    setActive(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => window.clearTimeout(t)
  }, [open])

  // Product search (debounced) through the REST API with the staff session
  useEffect(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProducts([])
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(async () => {
      const params = new URLSearchParams({ limit: '6', depth: '1', draft: 'true' })
      params.set('where[or][0][searchText][like]', term)
      params.set('where[or][1][variants.sku][like]', term)
      try {
        const res = await fetch(`/api/products?${params}`, { credentials: 'include', signal: ctrl.signal })
        const json = (await res.json()) as { docs?: ApiProduct[] }
        setProducts(
          (json.docs ?? []).map((p) => ({
            id: `p-${p.id}`,
            group: 'Products',
            label: p.name,
            hint: [p.brand?.name, p.minPrice ? `Rs ${p.minPrice.toLocaleString('en-LK')}` : null].filter(Boolean).join(' · '),
            image: p.variants?.[0]?.image?.sizes?.thumb?.url || p.variants?.[0]?.image?.url || null,
            href: `/admin/collections/products/${p.id}`,
          })),
        )
      } catch {
        /* aborted */
      }
    }, 150)
    return () => {
      window.clearTimeout(t)
      ctrl.abort()
    }
  }, [q])

  const items = useMemo(() => {
    const term = q.trim().toLowerCase()
    const pages = term ? PAGES.filter((p) => p.label.toLowerCase().includes(term)) : PAGES
    return [...products, ...pages]
  }, [q, products])

  const go = useCallback(
    (item: Item) => {
      setOpen(false)
      if (item.external) window.open(item.href, '_blank', 'noopener')
      else router.push(item.href)
    },
    [router],
  )

  let lastGroup = ''
  return (
    <>
      {children}
      {open && (
        <div className="tos-cmdk" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="tos-cmdk__panel" role="dialog" aria-modal="true" aria-label="Search and jump">
            <div className="tos-cmdk__input">
              <IconSearch size={20} />
              <input
                ref={inputRef}
                value={q}
                placeholder="Search products, SKUs, pages and actions…"
                aria-label="Search"
                role="combobox"
                aria-expanded="true"
                aria-controls="tos-cmdk-list"
                aria-activedescendant={items[active] ? `cmdk-${items[active].id}` : undefined}
                onChange={(e) => {
                  setQ(e.target.value)
                  setActive(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActive((a) => Math.min(a + 1, items.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActive((a) => Math.max(a - 1, 0))
                  } else if (e.key === 'Enter' && items[active]) {
                    e.preventDefault()
                    go(items[active])
                  } else if (e.key === 'Escape') {
                    setOpen(false)
                  }
                }}
              />
            </div>
            <div className="tos-cmdk__list" id="tos-cmdk-list" role="listbox">
              {items.length === 0 && <div className="tos-empty">No matches for “{q}”.</div>}
              {items.map((item, i) => {
                const header = item.group !== lastGroup ? <div className="tos-cmdk__group">{item.group}</div> : null
                lastGroup = item.group
                const Icon = item.icon ?? IconArrowRight
                return (
                  <div key={item.id}>
                    {header}
                    <button
                      type="button"
                      id={`cmdk-${item.id}`}
                      role="option"
                      aria-selected={i === active}
                      className="tos-cmdk__item"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {item.image ? <img src={item.image} alt="" /> : <Icon size={18} />}
                      <span>{item.label}</span>
                      {item.hint && <small>{item.hint}</small>}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="tos-cmdk__foot">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd>to move
              </span>
              <span>
                <kbd>↵</kbd>to open
              </span>
              <span>
                <kbd>esc</kbd>to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
