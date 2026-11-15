import { PasswordForm, ProfileForm } from '@/components/account/ProfileForms'
import { requireUser } from '@/lib/auth/server'

export default async function ProfilePage() {
  const user = await requireUser('/account/profile')
  return (
    <section aria-labelledby="profile-title" className="flex flex-col gap-5">
      <h2 id="profile-title" className="text-2xl font-bold">
        Profile &amp; password
      </h2>
      <ProfileForm fullName={user.fullName ?? ''} phone={user.phone ?? ''} email={user.email} />
      <PasswordForm />
    </section>
  )
}
