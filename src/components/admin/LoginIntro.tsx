/** Shown above the admin login form. */
export function LoginIntro() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 8 }}>
      <p style={{ margin: 0, fontFamily: 'var(--tos-display)', fontSize: 22, fontWeight: 700, color: 'var(--tos-ink)' }}>Welcome back</p>
      <p style={{ margin: '4px 0 0', color: 'var(--tos-muted)', fontSize: 14 }}>Sign in to manage The Online Store.</p>
    </div>
  )
}
