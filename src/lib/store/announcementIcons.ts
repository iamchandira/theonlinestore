import {
  IconBolt,
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconCash,
  IconClock,
  IconCreditCard,
  IconDiscount,
  IconFlame,
  IconGift,
  IconHeart,
  IconMapPin,
  IconPackage,
  IconPhone,
  IconRosetteDiscountCheck,
  IconShieldCheck,
  IconSparkles,
  IconStar,
  IconTruckDelivery,
} from '@tabler/icons-react'
import { createElement, type ComponentType } from 'react'

import { NO_ICON } from './announcementIconKeys'

/**
 * Icons a store manager can pick for each announcement bar message (Admin › Settings › Store details).
 * Shared by the admin picker and the storefront bar. Add new icons at the end; keys are stored in the database.
 */
type Icon = ComponentType<{ size?: number; stroke?: number; className?: string; 'aria-hidden'?: boolean }>

export const ANNOUNCEMENT_ICONS: { value: string; label: string; Icon: Icon }[] = [
  { value: 'delivery', label: 'Delivery', Icon: IconTruckDelivery },
  { value: 'cash', label: 'Cash', Icon: IconCash },
  { value: 'card', label: 'Card', Icon: IconCreditCard },
  { value: 'genuine', label: 'Genuine', Icon: IconRosetteDiscountCheck },
  { value: 'gift', label: 'Gift', Icon: IconGift },
  { value: 'discount', label: 'Discount', Icon: IconDiscount },
  { value: 'sparkles', label: 'New', Icon: IconSparkles },
  { value: 'flame', label: 'Hot deal', Icon: IconFlame },
  { value: 'bolt', label: 'Flash sale', Icon: IconBolt },
  { value: 'clock', label: 'Time', Icon: IconClock },
  { value: 'calendar', label: 'Date', Icon: IconCalendarEvent },
  { value: 'package', label: 'Package', Icon: IconPackage },
  { value: 'secure', label: 'Secure', Icon: IconShieldCheck },
  { value: 'star', label: 'Star', Icon: IconStar },
  { value: 'heart', label: 'Heart', Icon: IconHeart },
  { value: 'location', label: 'Location', Icon: IconMapPin },
  { value: 'phone', label: 'Phone', Icon: IconPhone },
  { value: 'whatsapp', label: 'WhatsApp', Icon: IconBrandWhatsapp },
]

export { NO_ICON }

/** Older messages saved before icons could be picked keep the icons they always had (by position). */
const LEGACY = ['delivery', 'cash', 'card', 'genuine', 'gift']

export function announcementIcon(icon: string | null | undefined, index: number): Icon | null {
  if (icon === NO_ICON) return null
  const key = icon || LEGACY[index % LEGACY.length]
  return ANNOUNCEMENT_ICONS.find((i) => i.value === key)?.Icon ?? null
}

/** The icon for one message, or nothing when the manager picked "No icon". */
export function AnnouncementIcon({
  icon,
  index,
  ...rest
}: { icon: string | null | undefined; index: number; size?: number; stroke?: number; className?: string }) {
  const found = announcementIcon(icon, index)
  return found ? createElement(found, { ...rest, 'aria-hidden': true }) : null
}
