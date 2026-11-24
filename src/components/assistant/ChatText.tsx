import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'

/**
 * Renders the assistant's text safely: paragraphs, bullet and numbered lists, **bold**, and links to
 * pages on this site only. Never raw HTML; other links show as plain text.
 */

const SITE = /^https?:\/\/(www\.)?theonlinestore\.lk/i

/** "/returns", "https://theonlinestore.lk/p/x" → internal path; anything else → null */
export function internalPath(href: string) {
  const h = href.trim().replace(SITE, '')
  return /^\/(?!\/)[\w\-/?=&%.#]*$/.test(h) ? h || '/' : null
}

function inline(text: string, key: string): ReactNode[] {
  // [label](href) | **bold** | bare /path
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|(?<![\w/])(\/(?:p|c|brands|offers|gifts|returns|terms|privacy|track-order|categories|search|wishlist|account)(?:\/[\w\-/?=&%.]*)?)/g
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={`${key}t${i++}`}>{text.slice(last, m.index)}</Fragment>)
    if (m[1]) {
      const path = internalPath(m[2])
      out.push(
        path ? (
          <Link key={`${key}l${i++}`} href={path} className="font-semibold text-sunset-700 underline underline-offset-2">
            {m[1]}
          </Link>
        ) : (
          <Fragment key={`${key}x${i++}`}>{m[1]}</Fragment>
        ),
      )
    } else if (m[3]) out.push(<strong key={`${key}b${i++}`}>{m[3]}</strong>)
    else if (m[4]) {
      const path = m[4].replace(/[.,)]+$/, '')
      out.push(
        <Link key={`${key}p${i++}`} href={path} className="font-semibold text-sunset-700 underline underline-offset-2">
          {path}
        </Link>,
      )
      if (path.length < m[4].length) out.push(<Fragment key={`${key}r${i++}`}>{m[4].slice(path.length)}</Fragment>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(<Fragment key={`${key}e`}>{text.slice(last)}</Fragment>)
  return out
}

export function ChatText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r/g, '').split('\n')
  let list: { ordered: boolean; items: string[] } | null = null
  let para: string[] = []
  const flushPara = () => {
    if (para.length) blocks.push(<p key={`p${blocks.length}`}>{inline(para.join(' '), `p${blocks.length}`)}</p>)
    para = []
  }
  const flushList = () => {
    if (!list) return
    const items = list.items.map((it, j) => <li key={j}>{inline(it, `l${blocks.length}-${j}`)}</li>)
    blocks.push(
      list.ordered ? (
        <ol key={`o${blocks.length}`} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={`u${blocks.length}`} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      ),
    )
    list = null
  }
  for (const raw of lines) {
    const line = raw.trim()
    const bullet = line.match(/^(?:[-*•])\s+(.*)$/)
    const numbered = line.match(/^\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      flushPara()
      const ordered = Boolean(numbered)
      if (list && list.ordered !== ordered) flushList()
      list ??= { ordered, items: [] }
      list.items.push((bullet ?? numbered)![1])
    } else if (!line) {
      flushPara()
      flushList()
    } else {
      flushList()
      para.push(line.replace(/^#+\s*/, ''))
    }
  }
  flushPara()
  flushList()
  return <div className="flex flex-col gap-2">{blocks}</div>
}
