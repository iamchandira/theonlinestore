'use client'

import { IconBrandWhatsapp, IconCircleCheck, IconMail } from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { useStoreSettings } from '@/lib/store/StoreSettingsProvider'

/** Newsletter sign-up with inline validation and a friendly success state (wired to email provider in Sprint 7). */
export function Newsletter({ title = 'Be the first to know', text = 'New arrivals, restocks and members-only deals. No spam, unsubscribe anytime.' }: { title?: string; text?: string }) {
  const { contact } = useStoreSettings()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  return (
    <section aria-labelledby="news-title" className="container-site py-10 md:py-14">
      <div className="relative overflow-hidden rounded-2xl bg-ink-900 px-6 py-10 text-white md:px-12 md:py-14">
        <div aria-hidden className="absolute -left-20 -top-24 size-80 rounded-full bg-sunset-500/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 right-0 size-80 rounded-full bg-rose-500/25 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="flex flex-col gap-3">
            <LogoMark size={52} />
            <h2 id="news-title" className="text-3xl font-bold text-white md:text-4xl">
              {title}
            </h2>
            <p className="max-w-md text-ink-300">{text}</p>
          </div>
          <div>
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.p
                  key="done"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl bg-white/10 p-4 font-semibold"
                  role="status"
                >
                  <IconCircleCheck size={26} className="text-success-50" /> You’re in! Check your inbox for your welcome code.
                </motion.p>
              ) : (
                <motion.form
                  key="form"
                  exit={{ opacity: 0, y: -10 }}
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.')
                    setError('')
                    setDone(true)
                  }}
                  className="flex flex-col gap-2"
                >
                  <label htmlFor="news-email" className="sr-only">
                    Email address
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex h-13 flex-1 items-center gap-2 rounded-full bg-white px-5 text-ink-900 focus-within:ring-4 focus-within:ring-sunset-500/40">
                      <IconMail size={20} className="text-ink-500" aria-hidden />
                      <input
                        id="news-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? 'news-error' : undefined}
                        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-500 focus-visible:outline-none"
                      />
                    </div>
                    <Button type="submit" variant="gradient" size="lg">
                      Subscribe
                    </Button>
                  </div>
                  {error && (
                    <p id="news-error" className="pl-5 text-sm font-medium text-rose-300">
                      {error}
                    </p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
            {contact.whatsapp && (
              <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-200 hover:text-white">
                <IconBrandWhatsapp size={19} className="text-[#3ddc84]" /> Prefer WhatsApp? Join our deals channel
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
