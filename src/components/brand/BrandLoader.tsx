import { cn } from '@/lib/utils/cn'

/**
 * Brand loading indicator: the smiling bag with animated speed lines.
 * Pure SVG + CSS (no JS), so it works in loading.tsx and Suspense fallbacks.
 */
export function BrandLoader({ size = 56, label = 'Loading', className }: { size?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('inline-flex flex-col items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
        <defs>
          <linearGradient id="bag-grad" x1="16" y1="18" x2="54" y2="50" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff8a00" />
            <stop offset="0.55" stopColor="#ff4d2e" />
            <stop offset="1" stopColor="#ff1f66" />
          </linearGradient>
        </defs>
        {/* speed lines */}
        <g className="animate-speed" strokeLinecap="round" strokeWidth="3.5" stroke="#ff7a2e">
          <path d="M6 27h7" />
          <path d="M3 33h10" style={{ animationDelay: '120ms' }} />
          <path d="M6 39h7" />
        </g>
        <g className="origin-center animate-bob">
          {/* handle */}
          <path d="M28 18v-3a7 7 0 0 1 14 0v3" stroke="#0e1a33" strokeWidth="4" strokeLinecap="round" />
          {/* bag body */}
          <path d="M20.5 20h29a3.5 3.5 0 0 1 3.5 3.2l1.6 21.6A4 4 0 0 1 50.6 49H19.4a4 4 0 0 1-4-4.2L17 23.2A3.5 3.5 0 0 1 20.5 20Z" fill="url(#bag-grad)" />
          {/* wink + smile */}
          <path d="M26 29.5c1-1.6 3-1.6 4 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M25 40c6 3.6 14 2.4 20-7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          {/* wheels */}
          <circle cx="25" cy="55" r="3.5" fill="#ff6a1f" />
          <circle cx="45" cy="55" r="3.5" fill="#ff3d4f" />
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  )
}
