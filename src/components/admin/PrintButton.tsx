'use client'

/** Opens the browser's print dialog ("Save as PDF" is one of its destinations). */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  )
}
