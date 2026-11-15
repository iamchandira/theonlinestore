import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Refresh cached storefront pages after catalogue edits.
 * Safe outside Next.js (seed scripts, tests): there is no static-generation store there, so we skip.
 * Pass `context: { disableRevalidate: true }` to opt out for bulk operations.
 */
/**
 * Bumped on every catalogue change so in-memory caches (e.g. listing facets) know to rebuild.
 * Lives on globalThis so every module copy (route handlers, server components) sees the same value.
 */
export const catalogVersion = () => ((globalThis as { __tosCatalogVersion?: number }).__tosCatalogVersion ??= 0)
export const bumpCatalogVersion = () => {
  const g = globalThis as { __tosCatalogVersion?: number }
  g.__tosCatalogVersion = (g.__tosCatalogVersion ?? 0) + 1
}

export async function revalidate(paths: string[]) {
  bumpCatalogVersion()
  try {
    const { revalidatePath } = await import('next/cache')
    for (const p of paths) revalidatePath(p, p === '/' ? 'layout' : 'page')
  } catch {
    /* not running inside Next.js */
  }
}

export const revalidateStorefront =
  (pathsFor: (doc: Record<string, unknown>) => string[]): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, context }) => {
    if (context?.disableRevalidate) {
      bumpCatalogVersion()
      return doc
    }
    const paths = new Set(['/', ...pathsFor(doc), ...(previousDoc ? pathsFor(previousDoc) : [])])
    await revalidate([...paths])
    return doc
  }

export const revalidateStorefrontOnDelete =
  (pathsFor: (doc: Record<string, unknown>) => string[]): CollectionAfterDeleteHook =>
  async ({ doc, context }) => {
    if (context?.disableRevalidate) {
      bumpCatalogVersion()
      return doc
    }
    await revalidate(['/', ...pathsFor(doc)])
    return doc
  }
