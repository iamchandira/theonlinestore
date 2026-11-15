import { AddressBook } from '@/components/account/AddressBook'
import { requireUser } from '@/lib/auth/server'

export default async function AddressesPage() {
  const user = await requireUser('/account/addresses')
  return <AddressBook addresses={user.addresses ?? []} />
}
