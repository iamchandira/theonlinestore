'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

import { ChatProvider } from '@/components/assistant/ChatProvider'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { SmoothScroll } from '@/lib/motion/SmoothScroll'
import type { StorePublic } from '@/lib/store/settings'
import { StoreSettingsProvider } from '@/lib/store/StoreSettingsProvider'
import { ShopProvider } from '@/lib/store/shop'

export function Providers({ children, store }: { children: ReactNode; store: StorePublic }) {
  return (
    // reducedMotion="user": Framer skips transform/layout animations when the OS asks for less motion
    <StoreSettingsProvider value={store}>
    <MotionConfig reducedMotion="user">
      <SmoothScroll />
      <AuthProvider>
      <ShopProvider>
      <ChatProvider>
        {children}
        <Toaster
          position="top-center"
          offset={88}
          mobileOffset={{ top: 120 }}
          toastOptions={{
            classNames: {
              toast: '!rounded-xl !border-line !bg-surface !font-sans !shadow-lift',
              title: '!font-semibold !text-ink-900',
              description: '!text-ink-600',
              actionButton: '!rounded-full !bg-ink-900 !px-3 !font-semibold',
            },
          }}
        />
      </ChatProvider>
      </ShopProvider>
      </AuthProvider>
    </MotionConfig>
    </StoreSettingsProvider>
  )
}
