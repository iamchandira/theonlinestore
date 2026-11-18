'use client'

import { IconCheck, IconExternalLink, IconPhoto, IconStarFilled, IconX } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export type ReviewRow = {
  id: number
  productId: number | null
  productName: string
  productSlug: string | null
  productImage: string | null
  rating: number
  title: string | null
  body: string
  authorName: string
  authorEmail: string | null
  status: 'pending' | 'approved' | 'rejected'
  verifiedBuyer: boolean
  photos: string[]
  createdAt: string
}

const STATUS: Record<ReviewRow['status'], { label: string; tone: string }> = {
  pending: { label: 'Waiting', tone: 'warning' },
  approved: { label: 'Published', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'muted' },
}
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' })

/** Reviews moderation table: approve / reject one at a time or in bulk. */
export function ReviewsTable({ rows, tab }: { rows: ReviewRow[]; tab: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<number[]>([])
  const [pending, start] = useTransition()
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)
  const all = rows.length > 0 && selected.length === rows.length

  const flash = (text: string, error?: boolean) => {
    setToast({ text, error })
    window.setTimeout(() => setToast(null), 2600)
  }
  const moderate = async (ids: number[], status: 'approved' | 'rejected') => {
    const res = await fetch('/api/reviews/moderate', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status }),
    })
    const json = (await res.json().catch(() => ({}))) as { updated?: number; error?: string }
    if (!res.ok) return flash(json.error ?? 'Something went wrong', true)
    flash(`${status === 'approved' ? 'Published' : 'Rejected'} ${json.updated ?? ids.length} review(s)`)
    setSelected([])
    start(() => router.refresh())
  }
  const remove = async () => {
    if (!window.confirm(`Delete ${selected.length} review(s)? This can’t be undone.`)) return
    const params = new URLSearchParams()
    selected.forEach((id, i) => params.set(`where[id][in][${i}]`, String(id)))
    const res = await fetch(`/api/reviews?${params}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) return flash('You don’t have permission to delete reviews', true)
    flash(`Deleted ${selected.length} review(s)`)
    setSelected([])
    start(() => router.refresh())
  }

  const toastEl = toast && <div className={`tos-toast${toast.error ? ' tos-toast--error' : ''}`}>{toast.text}</div>
  // Keep the confirmation visible even when the last review leaves this tab
  if (!rows.length)
    return (
      <>
        <div className="tos-empty">{tab === 'pending' ? 'No reviews are waiting. New reviews from shoppers will appear here.' : 'No reviews match.'}</div>
        {toastEl}
      </>
    )

  return (
    <>
      <div className="tos-table-wrap" style={{ opacity: pending ? 0.6 : 1, transition: 'opacity .15s' }}>
        <table className="tos-table tos-reviews">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={all} onChange={() => setSelected(all ? [] : rows.map((r) => r.id))} aria-label="Select all reviews on this page" />
              </th>
              <th>Review</th>
              <th>Product</th>
              <th>Status</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSel = selected.includes(r.id)
              return (
                <tr key={r.id} aria-selected={isSel}>
                  <td>
                    <input type="checkbox" checked={isSel} onChange={() => setSelected((s) => (isSel ? s.filter((x) => x !== r.id) : [...s, r.id]))} aria-label={`Select review by ${r.authorName}`} />
                  </td>
                  <td className="tos-review-cell">
                    <span className="tos-stars" aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <IconStarFilled key={i} size={14} style={{ color: i < r.rating ? '#f5a524' : 'var(--theme-elevation-150)' }} aria-hidden />
                      ))}
                    </span>
                    <Link href={`/admin/collections/reviews/${r.id}`} className="tos-review-cell__title">
                      {r.title || r.body.slice(0, 60)}
                    </Link>
                    <p className="tos-review-cell__body">{r.body}</p>
                    <small>
                      {r.authorName}
                      {r.authorEmail ? ` · ${r.authorEmail}` : ''} · {dateFmt.format(new Date(r.createdAt))}
                      {r.verifiedBuyer && <span className="tos-pill tos-pill--success tos-pill--plain">Verified buyer</span>}
                      {r.photos.length > 0 && (
                        <span className="tos-pill tos-pill--muted tos-pill--plain">
                          <IconPhoto size={12} /> {r.photos.length}
                        </span>
                      )}
                    </small>
                    {r.photos.length > 0 && (
                      <span className="tos-review-cell__photos">
                        {r.photos.map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={p} src={p} alt="" className="tos-thumb" />
                        ))}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="tos-product-cell">
                      {r.productImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="tos-thumb" src={r.productImage} alt="" />
                      ) : (
                        <span className="tos-thumb" />
                      )}
                      <div>
                        {r.productId ? <Link href={`/admin/collections/products/${r.productId}`}>{r.productName}</Link> : r.productName}
                        {r.productSlug && (
                          <small>
                            <a href={`/p/${r.productSlug}#reviews`} target="_blank" rel="noopener noreferrer">
                              View on store <IconExternalLink size={12} style={{ verticalAlign: '-2px' }} />
                            </a>
                          </small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`tos-pill tos-pill--${STATUS[r.status].tone}`}>{STATUS[r.status].label}</span>
                  </td>
                  <td className="num">
                    <span className="tos-actions" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      {r.status !== 'approved' && (
                        <button type="button" className="tos-btn tos-btn--sm tos-btn--primary" disabled={pending} onClick={() => moderate([r.id], 'approved')}>
                          <IconCheck size={15} /> Approve
                        </button>
                      )}
                      {r.status !== 'rejected' && (
                        <button type="button" className="tos-btn tos-btn--sm" disabled={pending} onClick={() => moderate([r.id], 'rejected')}>
                          <IconX size={15} /> Reject
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {selected.length > 0 && (
        <div className="tos-bulkbar" role="toolbar" aria-label="Bulk actions">
          <span>{selected.length} selected</span>
          <button className="tos-btn" type="button" disabled={pending} onClick={() => moderate(selected, 'approved')}>
            Approve
          </button>
          <button className="tos-btn" type="button" disabled={pending} onClick={() => moderate(selected, 'rejected')}>
            Reject
          </button>
          <button className="tos-btn tos-btn--danger" type="button" disabled={pending} onClick={remove}>
            Delete
          </button>
          <button className="tos-btn" type="button" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}
      {toastEl}
    </>
  )
}
