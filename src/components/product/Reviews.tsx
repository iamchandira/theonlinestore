'use client'

import { IconCamera, IconChevronDown, IconCircleCheck, IconMessage2, IconPencil, IconRosetteDiscountCheck, IconStarFilled, IconThumbUp, IconX } from '@tabler/icons-react'
import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Rating } from '@/components/ui/Rating'
import type { PublicReview, ReviewSort, ReviewSummary } from '@/lib/catalog/server'
import { cn } from '@/lib/utils/cn'

const SORTS: { value: ReviewSort; label: string }[] = [
  { value: 'recent', label: 'Most recent' },
  { value: 'helpful', label: 'Most helpful' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
]
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' })
const HELPFUL_KEY = 'tos.helpful.v1'

type Props = { productId: number; productName: string; summary: ReviewSummary; initial: PublicReview[]; totalPages: number }

/**
 * Product reviews (TOS-206): rating summary with a clickable star histogram, filters (stars, with
 * photos), sort, "helpful" votes, photos, store replies, and a write-a-review form. New reviews are
 * moderated before they appear.
 */
export function Reviews({ productId, productName, summary, initial, totalPages: initialPages }: Props) {
  const [sort, setSort] = useState<ReviewSort>('recent')
  const [rating, setRating] = useState<number | null>(null)
  const [photosOnly, setPhotosOnly] = useState(false)
  const [reviews, setReviews] = useState(initial)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialPages)
  const [loading, setLoading] = useState(false)
  const [writing, setWriting] = useState(false)
  const firstRun = useRef(true)

  const load = async (nextPage: number, append: boolean) => {
    setLoading(true)
    const q = new URLSearchParams({ product: String(productId), sort, page: String(nextPage) })
    if (rating) q.set('rating', String(rating))
    if (photosOnly) q.set('photos', '1')
    try {
      const res = (await (await fetch(`/api/reviews/list?${q}`)).json()) as { reviews: PublicReview[]; totalPages: number }
      setReviews((prev) => (append ? [...prev, ...res.reviews] : res.reviews))
      setTotalPages(res.totalPages)
      setPage(nextPage)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    void load(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, rating, photosOnly])

  const max = Math.max(1, ...Object.values(summary.histogram))
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-28 border-t border-line">
      <div className="container-site grid gap-8 py-10 md:grid-cols-[18rem_minmax(0,1fr)] md:gap-12 md:py-14 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Summary */}
        <div className="md:sticky md:top-28 md:self-start">
          <h2 id="reviews-title" className="text-2xl font-bold md:text-3xl">
            Customer reviews
          </h2>
          {summary.count > 0 ? (
            <>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-display text-5xl font-bold leading-none">{summary.average.toFixed(1)}</span>
                <div className="pb-1">
                  <Rating value={summary.average} size={18} />
                  <p className="mt-1 text-sm text-ink-600">
                    Based on {summary.count} review{summary.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <ul className="mt-5 flex flex-col gap-1.5" aria-label="Filter by rating">
                {([5, 4, 3, 2, 1] as const).map((n) => {
                  const c = summary.histogram[n]
                  const on = rating === n
                  return (
                    <li key={n}>
                      <button
                        type="button"
                        disabled={!c}
                        aria-pressed={on}
                        onClick={() => setRating(on ? null : n)}
                        className={cn('flex w-full items-center gap-3 rounded-md px-1.5 py-1 text-sm transition-colors enabled:hover:bg-ink-50 disabled:opacity-50', on && 'bg-sunset-50')}
                      >
                        <span className="flex w-8 items-center gap-0.5 font-semibold">
                          {n}
                          <IconStarFilled size={12} className="text-star" aria-hidden />
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100" aria-hidden>
                          <span className="block h-full rounded-full bg-star" style={{ width: `${(c / max) * 100}%` }} />
                        </span>
                        <span className="w-6 text-right tabular-nums text-ink-600">{c}</span>
                        <span className="sr-only">{`${c} reviews with ${n} stars${on ? ', filter on' : ''}`}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-ink-600">No reviews yet. Tried it? Your review helps other shoppers choose.</p>
          )}
          <Button variant="dark" className="mt-6 w-full sm:w-auto md:w-full" onClick={() => setWriting(true)}>
            <IconPencil size={18} /> Write a review
          </Button>
          <p className="mt-3 text-xs text-ink-500">Every review is checked by our team before it appears. We never show your email.</p>
          {summary.samplesOnly && <p className="mt-3 rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-600">This is a demo product, so the reviews shown are samples.</p>}
        </div>

        {/* List */}
        <div className="min-w-0">
          {summary.count > 0 && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <FilterPill on={!rating && !photosOnly} onClick={() => (setRating(null), setPhotosOnly(false))}>
                  All
                </FilterPill>
                {summary.withPhotos > 0 && (
                  <FilterPill on={photosOnly} onClick={() => setPhotosOnly((v) => !v)}>
                    <IconCamera size={15} aria-hidden /> With photos ({summary.withPhotos})
                  </FilterPill>
                )}
                {rating && (
                  <FilterPill on onClick={() => setRating(null)}>
                    {rating}★ only <IconX size={14} aria-hidden />
                  </FilterPill>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-ink-600">Sort</span>
                <span className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as ReviewSort)}
                    className="h-10 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface pl-3.5 pr-9 text-sm font-semibold hover:border-ink-900"
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <IconChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500" aria-hidden />
                </span>
              </label>
            </div>
          )}

          {reviews.length ? (
            <ul aria-busy={loading} className={cn('flex flex-col divide-y divide-line transition-opacity', loading && 'opacity-60')}>
              {reviews.map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
            </ul>
          ) : summary.count > 0 ? (
            <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-ink-600">No reviews match this filter.</p>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-sunset-50 text-sunset-600">
                <IconMessage2 size={26} />
              </span>
              <p className="text-lg font-bold">Be the first to review {productName}</p>
              <p className="max-w-sm text-sm text-ink-600">Share what you liked, how you use it and who it suits. Photos help too.</p>
              <Button variant="outline" onClick={() => setWriting(true)}>
                Write a review
              </Button>
            </div>
          )}

          {page < totalPages && (
            <Button variant="outline" className="mt-6" loading={loading} onClick={() => load(page + 1, true)}>
              Show more reviews
            </Button>
          )}
        </div>
      </div>
      <WriteReview open={writing} onClose={() => setWriting(false)} productId={productId} productName={productName} />
    </section>
  )
}

function FilterPill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn('inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors', on ? 'border-ink-900 bg-ink-900 text-white' : 'border-line-strong bg-surface hover:border-ink-900')}
    >
      {children}
    </button>
  )
}

function readHelpful(): number[] {
  try {
    return JSON.parse(window.localStorage.getItem(HELPFUL_KEY) ?? '[]') as number[]
  } catch {
    return []
  }
}

function ReviewItem({ review: r }: { review: PublicReview }) {
  const [helpful, setHelpful] = useState(r.helpfulCount)
  const [voted, setVoted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoted(readHelpful().includes(r.id))
  }, [r.id])
  const vote = async () => {
    if (voted) return
    setVoted(true)
    setHelpful((n) => n + 1)
    try {
      window.localStorage.setItem(HELPFUL_KEY, JSON.stringify([...readHelpful(), r.id].slice(-300)))
    } catch {
      /* storage unavailable */
    }
    await fetch(`/api/reviews/${r.id}/helpful`, { method: 'POST' }).catch(() => {})
  }
  return (
    <li className="flex flex-col gap-2.5 py-6 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Rating value={r.rating} size={15} />
        {r.title && <h3 className="text-base font-bold">{r.title}</h3>}
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-600">
        <span className="font-semibold text-ink-900">{r.authorName}</span>
        {r.verifiedBuyer && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-600">
            <IconRosetteDiscountCheck size={14} aria-hidden /> Verified buyer
          </span>
        )}
        {r.isSample && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">Sample review</span>}
        <span aria-hidden>·</span>
        <time dateTime={r.createdAt}>{dateFmt.format(new Date(r.createdAt))}</time>
      </p>
      <p className="whitespace-pre-line text-ink-800">{r.body}</p>
      {r.photos.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Customer photos">
          {r.photos.map((p, i) => (
            <li key={p.thumb}>
              <a href={p.large} target="_blank" rel="noopener noreferrer" className="relative block size-20 overflow-hidden rounded-lg border border-line" aria-label={`Open customer photo ${i + 1}`}>
                <Image src={p.thumb} alt="" fill sizes="80px" className="object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {r.reply && (
        <div className="rounded-lg border-l-4 border-sunset-400 bg-sunset-50/60 px-4 py-3 text-sm">
          <p className="mb-1 font-semibold">Reply from The Online Store</p>
          <p className="whitespace-pre-line text-ink-700">{r.reply}</p>
        </div>
      )}
      <div>
        <button
          type="button"
          onClick={vote}
          disabled={voted}
          aria-pressed={voted}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-sm font-medium text-ink-700 transition-colors enabled:hover:border-ink-900 disabled:border-transparent disabled:bg-ink-50"
        >
          <IconThumbUp size={16} aria-hidden /> {voted ? 'Thanks for your feedback' : 'Helpful'}
          {helpful > 0 && <span className="tabular-nums text-ink-500">({helpful})</span>}
        </button>
      </div>
    </li>
  )
}

/* ============================================================ write review */

type FieldErrors = Partial<Record<'rating' | 'body' | 'name' | 'email' | 'photos', string>>

function WriteReview({ open, onClose, productId, productName }: { open: boolean; onClose: () => void; productId: number; productName: string }) {
  const id = useId()
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])

  const close = () => {
    onClose()
    if (state === 'done') {
      setState('idle')
      setStars(0)
      setPhotos([])
      formRef.current?.reset()
    }
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('productId', String(productId))
    fd.set('rating', String(stars))
    fd.delete('photos')
    for (const p of photos) fd.append('photos', p.file)
    const local: FieldErrors = {}
    if (!stars) local.rating = 'Choose a star rating.'
    if (String(fd.get('body') ?? '').trim().length < 10) local.body = 'Tell us a little more (at least 10 characters).'
    setErrors(local)
    if (Object.keys(local).length) return setMessage('Please check the highlighted fields.')
    setState('sending')
    setMessage(null)
    try {
      const res = await fetch('/api/reviews/submit', { method: 'POST', body: fd })
      const json = (await res.json()) as { ok?: boolean; error?: string; errors?: FieldErrors }
      if (!res.ok) {
        setErrors(json.errors ?? {})
        setMessage(json.error ?? 'Something went wrong. Please try again.')
        setState('idle')
        return
      }
      setState('done')
    } catch {
      setMessage('We couldn’t send your review. Check your connection and try again.')
      setState('idle')
    }
  }

  const err = (k: keyof FieldErrors) => (errors[k] ? <p id={`${id}-${k}-err`} className="mt-1 text-sm text-danger-600">{errors[k]}</p> : null)
  const field = 'mt-1.5 w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-base outline-none focus:border-ink-900 focus:shadow-[0_0_0_4px_var(--color-sunset-100)] aria-[invalid=true]:border-danger-600'

  return (
    <Drawer open={open} onClose={close} side="right" title={state === 'done' ? 'Thank you!' : 'Write a review'}>
      {state === 'done' ? (
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-success-50 text-success-600">
            <IconCircleCheck size={32} />
          </span>
          <p className="text-xl font-bold">Your review is on its way</p>
          <p className="text-ink-600">Our team checks every review before it appears, usually within a day. Thanks for helping other shoppers.</p>
          <Button variant="dark" onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-5 p-5">
          <p className="text-sm text-ink-600">
            Reviewing <strong className="text-ink-900">{productName}</strong>
          </p>
          <fieldset aria-describedby={errors.rating ? `${id}-rating-err` : undefined}>
            <legend className="text-sm font-semibold">Your rating</legend>
            <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer rounded-md p-0.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sunset-600" onMouseEnter={() => setHover(n)}>
                  <input type="radio" name="stars" value={n} checked={stars === n} onChange={() => setStars(n)} className="sr-only" />
                  <IconStarFilled size={32} className={cn('transition-colors', (hover || stars) >= n ? 'text-star' : 'text-ink-200')} aria-hidden />
                  <span className="sr-only">
                    {n} star{n > 1 ? 's' : ''}
                  </span>
                </label>
              ))}
            </div>
            {err('rating')}
          </fieldset>
          <label className="text-sm font-semibold">
            Headline <span className="font-normal text-ink-500">(optional)</span>
            <input name="title" maxLength={100} className={field} placeholder="e.g. My skin has never felt calmer" />
          </label>
          <label className="text-sm font-semibold">
            Your review
            <textarea
              name="body"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              aria-invalid={Boolean(errors.body)}
              aria-describedby={errors.body ? `${id}-body-err` : undefined}
              className={field}
              placeholder="What did you like? How do you use it? Who would you recommend it to?"
            />
            {err('body')}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Name to show
              <input name="name" required maxLength={60} autoComplete="given-name" aria-invalid={Boolean(errors.name)} className={field} placeholder="e.g. Nadeesha K." />
              {err('name')}
            </label>
            <label className="text-sm font-semibold">
              Email <span className="font-normal text-ink-500">(private)</span>
              <input name="email" type="email" required maxLength={120} autoComplete="email" aria-invalid={Boolean(errors.email)} className={field} placeholder="you@example.com" />
              {err('email')}
            </label>
          </div>
          <div>
            <p className="text-sm font-semibold">
              Photos <span className="font-normal text-ink-500">(optional, up to 3)</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className="relative size-20 overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Selected photo ${i + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((list) => list.filter((x) => x !== p))}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink-900/80 text-white"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <label className="grid size-20 cursor-pointer place-items-center rounded-lg border border-dashed border-line-strong text-ink-500 hover:border-ink-900 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sunset-600">
                  <IconCamera size={22} aria-hidden />
                  <span className="sr-only">Add photos</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const files = [...(e.target.files ?? [])].filter((f) => f.size <= 5 * 1024 * 1024).slice(0, 3 - photos.length)
                      setPhotos((list) => [...list, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-500">JPG, PNG or WebP, up to 5 MB each.</p>
            {err('photos')}
          </div>
          {/* Honeypot for bots: hidden from people and assistive tech */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
          {message && (
            <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2.5 text-sm text-danger-600">
              {message}
            </p>
          )}
          <Button type="submit" size="lg" loading={state === 'sending'}>
            Submit review
          </Button>
          <p className="text-xs text-ink-500">By submitting, you agree that we may publish your review, name and photos on this site. Your email is kept private.</p>
        </form>
      )}
    </Drawer>
  )
}
