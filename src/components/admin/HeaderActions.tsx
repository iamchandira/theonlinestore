'use client'

import { IconExternalLink, IconSearch } from '@tabler/icons-react'

/** Top-right admin actions on every screen: command palette + view the store. */
export function HeaderActions() {
  return (
    <div className="tos-header-actions">
      <button type="button" className="tos-btn tos-btn--sm tos-btn--ghost" onClick={() => window.dispatchEvent(new Event('tos:cmdk'))} aria-label="Search (Command K)">
        <IconSearch size={16} />
        <span className="tos-header-actions__label">Search</span>
        <kbd className="tos-header-actions__label" style={{ font: '600 11px var(--font-body)', color: 'var(--tos-muted)' }}>⌘K</kbd>
      </button>
      <a className="tos-btn tos-btn--sm" href="/" target="_blank" rel="noopener noreferrer" aria-label="View store (opens in a new tab)">
        <IconExternalLink size={16} />
        <span className="tos-header-actions__label">View store</span>
      </a>
    </div>
  )
}
