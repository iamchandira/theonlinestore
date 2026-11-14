/**
 * WCAG 2.2 contrast check for the brand's text/background pairs.
 * Run: pnpm check:contrast    (exits 1 if any required pair fails)
 * Keep this list in sync with docs/05-brand-and-design-system.md › Accessible colour pairs.
 */

type Pair = { fg: string; bg: string; use: string; min: 4.5 | 3 }

const pairs: Pair[] = [
  { fg: '#0e1a33', bg: '#faf8f6', use: 'Body text on canvas', min: 4.5 },
  { fg: '#0e1a33', bg: '#ffffff', use: 'Body text on cards', min: 4.5 },
  { fg: '#5b6b85', bg: '#faf8f6', use: 'Muted text on canvas', min: 4.5 },
  { fg: '#5b6b85', bg: '#ffffff', use: 'Muted text on cards', min: 4.5 },
  { fg: '#ffffff', bg: '#d9390a', use: 'Primary button (sunset-600)', min: 4.5 },
  { fg: '#ffffff', bg: '#b52e08', use: 'Primary button hover (sunset-700)', min: 4.5 },
  { fg: '#d9390a', bg: '#ffffff', use: 'Links / eyebrow text', min: 4.5 },
  { fg: '#e0115a', bg: '#ffffff', use: 'Sale price (rose-600)', min: 4.5 },
  { fg: '#ffffff', bg: '#e0115a', use: 'Sale badge', min: 4.5 },
  { fg: '#ffffff', bg: '#0e1a33', use: 'Dark button / footer headings', min: 4.5 },
  { fg: '#aeb9cb', bg: '#0e1a33', use: 'Footer text (ink-300)', min: 4.5 },
  { fg: '#8090a8', bg: '#0e1a33', use: 'Footer fine print (ink-400)', min: 4.5 },
  { fg: '#ffffff', bg: '#d9390a', use: 'Deep gradient start (text on gradient)', min: 4.5 },
  { fg: '#ffffff', bg: '#d4204a', use: 'Deep gradient middle', min: 4.5 },
  { fg: '#ffffff', bg: '#c8104f', use: 'Deep gradient end', min: 4.5 },
  { fg: '#b52e08', bg: '#fff4ed', use: 'Soft button (sunset-700 on sunset-50)', min: 4.5 },
  { fg: '#6b4300', bg: '#ffe7b8', use: 'Bestseller badge', min: 4.5 },
  { fg: '#8f260b', bg: '#ffe6d5', use: 'Trending badge', min: 4.5 },
  { fg: '#5b2a9b', bg: '#efe6fb', use: 'Limited badge', min: 4.5 },
  { fg: '#0f7b55', bg: '#ecf8f2', use: 'Success message', min: 4.5 },
  { fg: '#b45309', bg: '#ffffff', use: 'Low-stock warning', min: 4.5 },
  { fg: '#d92d20', bg: '#ffffff', use: 'Form error', min: 4.5 },
  { fg: '#b80c49', bg: '#fcedee', use: 'Rose-700 on beauty tint', min: 4.5 },
  { fg: '#d9390a', bg: '#faf8f6', use: 'Focus ring vs canvas (non-text)', min: 3 },
]

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

let failed = 0
for (const p of pairs) {
  const r = ratio(p.fg, p.bg)
  const ok = r >= p.min
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (min ${p.min})  ${p.fg} on ${p.bg}  ${p.use}`)
}
console.log(failed ? `\n${failed} pair(s) fail WCAG AA` : `\nAll ${pairs.length} pairs meet WCAG 2.2 AA`)
process.exit(failed ? 1 : 0)
