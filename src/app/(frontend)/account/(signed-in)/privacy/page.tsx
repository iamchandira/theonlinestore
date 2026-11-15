import { IconDownload } from '@tabler/icons-react'

import { ConsentForm, DeletionForm } from '@/components/account/ProfileForms'
import { requireUser } from '@/lib/auth/server'

/** Privacy & data (TOS-306): marketing consent per channel, data download, deletion request. */
export default async function PrivacyPage() {
  const user = await requireUser('/account/privacy')
  return (
    <section aria-labelledby="privacy-title" className="flex flex-col gap-5">
      <h2 id="privacy-title" className="text-2xl font-bold">
        Privacy &amp; data
      </h2>
      <ConsentForm channels={user.marketingOptIn ? (user.marketingChannels ?? []) : []} />
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-bold">Download your data</h2>
        <p className="text-sm text-ink-600">A copy of your profile, addresses, wishlist, reviews and preferences as a JSON file.</p>
        <a
          href="/account/export"
          download
          className="inline-flex h-11 items-center gap-2 self-start rounded-full border border-line-strong bg-surface px-5 text-[0.9375rem] font-semibold hover:border-ink-900"
        >
          <IconDownload size={18} /> Download my data
        </a>
      </div>
      <DeletionForm requestedAt={user.deletionRequestedAt ?? null} />
    </section>
  )
}
