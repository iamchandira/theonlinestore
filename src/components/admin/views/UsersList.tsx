import { IconPlus } from '@tabler/icons-react'
import Link from 'next/link'
import type { ListViewServerProps, Where } from 'payload'

import { ROLES, STAFF_ROLES, hasRole } from '../../../access/roles'
import { CleanListURL } from './CleanListURL'

/**
 * Customers and staff (replaces Payload's default list for users). Two clean addresses instead of a role
 * filter in the URL: /admin/collections/users (customers) and /admin/collections/users?view=staff.
 * Reads as the signed-in user, so each role only sees the accounts it's allowed to.
 */
const VIEWS = {
  customers: { label: 'Customers', where: { roles: { in: ['customer'] } } as Where },
  staff: { label: 'Staff & roles', where: { roles: { in: STAFF_ROLES } } as Where },
} as const
type ViewKey = keyof typeof VIEWS
const PAGE_SIZE = 25
const BASE = '/admin/collections/users'
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' })

export async function UsersList(props: ListViewServerProps) {
  const { payload, searchParams, user, permissions } = props as ListViewServerProps & {
    searchParams?: Record<string, string | string[] | undefined>
  }
  const sp = (k: string) => {
    const v = searchParams?.[k]
    return (Array.isArray(v) ? v[0] : v) ?? ''
  }
  const view: ViewKey = sp('view') === 'staff' ? 'staff' : 'customers'
  const q = sp('q').trim().slice(0, 80)
  const page = Math.max(1, Number.parseInt(sp('page') || '1', 10) || 1)

  const search: Where[] = q
    ? [{ or: [{ email: { like: q.toLowerCase() } }, { fullName: { like: q } }, { phone: { like: q.replace(/\s/g, '') } }]}]
    : []
  const whereFor = (k: ViewKey): Where => ({ and: [VIEWS[k].where, ...search] })
  const asViewer = { user, overrideAccess: false } as const

  const [res, customers, staff] = await Promise.all([
    payload.find({ collection: 'users', where: whereFor(view), sort: '-createdAt', page, limit: PAGE_SIZE, depth: 0, ...asViewer }),
    payload.count({ collection: 'users', where: whereFor('customers'), ...asViewer }),
    payload.count({ collection: 'users', where: whereFor('staff'), ...asViewer }),
  ])
  const counts: Record<ViewKey, number> = { customers: customers.totalDocs, staff: staff.totalDocs }

  // Orders per customer on this page (only for roles that can see orders)
  const canSeeOrders = Boolean(permissions?.collections?.orders?.read)
  const orderCounts = new Map<number, number>()
  if (view === 'customers' && canSeeOrders && res.docs.length) {
    const orders = await payload.find({
      collection: 'orders',
      where: { customer: { in: res.docs.map((d) => d.id) } },
      pagination: false,
      limit: 0,
      depth: 0,
      select: { customer: true },
      overrideAccess: true,
    })
    for (const o of orders.docs) {
      const id = typeof o.customer === 'object' ? o.customer?.id : o.customer
      if (id) orderCounts.set(id, (orderCounts.get(id) ?? 0) + 1)
    }
  }

  const href = (o: Partial<{ view: ViewKey; q: string; page: number }>) => {
    const merged = { view, q, page, ...o }
    const p = new URLSearchParams()
    if (merged.view === 'staff') p.set('view', 'staff')
    if (merged.q) p.set('q', merged.q)
    if (merged.page && merged.page > 1) p.set('page', String(merged.page))
    return `${BASE}${p.size ? `?${p}` : ''}`
  }
  const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r
  const canAddStaff = hasRole(user ?? null, 'admin')
  const isStaffView = view === 'staff'

  return (
    <div className="tos-page">
      <CleanListURL href={href({})} />
      <header className="tos-page__header">
        <div>
          <p className="tos-page__eyebrow">{isStaffView ? 'Settings' : 'Sales'}</p>
          <h1 className="tos-page__title">{VIEWS[view].label}</h1>
          <p className="tos-page__subtitle">
            {isStaffView
              ? 'People who can sign in to this dashboard. Roles control what each person can see and do.'
              : 'Shoppers who created an account. Guests who check out without an account appear on their orders only.'}
          </p>
        </div>
        {(!isStaffView || canAddStaff) && (
          <div className="tos-actions">
            <Link className="tos-btn tos-btn--primary" href={`${BASE}/create`}>
              <IconPlus size={17} /> {isStaffView ? 'Add staff member' : 'Add customer'}
            </Link>
          </div>
        )}
      </header>

      <section className="tos-card">
        <div className="tos-toolbar">
          <nav className="tos-tabs" aria-label="Accounts">
            {(Object.keys(VIEWS) as ViewKey[]).map((k) => (
              <Link key={k} href={href({ view: k, q: '', page: 1 })} aria-current={k === view ? 'page' : undefined}>
                {VIEWS[k].label} <em>{counts[k]}</em>
              </Link>
            ))}
          </nav>
          <form className="tos-search" role="search" action={BASE}>
            {isStaffView && <input type="hidden" name="view" value="staff" />}
            <input name="q" defaultValue={q} placeholder="Name, email or mobile number" aria-label={`Search ${VIEWS[view].label.toLowerCase()}`} />
          </form>
        </div>

        {res.docs.length ? (
          <div className="tos-table-wrap">
            <table className="tos-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  {isStaffView ? <th>Roles</th> : <th>Email confirmed</th>}
                  {!isStaffView && canSeeOrders && <th className="num">Orders</th>}
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {res.docs.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`${BASE}/${u.id}`} className="tos-term-link" style={{ color: 'var(--tos-ink)', fontWeight: 600 }}>
                        {u.fullName || u.email.split('@')[0]}
                      </Link>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    {isStaffView ? (
                      <td>
                        {(u.roles ?? []).map((r) => (
                          <span key={r} className="tos-pill tos-pill--brand" style={{ marginRight: 4 }}>
                            {roleLabel(r)}
                          </span>
                        ))}
                      </td>
                    ) : (
                      <td>
                        <span className={`tos-pill tos-pill--${u._verified ? 'success' : 'warning'}`}>{u._verified ? 'Confirmed' : 'Not yet'}</span>
                      </td>
                    )}
                    {!isStaffView && canSeeOrders && <td className="num">{orderCounts.get(u.id) ?? 0}</td>}
                    <td>{dateFmt.format(new Date(u.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="tos-empty">
            {q ? 'No accounts match.' : isStaffView ? 'No staff accounts yet.' : 'No customer accounts yet. They’ll appear here when shoppers sign up.'}
          </div>
        )}

        <div className="tos-pager">
          <span>{res.totalDocs ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(res.totalDocs, page * PAGE_SIZE)} of ${res.totalDocs}` : ''}</span>
          <span className="tos-actions">
            {res.hasPrevPage && (
              <Link className="tos-btn tos-btn--sm" href={href({ page: page - 1 })}>
                ← Previous
              </Link>
            )}
            {res.hasNextPage && (
              <Link className="tos-btn tos-btn--sm" href={href({ page: page + 1 })}>
                Next →
              </Link>
            )}
          </span>
        </div>
      </section>
    </div>
  )
}
