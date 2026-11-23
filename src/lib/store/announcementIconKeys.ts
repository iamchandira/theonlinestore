/**
 * Keys of the icons offered for announcement bar messages (stored in the database). Kept free of React so
 * the Payload config can use it; the icons themselves are in announcementIcons.ts. Add new keys at the end.
 */
export const ANNOUNCEMENT_ICON_KEYS = [
  'delivery', 'cash', 'card', 'genuine', 'gift', 'discount', 'sparkles', 'flame', 'bolt',
  'clock', 'calendar', 'package', 'secure', 'star', 'heart', 'location', 'phone', 'whatsapp',
] as const

/** Stored when the manager wants text only */
export const NO_ICON = 'none'
