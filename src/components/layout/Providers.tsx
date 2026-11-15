'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { SmoothScroll } from '@/lib/motion/SmoothScroll'
import { ShopProvider } from '@/lib/store/shop'

export function Providers({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user": Framer skips transform/layout animations when the OS asks for less motion
    <MotionConfig reducedMotion="user">
      <SmoothScroll />
      <AuthProvider>
      <ShopProvider>
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
      </ShopProvider>
      </AuthProvider>
    </MotionConfig>
  )
}
