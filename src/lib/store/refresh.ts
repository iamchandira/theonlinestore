/**
 * Refreshes every storefront page after a settings change. A no-op outside a Next.js request (scripts,
 * tests), so settings hooks can call it from anywhere.
 */
export function refreshStoreSettings() {
  import('next/cache')
    .then(({ revalidatePath }) => revalidatePath('/', 'layout'))
    .catch(() => {})
}
