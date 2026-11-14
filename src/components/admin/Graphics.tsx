/* eslint-disable @next/next/no-img-element */
/** Payload admin branding (login screen logo + nav icon). Plain <img> keeps these server-safe and tiny. */

export function AdminLogo() {
  return (
    <img
      src="/brand/logo-header.png"
      alt="The Online Store"
      width={260}
      height={62}
      style={{ height: 'auto', maxWidth: 260 }}
    />
  )
}

export function AdminIcon() {
  return <img src="/brand/icon-transparent.png" alt="The Online Store" width={30} height={30} />
}
