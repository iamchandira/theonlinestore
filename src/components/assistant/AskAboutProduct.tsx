'use client'

import { IconMessageChatbot } from '@tabler/icons-react'

import { useStoreSettings } from '@/lib/store/StoreSettingsProvider'

import { useChat } from './ChatProvider'

/** "Ask about this product" on the product page: opens the shopping assistant with this product in mind. */
export function AskAboutProduct({ slug, name }: { slug: string; name: string }) {
  const chat = useChat()
  const store = useStoreSettings()
  if (!chat || !store.assistant) return null
  return (
    <button
      type="button"
      onClick={() => chat.openWith({ product: { slug, name } })}
      className="group flex w-full items-center gap-3 rounded-xl border border-sunset-200 bg-sunset-50/70 px-4 py-3 text-left transition-colors hover:border-sunset-400 hover:bg-sunset-50"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunset-gradient text-white" aria-hidden>
        <IconMessageChatbot size={19} stroke={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink-900">Questions about this product?</span>
        <span className="block text-xs text-ink-600">Ask {store.assistant.name}: how to use it, if it suits you, sizes…</span>
      </span>
    </button>
  )
}
