/**
 * Refreshes every storefront page after a settings change. A no-op outside a Next.js request (scripts,
 * tests), so settings hooks can call it from anywhere.
 */
export function refreshStoreSettings() {
  bumpSettingsVersion()
  import('next/cache')
    .then(({ revalidatePath }) => revalidatePath('/', 'layout'))
    .catch(() => {})
}

/** Counter bumped on every settings save; in-memory caches built from settings (the shopping assistant's knowledge) check it. */
export const settingsVersion = () => ((globalThis as { __tosSettingsVersion?: number }).__tosSettingsVersion ??= 0)
export function bumpSettingsVersion() {
  const g = globalThis as { __tosSettingsVersion?: number }
  g.__tosSettingsVersion = (g.__tosSettingsVersion ?? 0) + 1
}
