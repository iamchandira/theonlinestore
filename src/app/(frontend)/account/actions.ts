'use server'

import { randomBytes } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { DISTRICT_NAMES } from '@/config/districts'
import { getCurrentUser, requestIp, safeNext } from '@/lib/auth/server'
import { getPayloadClient } from '@/lib/catalog/server'
import { deletionRequested, verifyEmail } from '@/lib/email/templates'
import { allow } from '@/lib/server/rateLimit'
import type { User } from '@/payload-types'

/**
 * Storefront account actions (Sprint 3: TOS-301 → 306). Every action validates on the server,
 * is rate-limited per IP, and never reveals whether an email address has an account (except at
 * sign-up, where saying so is the friendlier answer).
 */

export type FormState = { ok?: boolean; message?: string; error?: string; fields?: Record<string, string>; values?: Record<string, string> } | null

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^(\+94|0)?7\d{8}$/
const str = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? '').trim().slice(0, max)
const normPhone = (p: string) => p.replace(/[\s-]/g, '')
const tooMany = (what: string): FormState => ({ error: `Too many ${what} from this connection. Please wait a little and try again.` })

async function setAuthCookie(token: string, exp: number | undefined, remember: boolean) {
  const payload = await getPayloadClient()
  ;(await cookies()).set(`${payload.config.cookiePrefix}-token`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // "Remember me": keep the session for 30 days; otherwise it ends when the browser closes
    ...(remember && exp ? { expires: new Date(exp * 1000) } : {}),
  })
}

/* ------------------------------------------------------------- sign in/up */

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email', 120).toLowerCase()
  const password = String(fd.get('password') ?? '')
  const remember = fd.get('remember') === 'on'
  const values = { email }
  if (!allow(`login:${await requestIp()}`, 20, 15 * 60 * 1000)) return { ...tooMany('sign-in attempts'), values }
  if (!EMAIL.test(email) || !password) return { error: 'Enter your email and password.', values }

  const payload = await getPayloadClient()
  try {
    const res = await payload.login({ collection: 'users', data: { email, password } })
    if (!res.token) return { error: 'We couldn’t sign you in. Please try again.', values }
    await setAuthCookie(res.token, res.exp, remember)
  } catch (err) {
    const name = (err as Error).name
    if (name === 'UnverifiedEmail') return { error: 'Please confirm your email first. We sent you a link when you signed up.', values: { ...values, unverified: '1' } }
    if (name === 'LockedAuth') return { error: 'Too many wrong passwords. Your account is locked for 15 minutes for your safety.', values }
    return { error: 'That email and password don’t match. Check them, or reset your password.', values }
  }
  redirect(safeNext(fd.get('next')))
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const v = {
    fullName: str(fd, 'fullName', 80),
    email: str(fd, 'email', 120).toLowerCase(),
    phone: normPhone(str(fd, 'phone', 20)),
  }
  const password = String(fd.get('password') ?? '')
  const marketing = fd.get('marketing') === 'on'
  const fields: Record<string, string> = {}
  if (v.fullName.length < 2) fields.fullName = 'Enter your name.'
  if (!EMAIL.test(v.email)) fields.email = 'Enter a valid email address.'
  if (v.phone && !PHONE.test(v.phone)) fields.phone = 'Enter a Sri Lankan mobile number, e.g. 077 123 4567.'
  if (password.length < 8) fields.password = 'Use at least 8 characters.'
  else if (/^\d+$/.test(password)) fields.password = 'Mix in some letters, not just numbers.'
  if (fd.get('terms') !== 'on') fields.terms = 'Please accept the terms to continue.'
  if (Object.keys(fields).length) return { error: 'Please check the highlighted fields.', fields, values: v }
  if (!allow(`register:${await requestIp()}`, 5, 60 * 60 * 1000)) return { ...tooMany('sign-ups'), values: v }
  if (String(fd.get('website') ?? '')) return { ok: true, message: v.email } // honeypot

  const payload = await getPayloadClient()
  const exists = await payload.count({ collection: 'users', where: { email: { equals: v.email } }, overrideAccess: true })
  if (exists.totalDocs) return { error: 'An account with this email already exists. Sign in, or reset your password if you’ve forgotten it.', values: v, fields: { email: 'Already registered' } }
  try {
    await payload.create({
      collection: 'users',
      data: {
        email: v.email,
        password,
        fullName: v.fullName,
        phone: v.phone || undefined,
        marketingOptIn: marketing,
        marketingChannels: marketing ? ['email', 'sms', 'whatsapp'] : [],
        roles: ['customer'],
      },
      overrideAccess: false,
    })
  } catch (err) {
    payload.logger.error({ err }, 'Registration failed')
    return { error: 'We couldn’t create your account just now. Please try again.', values: v }
  }
  return { ok: true, message: v.email }
}

/** Sends a fresh confirmation link to an unverified account (generic answer either way). */
export async function resendVerificationAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email', 120).toLowerCase()
  const done: FormState = { ok: true, message: 'If that account is waiting for confirmation, we’ve sent a new link. Check your inbox and spam folder.' }
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.' }
  if (!allow(`resend:${await requestIp()}`, 3, 60 * 60 * 1000)) return tooMany('requests')
  const payload = await getPayloadClient()
  const user = (await payload.find({ collection: 'users', where: { and: [{ email: { equals: email } }, { _verified: { not_equals: true } }] }, limit: 1, overrideAccess: true })).docs[0]
  if (!user) return done
  const token = randomBytes(20).toString('hex')
  const db = (payload.db as unknown as { drizzle: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> } }).drizzle
  await db.execute(sql`UPDATE users SET _verificationtoken = ${token} WHERE id = ${user.id}`)
  await payload.sendEmail({ to: email, subject: 'Confirm your email · The Online Store', html: verifyEmail(user.fullName, token) })
  return done
}

/* --------------------------------------------------------- password reset */

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email', 120).toLowerCase()
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.', values: { email } }
  // TOS-303: 5 requests per hour per IP
  if (!allow(`forgot:${await requestIp()}`, 5, 60 * 60 * 1000)) return tooMany('reset requests')
  const payload = await getPayloadClient()
  try {
    await payload.forgotPassword({ collection: 'users', data: { email } })
  } catch (err) {
    payload.logger.warn({ err }, 'Forgot password failed')
  }
  // The same answer whether or not the email has an account
  return { ok: true, message: email }
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, 'token', 200)
  const password = String(fd.get('password') ?? '')
  if (password.length < 8) return { error: 'Use at least 8 characters.', fields: { password: 'Use at least 8 characters.' } }
  if (String(fd.get('confirm') ?? '') !== password) return { error: 'The passwords don’t match.', fields: { confirm: 'Doesn’t match' } }
  if (!allow(`reset:${await requestIp()}`, 10, 60 * 60 * 1000)) return tooMany('attempts')
  const payload = await getPayloadClient()
  try {
    const res = await payload.resetPassword({ collection: 'users', data: { token, password }, overrideAccess: true })
    if (res.token) await setAuthCookie(res.token, undefined, false)
  } catch {
    return { error: 'This reset link has expired or was already used. Ask for a new one below.', values: { expired: '1' } }
  }
  redirect('/account?reset=1')
}

/* ---------------------------------------------------------------- profile */

async function me(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect('/account/login')
  return user
}

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me()
  const fullName = str(fd, 'fullName', 80)
  const phone = normPhone(str(fd, 'phone', 20))
  const fields: Record<string, string> = {}
  if (fullName.length < 2) fields.fullName = 'Enter your name.'
  if (phone && !PHONE.test(phone)) fields.phone = 'Enter a Sri Lankan mobile number, e.g. 077 123 4567.'
  if (Object.keys(fields).length) return { error: 'Please check the highlighted fields.', fields, values: { fullName, phone } }
  const payload = await getPayloadClient()
  await payload.update({ collection: 'users', id: user.id, data: { fullName, phone: phone || null }, user, overrideAccess: false })
  revalidatePath('/account', 'layout')
  return { ok: true, message: 'Your details are saved.' }
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me()
  const current = String(fd.get('current') ?? '')
  const next = String(fd.get('password') ?? '')
  if (next.length < 8) return { error: 'Use at least 8 characters for the new password.', fields: { password: 'At least 8 characters' } }
  if (!allow(`chpw:${user.id}`, 5, 15 * 60 * 1000)) return tooMany('attempts')
  const payload = await getPayloadClient()
  try {
    await payload.login({ collection: 'users', data: { email: user.email, password: current } })
  } catch {
    return { error: 'Your current password isn’t right.', fields: { current: 'Incorrect' } }
  }
  await payload.update({ collection: 'users', id: user.id, data: { password: next }, user, overrideAccess: false })
  const res = await payload.login({ collection: 'users', data: { email: user.email, password: next } })
  if (res.token) await setAuthCookie(res.token, res.exp, true)
  return { ok: true, message: 'Password changed.' }
}

/* -------------------------------------------------------------- addresses */

type Address = NonNullable<User['addresses']>[number]

export async function saveAddressAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me()
  const v = {
    id: str(fd, 'id', 40),
    label: str(fd, 'label', 30) || 'Home',
    recipientName: str(fd, 'recipientName', 80),
    phone: normPhone(str(fd, 'phone', 20)),
    line1: str(fd, 'line1', 120),
    line2: str(fd, 'line2', 120),
    city: str(fd, 'city', 60),
    district: str(fd, 'district', 40),
    postalCode: str(fd, 'postalCode', 10),
    landmark: str(fd, 'landmark', 120),
    isDefault: fd.get('isDefault') === 'on' ? 'on' : '',
  }
  const fields: Record<string, string> = {}
  if (v.recipientName.length < 2) fields.recipientName = 'Who should receive the parcel?'
  if (!PHONE.test(v.phone)) fields.phone = 'Enter a Sri Lankan mobile number for the courier.'
  if (v.line1.length < 3) fields.line1 = 'Enter the house number and street.'
  if (v.city.length < 2) fields.city = 'Enter the town or city.'
  if (!DISTRICT_NAMES.includes(v.district)) fields.district = 'Choose a district.'
  if (v.postalCode && !/^\d{5}$/.test(v.postalCode)) fields.postalCode = 'Postal codes have 5 digits.'
  if (Object.keys(fields).length) return { error: 'Please check the highlighted fields.', fields, values: v }

  const list: Address[] = [...(user.addresses ?? [])]
  const entry: Address = {
    label: v.label,
    recipientName: v.recipientName,
    phone: v.phone,
    line1: v.line1,
    line2: v.line2 || null,
    city: v.city,
    district: v.district as Address['district'],
    postalCode: v.postalCode || null,
    landmark: v.landmark || null,
    isDefault: Boolean(v.isDefault),
  }
  const at = v.id ? list.findIndex((a) => a.id === v.id) : -1
  if (at >= 0) list[at] = { ...list[at], ...entry }
  else {
    if (list.length >= 10) return { error: 'You can keep up to 10 addresses. Remove one first.' }
    list.push(entry)
  }
  if (entry.isDefault) list.forEach((a, i) => (a.isDefault = i === (at >= 0 ? at : list.length - 1)))
  const payload = await getPayloadClient()
  await payload.update({ collection: 'users', id: user.id, data: { addresses: list }, user, overrideAccess: false })
  revalidatePath('/account/addresses')
  return { ok: true, message: at >= 0 ? 'Address updated.' : 'Address added.' }
}

export async function deleteAddressAction(id: string) {
  const user = await me()
  const payload = await getPayloadClient()
  await payload.update({ collection: 'users', id: user.id, data: { addresses: (user.addresses ?? []).filter((a) => a.id !== id) }, user, overrideAccess: false })
  revalidatePath('/account/addresses')
}

export async function makeDefaultAddressAction(id: string) {
  const user = await me()
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { addresses: (user.addresses ?? []).map((a) => ({ ...a, isDefault: a.id === id })) },
    user,
    overrideAccess: false,
  })
  revalidatePath('/account/addresses')
}

/* ---------------------------------------------------------------- privacy */

export async function updateConsentAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me()
  const channels = (['email', 'sms', 'whatsapp'] as const).filter((c) => fd.get(c) === 'on')
  const payload = await getPayloadClient()
  await payload.update({ collection: 'users', id: user.id, data: { marketingOptIn: channels.length > 0, marketingChannels: channels }, user, overrideAccess: false })
  revalidatePath('/account/privacy')
  return { ok: true, message: channels.length ? 'Saved. We’ll only use the channels you ticked.' : 'Saved. You won’t receive offers; order updates still arrive.' }
}

export async function requestDeletionAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me()
  if (str(fd, 'confirm', 20).toUpperCase() !== 'DELETE') return { error: 'Type DELETE to confirm.', fields: { confirm: 'Type DELETE' } }
  const payload = await getPayloadClient()
  await payload.update({ collection: 'users', id: user.id, data: { deletionRequestedAt: new Date().toISOString() }, user, overrideAccess: false })
  await payload.sendEmail({ to: user.email, subject: 'Your account deletion request · The Online Store', html: deletionRequested(user.fullName) }).catch(() => {})
  revalidatePath('/account/privacy')
  return { ok: true, message: 'Request received. We’ll delete your account within 14 days and email you when it’s done.' }
}

export async function cancelDeletionAction() {
  const user = await me()
  const payload = await getPayloadClient()
  await payload.update({ collection: 'users', id: user.id, data: { deletionRequestedAt: null }, user, overrideAccess: false })
  revalidatePath('/account/privacy')
}
