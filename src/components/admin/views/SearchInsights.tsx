import { sql } from '@payloadcms/db-postgres'
import { IconExternalLink, IconMoodEmpty, IconSearch, IconTrendingUp } from '@tabler/icons-react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import { hasRole } from '@/access/roles'

import { AdminPage } from './AdminPage'

type Row = Record<string, unknown>
const RANGES = [7, 30, 90] as const
/** First day (YYYY-MM-DD, Sri Lanka time) of a range ending today. */
const sinceDay = (days: number) => new Date(Date.now() - (days - 1) * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })

/**
 * Search insights (TOS-208) at /admin/search-insights: what shoppers search for, and which searches
 * find nothing (what to stock, or what to rename/tag so it can be found).
 */
export async function SearchInsights(props: AdminViewServerProps) {
  const { req } = props.initPageResult
  const allowed = hasRole(req.user, 'admin', 'store-manager', 'marketing')
  const daysParam = Number(props.searchParams?.days)
  const days = (RANGES as readonly number[]).includes(daysParam) ? daysParam : 30
  const since = sinceDay(days)

  let totals = { searches: 0, terms: 0, zero: 0 }
  let top: { term: string; searches: number; results: number }[] = []
  let zero: { term: string; searches: number; last: string }[] = []
  let daily: { day: string; searches: number }[] = []
  if (allowed) {
    const db = (req.payload.db as unknown as { drizzle: { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Row[] }> } }).drizzle
    const perTerm = sql`
      SELECT term, sum(count)::int AS searches, (array_agg(results ORDER BY day DESC))[1]::int AS results, max(day) AS last
      FROM search_queries WHERE day >= ${since} GROUP BY term`
    const [t, topRows, zeroRows, dayRows] = await Promise.all([
      db.execute(sql`SELECT coalesce(sum(searches), 0)::int AS searches, count(*)::int AS terms, coalesce(sum(searches) FILTER (WHERE results = 0), 0)::int AS zero FROM (${perTerm}) x`),
      db.execute(sql`SELECT * FROM (${perTerm}) x ORDER BY searches DESC, term LIMIT 25`),
      db.execute(sql`SELECT * FROM (${perTerm}) x WHERE results = 0 ORDER BY searches DESC, last DESC LIMIT 25`),
      db.execute(sql`SELECT day, sum(count)::int AS searches FROM search_queries WHERE day >= ${since} GROUP BY day ORDER BY day`),
    ])
    totals = { searches: Number(t.rows[0]?.searches ?? 0), terms: Number(t.rows[0]?.terms ?? 0), zero: Number(t.rows[0]?.zero ?? 0) }
    top = topRows.rows.map((r) => ({ term: String(r.term), searches: Number(r.searches), results: Number(r.results) }))
    zero = zeroRows.rows.map((r) => ({ term: String(r.term), searches: Number(r.searches), last: String(r.last) }))
    daily = dayRows.rows.map((r) => ({ day: String(r.day), searches: Number(r.searches) }))
  }
  const zeroRate = totals.searches ? Math.round((totals.zero / totals.searches) * 100) : 0
  const maxDay = Math.max(1, ...daily.map((d) => d.searches))
  const storeLink = (term: string) => `/search?q=${encodeURIComponent(term)}`

  return (
    <AdminPage props={props}>
      <div className="tos-page">
        <header className="tos-page__header">
          <div>
            <p className="tos-page__eyebrow">Insights</p>
            <h1 className="tos-page__title">Search insights</h1>
            <p className="tos-page__subtitle">What shoppers type into the search box. Searches with no results show what to stock, or what to rename or tag so it can be found.</p>
          </div>
          <nav className="tos-tabs" aria-label="Date range">
            {RANGES.map((d) => (
              <Link key={d} href={`/admin/search-insights?days=${d}`} aria-current={d === days ? 'page' : undefined}>
                Last {d} days
              </Link>
            ))}
          </nav>
        </header>

        {!allowed ? (
          <div className="tos-card tos-empty">Search insights are available to Admins, Store Managers and Marketing.</div>
        ) : (
          <>
            <div className="tos-kpis">
              <div className="tos-card tos-kpi">
                <span className="tos-kpi__icon">
                  <IconSearch size={18} />
                </span>
                <span className="tos-kpi__label">Searches</span>
                <span className="tos-kpi__value">{totals.searches.toLocaleString('en-LK')}</span>
                <span className="tos-kpi__hint">In the last {days} days</span>
              </div>
              <div className="tos-card tos-kpi">
                <span className="tos-kpi__icon">
                  <IconTrendingUp size={18} />
                </span>
                <span className="tos-kpi__label">Different searches</span>
                <span className="tos-kpi__value">{totals.terms.toLocaleString('en-LK')}</span>
                <span className="tos-kpi__hint">Unique search terms</span>
              </div>
              <div className="tos-card tos-kpi">
                <span className={`tos-kpi__icon${zeroRate > 10 ? ' tos-kpi__icon--warning' : ''}`}>
                  <IconMoodEmpty size={18} />
                </span>
                <span className="tos-kpi__label">Found nothing</span>
                <span className="tos-kpi__value">{zeroRate}%</span>
                <span className="tos-kpi__hint">
                  {totals.zero} search{totals.zero === 1 ? '' : 'es'} with no results
                </span>
              </div>
            </div>

            {daily.length > 1 && (
              <section className="tos-card" style={{ marginTop: 16 }}>
                <div className="tos-card__head">
                  <h2>Searches per day</h2>
                </div>
                <div className="tos-card__body">
                  <div className="tos-daybars" role="img" aria-label={`Searches per day over the last ${days} days, peaking at ${maxDay}`}>
                    {daily.map((d) => (
                      <span key={d.day} title={`${d.day}: ${d.searches} searches`} style={{ height: `${Math.max(4, (d.searches / maxDay) * 100)}%` }} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            <div className="tos-grid tos-grid--2" style={{ marginTop: 16 }}>
              <section className="tos-card">
                <div className="tos-card__head">
                  <h2>Top searches</h2>
                </div>
                {top.length ? (
                  <table className="tos-table">
                    <thead>
                      <tr>
                        <th>Search</th>
                        <th className="num">Searches</th>
                        <th className="num">Results</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top.map((r) => (
                        <tr key={r.term}>
                          <td>
                            <a className="tos-term-link" href={storeLink(r.term)} target="_blank" rel="noopener noreferrer">
                              {r.term} <IconExternalLink size={12} style={{ verticalAlign: '-1px', opacity: 0.6 }} />
                            </a>
                          </td>
                          <td className="num">{r.searches}</td>
                          <td className="num">{r.results === 0 ? <span className="tos-pill tos-pill--warning tos-pill--plain">0</span> : r.results}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="tos-empty">No searches yet in this period. They appear here as shoppers use the search box.</div>
                )}
              </section>
              <section className="tos-card">
                <div className="tos-card__head">
                  <h2>Searches that found nothing</h2>
                </div>
                {zero.length ? (
                  <table className="tos-table">
                    <thead>
                      <tr>
                        <th>Search</th>
                        <th className="num">Searches</th>
                        <th className="num">Last searched</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zero.map((r) => (
                        <tr key={r.term}>
                          <td>
                            <a className="tos-term-link" href={storeLink(r.term)} target="_blank" rel="noopener noreferrer">
                              {r.term}
                            </a>
                          </td>
                          <td className="num">{r.searches}</td>
                          <td className="num tos-muted">{r.last}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="tos-empty">Every search found something. Nice.</div>
                )}
                <div className="tos-card__body tos-muted" style={{ borderTop: '1px solid var(--tos-line)' }}>
                  Tip: add the missing word to a product name, tag or category, or stock what people ask for.
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </AdminPage>
  )
}
