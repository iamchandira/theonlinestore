import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/**
 * Typo-tolerant product search (TOS-201) on PostgreSQL `pg_trgm`.
 *
 * Each product keeps a lower-cased `search_text` (brand, name, categories, concerns, tags, gift
 * taxonomies, variant labels, type), maintained by the Products beforeChange hook. A query matches
 * when every word is found in it, either exactly (substring) or approximately (trigram word
 * similarity), or when the whole query matches with spaces removed ("cera ve" → "cerave").
 * Results are ranked by name matches first, then overall similarity, then popularity.
 *
 * Works in Server Components and Payload endpoints alike (it only needs the Payload instance).
 */

type Row = Record<string, unknown>
type Drizzle = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Row[] }> }
const db = (payload: Payload) => (payload.db as unknown as { drizzle: Drizzle }).drizzle

/** Lower-case, strip punctuation (keeps letters incl. accents, digits, % and -), collapse spaces. */
export function normalizeQuery(q: string) {
  return q
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}%\- ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/*
 * The pg_trgm / fuzzystrmatch extensions and the GIN trigram index on products.search_text are
 * declared in payload.config.ts (postgresAdapter `extensions` + `afterSchemaInit`), so Payload's
 * schema sync and migrations create them.
 */

/** How close a word must be to count as a typo match (0–1). Short words need to match exactly. */
const fuzzyThreshold = (term: string) => (term.length <= 3 ? null : term.length <= 5 ? 0.5 : 0.45)

/**
 * Published product ids matching `q`, best first. Returns at most `limit` ids.
 * An empty or 1-character query returns [].
 */
export async function searchProductIds(payload: Payload, q: string, limit = 400): Promise<number[]> {
  const norm = normalizeQuery(q)
  if (norm.length < 2) return []
  const terms = norm.split(' ').filter(Boolean).slice(0, 6)
  const compact = norm.replace(/\s+/g, '')

  const termConds = terms.map((t) => {
    const like = `%${t}%`
    const th = fuzzyThreshold(t)
    return th == null ? sql`p.search_text ILIKE ${like}` : sql`(p.search_text ILIKE ${like} OR word_similarity(${t}, p.search_text) >= ${th})`
  })
  const allTerms = termConds.reduce((acc, c) => sql`${acc} AND ${c}`)
  const startsWith = `${norm}%`
  const contains = `%${norm}%`
  const compactLike = `%${compact}%`

  const { rows } = await db(payload).execute(sql`
    SELECT p.id,
      (CASE WHEN lower(p.name) LIKE ${startsWith} THEN 3 ELSE 0 END)
      + (CASE WHEN lower(p.name) LIKE ${contains} THEN 1.5 ELSE 0 END)
      + (CASE WHEN p.search_text LIKE ${contains} THEN 1 ELSE 0 END)
      + (CASE WHEN replace(p.search_text, ' ', '') LIKE ${compactLike} THEN 2 ELSE 0 END)
      + word_similarity(${norm}, p.search_text)
      + ln(1 + coalesce(p.sales_count, 0)) / 20 AS score
    FROM products p
    WHERE p._status = 'published'
      AND ((${allTerms}) OR replace(p.search_text, ' ', '') LIKE ${compactLike})
    ORDER BY score DESC, p.id
    LIMIT ${limit}
  `)
  return rows.map((r) => Number(r.id))
}

export type SuggestBrand = { name: string; slug: string }
export type SuggestCategory = { id: number; name: string; slug: string }

/** Brands and categories whose names match the query, typos included (for autosuggest). */
export async function suggestTaxonomies(payload: Payload, q: string) {
  const norm = normalizeQuery(q)
  if (norm.length < 2) return { brands: [] as SuggestBrand[], categories: [] as SuggestCategory[] }
  const compactLike = `%${norm.replace(/\s+/g, '')}%`
  const contains = `%${norm}%`
  const match = (table: 'brands' | 'categories') => sql`
    SELECT id, name, slug,
      greatest(similarity(lower(name), ${norm}), word_similarity(${norm}, lower(name)))
      + (CASE WHEN lower(name) LIKE ${contains} THEN 1 ELSE 0 END) AS score
    FROM ${sql.raw(table)}
    WHERE lower(name) LIKE ${contains}
      OR replace(lower(name), ' ', '') LIKE ${compactLike}
      OR word_similarity(${norm}, lower(name)) >= 0.5
      OR similarity(lower(name), ${norm}) >= 0.35
      OR (length(${norm}) >= 5 AND levenshtein(lower(name), ${norm}) <= 2)
    ORDER BY score DESC
    LIMIT 3
  `
  const [b, c] = await Promise.all([db(payload).execute(match('brands')), db(payload).execute(match('categories'))])
  return {
    brands: b.rows.map((r) => ({ name: String(r.name), slug: String(r.slug) })),
    categories: c.rows.map((r) => ({ id: Number(r.id), name: String(r.name), slug: String(r.slug) })),
  }
}

/* ------------------------------------------------------------- did you mean */

/** Optimal string alignment distance (Levenshtein + adjacent swaps, so "cervae" → "cerave" is 1). */
function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      rowMin = Math.min(rowMin, d[i][j])
    }
    if (rowMin > max) return max + 1
  }
  return d[a.length][b.length]
}

const vocabCache = globalThis as { __tosSearchVocab?: { at: number; words: Map<string, number> } }

/** Every word in published products' search text, with how many products use it (cached 5 minutes). */
async function vocabulary(payload: Payload) {
  const cached = vocabCache.__tosSearchVocab
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.words
  const { rows } = await db(payload).execute(sql`
    SELECT word, count(*)::int AS n FROM (
      SELECT regexp_split_to_table(search_text, '\\s+') AS word FROM products WHERE _status = 'published'
    ) w WHERE length(word) >= 3 GROUP BY word
  `)
  const words = new Map(rows.map((r) => [String(r.word), Number(r.n)]))
  vocabCache.__tosSearchVocab = { at: Date.now(), words }
  return words
}

/**
 * Suggests a corrected query for zero-result searches, word by word, using the store's own
 * vocabulary (brand, category, concern and product-name words). Returns null when nothing is close.
 */
export async function didYouMean(payload: Payload, q: string): Promise<string | null> {
  const norm = normalizeQuery(q)
  if (norm.length < 3) return null
  const vocab = await vocabulary(payload)
  let changed = false
  const fixed = norm.split(' ').map((term) => {
    if (term.length < 3 || vocab.has(term)) return term
    const max = term.length >= 7 ? 2 : 1
    let best = term
    let bestDist = max + 1
    let bestUse = 0
    for (const [w, uses] of vocab) {
      const dist = editDistance(term, w, max)
      if (dist < bestDist || (dist === bestDist && uses > bestUse)) {
        best = w
        bestDist = dist
        bestUse = uses
      }
    }
    if (bestDist > max) return term
    changed = true
    return best
  })
  return changed ? fixed.join(' ') : null
}

/* -------------------------------------------------------- search analytics */

/**
 * Records a storefront search (TOS-208): one row per normalised term per day, with the number of
 * searches and the latest result count. Fire-and-forget; never throws.
 */
export async function logSearch(payload: Payload, q: string, results: number) {
  const term = normalizeQuery(q)
  if (term.length < 2) return
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }) // YYYY-MM-DD in Sri Lanka
  try {
    await db(payload).execute(sql`
      INSERT INTO search_queries (term, day, count, results, updated_at, created_at)
      VALUES (${term}, ${day}, 1, ${results}, now(), now())
      ON CONFLICT (term, day) DO UPDATE SET count = search_queries.count + 1, results = EXCLUDED.results, updated_at = now()
    `)
  } catch (err) {
    payload.logger.warn({ err }, 'Search analytics: could not record search')
  }
}
