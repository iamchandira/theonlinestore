import { Fraunces, Outfit, Plus_Jakarta_Sans } from 'next/font/google'

/** Display and headings: geometric, rounded, echoes the logo wordmark. */
export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

/** UI and body copy: highly legible at small sizes. */
export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

/** Serif accent for beauty campaign headlines only (used sparingly). */
export const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['italic', 'normal'],
  weight: ['500', '600'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const fontVariables = `${outfit.variable} ${jakarta.variable} ${fraunces.variable}`
